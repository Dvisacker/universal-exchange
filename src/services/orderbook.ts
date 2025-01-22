import { createClient } from 'redis';
import {
    MakerOrder,
    OrderSide,
    TakerOrder,
    OrderAction,
    OrderType,
    makerOrderToMap,
    takerOrderToMap,
    makerOrderToObject,
    OrderMatch,
    orderMatchToMap,
    OrderMessage,
} from '../types/order';
import { calculateQuoteAmount, getMarketKey, hashIds } from '../utils/helpers';
import { MarketsByTicker, TickersByTokenPair } from '../types/markets';
import AsyncLock from 'async-lock';

/**
 * A Redis-based order book implementation for the DEX system.
 * Manages limit orders, market orders, and trades using Redis as the backing store.
 * Handles order matching, cancellation, and trade scheduling.
 *
 * TODO:
 * - Different orderbooks for each market
 * - Many edge cases
 */
export class OrderBook {
    private redisClient;
    private readonly marketInfoByTicker: MarketsByTicker = {};
    private readonly tickersByTokenPair: TickersByTokenPair = {};
    private lock: AsyncLock;

    /**
     * Redis Key Patterns:
     *
     * price_levels:<marketKey> (Sorted Set)
     * - Stores order IDs sorted by price-time priority
     * - Score format: price + normalized timestamp
     * - Member format: "timestamp:orderId"
     *
     *   price_levels:ETH-USDC -> {
     *     "1678234567:order123": 1.0234,  // ETH/USDC price 1.0234
     *     "1678234570:order124": 1.0235,  // Higher price, later timestamp
     *     "1678234580:order125": 1.0233   // Lower price, latest timestamp
     *   }
     *
     * open_orders:<orderId> (Hash)
     * - Stores active limit orders
     * - Fields: order properties (trader, baseToken, quoteToken, etc.)
     *
     *   open_orders:order123 -> {
     *     "trader": "0x123...",
     *     "baseToken": "0xETH...",
     *     "quoteToken": "0xUSDC...",
     *     "baseAmount": "1000000000000000000",  // 1 ETH
     *     "priceLevel": "1.0234",
     *     "side": "SELL",
     *     "signature": "0xabc...",
     *     "timestamp": "1678234567"
     *   }
     *
     * inflight_orders:<orderId> (Hash)
     * - Stores orders currently being processed/matched
     * - Fields: order properties + matching details
     * Example:
     *   inflight_orders:order123 -> {
     *     "trader": "0x123...",
     *     "baseAmount": "1000000000000000000",
     *     "matchedWith": "order456",
     *     "matchTimestamp": "1678234569"
     *   }
     *
     * cancelled_orders:<orderId> (Hash)
     * - Stores cancelled order details
     * - Fields: original order properties + cancellation timestamp
     * Example:
     *   cancelled_orders:order123 -> {
     *     "trader": "0x123...",
     *     "baseAmount": "1000000000000000000",
     *     "cancelledAt": "1678234570",
     *     "reason": "USER_CANCELLED"
     *   }
     *
     *
     * scheduled_trades:<pendingTradeId> (Hash)
     * - Stores trades waiting to be executed
     * - Fields: trade details including maker and taker info
     * Example:
     *   scheduled_trades:trade789 -> {
     *     "makerOrderId": "order123",
     *     "takerOrderId": "order456",
     *     "baseAmount": "1000000000000000000",
     *     "quoteAmount": "1023400000",
     *     "executionDeadline": "1678234669"
     *   }
     *
     * filled_orders:<orderId> (Hash)
     * - Stores completely filled orders
     * - Fields: original order + fill details
     * Example:
     *   filled_orders:order123 -> {
     *     "trader": "0x123...",
     *     "baseAmount": "1000000000000000000",
     *     "filledAt": "1678234568",
     *     "filledWith": ["order456", "order457"],
     *     "totalQuoteAmount": "1023400000"
     *   }
     */
    private readonly PRICE_LEVELS = 'price_levels';
    private readonly OPEN_ORDERS = 'open_orders';
    private readonly INFLIGHT_ORDERS = 'inflight_orders';
    private readonly CANCELLED_ORDERS = 'cancelled_orders';
    private readonly PENDING_TRADES = 'pending_trades';
    private readonly FILLED_ORDERS = 'filled_orders';

    private readonly MAX_TIMESTAMP = 9999999999; // Used for price-time priority scoring
    private readonly PRICE_MULTIPLIER = 1000000000; // 6 decimal places for price precision
    private readonly LOCK_TIMEOUT = 30000; // 30 seconds lock timeout

    /**
     * Creates a new OrderBook instance and connects to Redis
     */
    constructor(markets: MarketsByTicker) {
        this.redisClient = createClient();
        this.redisClient.connect().catch(console.error);
        this.lock = new AsyncLock();

        this.marketInfoByTicker = markets;

        for (const [ticker, marketInfo] of Object.entries(markets)) {
            const marketKey = `${marketInfo.baseToken}:${marketInfo.quoteToken}`;
            this.marketInfoByTicker[ticker] = marketInfo;
            this.tickersByTokenPair[marketKey] = ticker;
        }
    }

    /**
     * Gets the market key for a given token pair
     * @param tokenIn - The input token address
     * @param tokenOut - The output token address
     * @returns The market key in the format "TOKEN1:TOKEN2"
     * @throws Error if market key is not found
     */
    private getMarketKey(baseToken: string, quoteToken: string): string {
        const marketKey = `${baseToken}:${quoteToken}`;
        if (!this.tickersByTokenPair[marketKey]) {
            throw new Error(`Market key not found for ${baseToken}:${quoteToken}`);
        }
        return this.tickersByTokenPair[marketKey];
    }

    private getLockKey(request: OrderMessage): string {
        switch (request.action) {
            case OrderAction.NEW_LIMIT_ORDER:
            case OrderAction.CANCEL_LIMIT_ORDER:
            case OrderAction.NEW_MARKET_ORDER:
                return this.getMarketKey(
                    request.payload.order.baseToken,
                    request.payload.order.quoteToken
                );
            case OrderAction.CONFIRMED_TRADE:
            case OrderAction.FAILED_TRADE:
                return this.getMarketKey(
                    request.payload.match.baseToken,
                    request.payload.match.quoteToken
                );
            default:
                throw new Error(`Unsupported order action: ${request.action}`);
        }
    }

    /**
     * Gets the Redis key for price levels in a market
     * @param marketKey - The market identifier
     * @returns The Redis key for price levels
     */
    private getPriceLevelKey(marketKey: string): string {
        return `${this.PRICE_LEVELS}:${marketKey}`;
    }

    /**
     * Gets the Redis key for an open order
     * @param orderId - The order ID
     * @returns The Redis key for the open order
     */
    private getOpenOrderKey(orderId: string): string {
        return `${this.OPEN_ORDERS}:${orderId}`;
    }

    /**
     * Gets the Redis key for a cancelled order
     * @param orderId - The order ID
     * @returns The Redis key for the cancelled order
     */
    private getCancelledOrderKey(orderId: string): string {
        return `${this.CANCELLED_ORDERS}:${orderId}`;
    }

    private getPendingTradeId(pendingTradeId: string): string {
        return `${this.PENDING_TRADES}:${pendingTradeId}`;
    }

    /**
     * Gets the Redis key for an inflight order (order that is included in a pending trade)
     * @param orderId - The order ID
     * @returns The Redis key for the inflight order
     */
    private getInflightOrderKey(orderId: string): string {
        return `${this.INFLIGHT_ORDERS}:${orderId}`;
    }

    private getFilledOrderKey(orderId: string): string {
        return `${this.FILLED_ORDERS}:${orderId}`;
    }

    /**
     * Creates a composite score for price-time priority ordering
     * For sell orders: Lower prices and earlier timestamps get lower scores (better priority)
     * For buy orders: Higher prices and earlier timestamps get lower scores (better priority)
     * @param priceLevel - The price level of the order
     * @param timestamp - The timestamp of the order
     * @param side - The side of the order (buy/sell)
     * @returns A composite score that maintains price-time priority
     */
    private createPriceTimeScore(priceLevel: string, timestamp: number, side: OrderSide): number {
        // Normalize timestamp to be between 0 and 1
        const normalizedTime = timestamp / this.MAX_TIMESTAMP;

        // Convert price to integer with 6 decimal precision
        const priceAsInt = Math.round(Number(priceLevel) * this.PRICE_MULTIPLIER);

        // For sell orders: price + normalized time
        // For buy orders: -price + normalized time
        return side === OrderSide.SELL
            ? priceAsInt + normalizedTime
            : -priceAsInt + normalizedTime;
    }

    /**
     * Handles a new limit order submission
     * @param order - The maker (limit) order to process
     * @returns A promise that resolves when the order is processed
     */
    private async handleNewLimitOrder(order: MakerOrder): Promise<void> {
        const openOrderKey = this.getOpenOrderKey(order.id);
        const marketKey = this.getMarketKey(order.baseToken, order.quoteToken);
        const priceLevelKey = this.getPriceLevelKey(marketKey);
        const orderMap = makerOrderToMap(order);

        if (await this.redisClient.exists(openOrderKey)) {
            throw new Error(`Order ${order.id} already exists`);
        }

        const multi = this.redisClient.multi();
        const score = this.createPriceTimeScore(order.priceLevel, +order.timestamp, order.side);

        multi.hSet(openOrderKey, orderMap);
        multi.zAdd(priceLevelKey, [
            {
                score,
                value: `${order.timestamp}:${order.id}`, // TODO: the timestamp needs to be set by the orderbook, not the client
            },
        ]);

        await multi.exec();
    }

    /**
     * Handles a limit order cancellation
     * @param marketKey - The market key
     * @param orderId - The ID of the order to cancel
     * @returns A promise that resolves when the order is cancelled
     */
    private async handleCancelLimitOrder(marketKey: string, orderId: string): Promise<void> {
        const openOrderKey = this.getOpenOrderKey(orderId);
        const priceLevelKey = this.getPriceLevelKey(marketKey);
        const inflightOrderKey = this.getInflightOrderKey(orderId);

        if (!(await this.redisClient.exists(openOrderKey))) {
            throw new Error(`Order ${orderId} not found in open orders`);
        }

        if (await this.redisClient.exists(inflightOrderKey)) {
            throw new Error(`Order ${orderId} already in inflight orders`);
        }

        const multi = this.redisClient.multi();
        multi.del(openOrderKey);
        multi.zRem(priceLevelKey, orderId);
        await multi.exec();
    }

    /**
     * Processes a new market order and attempts to match it with existing limit orders
     * @param takerOrder - The market order to process
     * @returns A promise that resolves to an array of matched orders
     */
    private async handleNewMarketOrder(takerOrder: TakerOrder): Promise<OrderMatch[]> {
        const marketKey = this.getMarketKey(takerOrder.baseToken, takerOrder.quoteToken);
        const priceKey = `${this.PRICE_LEVELS}:${marketKey}`;

        /* Returns an array that looks like this: 
         [
            "1700000000:0x...order123",  // format is "timestamp:orderId"
            "1700000001:0x...order456",
            "1700000002:0x...order789"
        ] */
        let makerOrderCompositeIds =
            takerOrder.side === OrderSide.BUY
                ? await this.redisClient.zRangeByScore(priceKey, 0, 'inf') // get all limit sell orders
                : (await this.redisClient.zRangeByScore(priceKey, '-inf', 0)).reverse(); // get all limit buy orders


        const makerOrderIds = makerOrderCompositeIds.map((id) => id.split(':')[1]);

        let takerBaseAmountRemaining = BigInt(takerOrder.baseAmount);

        const matchingOrders: OrderMatch[] = [];
        const multi = this.redisClient.multi();

        for (const makerOrderId of makerOrderIds) {
            const openOrderKey = this.getOpenOrderKey(makerOrderId);
            const cancelledOrderKey = this.getCancelledOrderKey(makerOrderId);

            if (await this.redisClient.exists(cancelledOrderKey)) {
                continue;
            }

            const makerOrderData = await this.redisClient.hGetAll(openOrderKey);
            const makerOrder = makerOrderToObject(makerOrderData);

            // Check if order is still valid
            if (makerOrder.deadline < Date.now()) {
                await this.redisClient.del(openOrderKey);
                continue;
            }

            if (
                (takerOrder.side === OrderSide.BUY &&
                    makerOrder.priceLevel <= takerOrder.priceLevel) ||
                (takerOrder.side === OrderSide.SELL &&
                    makerOrder.priceLevel >= takerOrder.priceLevel)
            ) {
                // case where the taker order has a large amount than the maker order
                let baseAmountFilled = BigInt(0);

                // the limit order is bigged that the taker order
                if (BigInt(makerOrder.baseAmount) >= takerBaseAmountRemaining) {
                    baseAmountFilled = BigInt(takerBaseAmountRemaining);
                    const quoteAmountFilled = calculateQuoteAmount(
                        baseAmountFilled,
                        makerOrder.priceLevel,
                        makerOrder.baseDecimals,
                        makerOrder.quoteDecimals
                    );
                    const pendingTradeId = hashIds(makerOrder.id, takerOrder.id);

                    const orderMatch: OrderMatch = {
                        pendingTradeId,
                        makerOrderId: makerOrder.id,
                        maker: makerOrder.trader,
                        baseToken: makerOrder.baseToken,
                        quoteToken: makerOrder.quoteToken,
                        baseAmountFilled: baseAmountFilled.toString(),
                        quoteAmountFilled: quoteAmountFilled.toString(),
                        makerSignature: makerOrder.signature,
                        makerTimestamp: makerOrder.timestamp,
                        makerDeadline: makerOrder.deadline,
                        makerSalt: makerOrder.salt,
                        makerSide: makerOrder.side,
                        taker: takerOrder.trader,
                        takerOrderId: takerOrder.id,
                        takerSignature: takerOrder.signature,
                        takerTimestamp: takerOrder.timestamp,
                        takerSalt: takerOrder.salt,
                    };

                    const pendingTradeKey = this.getPendingTradeId(pendingTradeId);
                    const inflightMakerOrderKey = this.getInflightOrderKey(makerOrder.id);
                    const inflightTakerOrderKey = this.getInflightOrderKey(takerOrder.id);
                    matchingOrders.push(orderMatch);

                    // update the maker order, save the pending trade and inflight orders
                    multi.hSet(openOrderKey, 'baseAmountFilled', baseAmountFilled.toString());
                    multi.hSet(pendingTradeKey, orderMatchToMap(orderMatch));
                    multi.hSet(inflightMakerOrderKey, makerOrderToMap(makerOrder));
                    multi.hSet(inflightTakerOrderKey, takerOrderToMap(takerOrder));

                    // edge case where both orders are filled
                    if (BigInt(makerOrder.baseAmount) === baseAmountFilled) {
                        const priceLevelKey = this.getPriceLevelKey(marketKey);
                        multi.del(openOrderKey);
                        multi.zRem(priceLevelKey, makerOrder.id);
                    }

                    break;
                } else if (BigInt(makerOrder.baseAmount) < takerBaseAmountRemaining) {
                    baseAmountFilled = BigInt(makerOrder.baseAmount);
                    const quoteAmountFilled = calculateQuoteAmount(
                        baseAmountFilled,
                        makerOrder.priceLevel,
                        makerOrder.baseDecimals,
                        makerOrder.quoteDecimals
                    );
                    takerBaseAmountRemaining -= BigInt(makerOrder.baseAmount);

                    const pendingTradeId = hashIds(makerOrder.id, takerOrder.id);

                    const orderMatch: OrderMatch = {
                        pendingTradeId,
                        makerOrderId: makerOrder.id,
                        maker: makerOrder.trader,
                        baseToken: makerOrder.baseToken,
                        quoteToken: makerOrder.quoteToken,
                        baseAmountFilled: baseAmountFilled.toString(),
                        quoteAmountFilled: quoteAmountFilled.toString(),
                        makerSignature: makerOrder.signature,
                        makerTimestamp: makerOrder.timestamp,
                        makerDeadline: makerOrder.deadline,
                        makerSalt: makerOrder.salt,
                        makerSide: makerOrder.side,
                        taker: takerOrder.trader,
                        takerOrderId: takerOrder.id,
                        takerSignature: takerOrder.signature,
                        takerTimestamp: takerOrder.timestamp,
                        takerSalt: takerOrder.salt,
                    };

                    const pendingTradeKey = this.getPendingTradeId(pendingTradeId);
                    const inflightMakerOrderKey = this.getInflightOrderKey(makerOrder.id);
                    const inflightTakerOrderKey = this.getInflightOrderKey(takerOrder.id);
                    matchingOrders.push(orderMatch);

                    // delete the maker order, save the pending trade and inflight orders
                    multi.del(openOrderKey);
                    multi.hSet(inflightMakerOrderKey, makerOrderToMap(makerOrder));
                    multi.hSet(inflightTakerOrderKey, takerOrderToMap(takerOrder));
                    multi.hSet(pendingTradeKey, orderMatchToMap(orderMatch));
                }
            }
        }

        await multi.exec();
        return matchingOrders;
    }

    private async handleFailedTrade(pendingTradeId: string): Promise<void> {
        const pendingTradeKey = this.getPendingTradeId(pendingTradeId);
        const pendingTrade = await this.redisClient.hGetAll(pendingTradeKey);
        const takerOrderInflightKey = this.getInflightOrderKey(pendingTrade.takerOrderId);
        const makerOrderInflightKey = this.getInflightOrderKey(pendingTrade.makerOrderId);

        /* TODO: figure out which order is causing the trade to fail. Ideally in a well-designed system
        this shouldn't happen if we simulate trades before including orders in the 
        We probably want to reinclude the maker order after re-validating there is nothing wrong 
        with the order. For now we just remove both orders*/
        const multi = this.redisClient.multi();
        multi.del(pendingTradeKey);
        multi.del(takerOrderInflightKey);
        multi.del(makerOrderInflightKey);
        await multi.exec();
    }

    private async handleConfirmedTrade(pendingTradeId: string): Promise<void> {
        const pendingTradeKey = this.getPendingTradeId(pendingTradeId);
        const pendingTrade = await this.redisClient.hGetAll(pendingTradeKey);
        const takerOrderInflightKey = this.getInflightOrderKey(pendingTrade.takerOrderId);
        const makerOrderInflightKey = this.getInflightOrderKey(pendingTrade.makerOrderId);
        const makerOrder = await this.redisClient.hGetAll(pendingTrade.makerOrderId);
        const takerOrder = await this.redisClient.hGetAll(pendingTrade.takerOrderId);
        const makerOrderFilledKey = this.getFilledOrderKey(makerOrder.id);
        const takerOrderFilledKey = this.getFilledOrderKey(takerOrder.id);

        const multi = this.redisClient.multi();
        multi.del(pendingTradeKey);
        multi.del(takerOrderInflightKey);
        multi.del(makerOrderInflightKey);
        multi.hSet(makerOrderFilledKey, makerOrder);
        multi.hSet(takerOrderFilledKey, takerOrder);
        await multi.exec();
    }

    /**
     * Handles an order request message and routes it to the appropriate handler
     * @param request - The order request message to process
     * @returns A promise that resolves to an array of matched orders
     */
    public async handleOrderRequest(request: OrderMessage): Promise<OrderMatch[]> {
        const lockKey = this.getLockKey(request); // lock key is dependent on the market

        return this.lock.acquire(lockKey, async () => {
            const { action, payload } = request;

            switch (action) {
                case OrderAction.NEW_LIMIT_ORDER:
                    if (!payload.order || payload.order.type !== 'MAKER') {
                        throw new Error('Invalid maker order payload');
                    }
                    await this.handleNewLimitOrder(payload.order);
                    return [];
                case OrderAction.CANCEL_LIMIT_ORDER:
                    if (!payload.order || !payload.order.id) {
                        throw new Error('Order ID required for cancellation');
                    }
                    await this.handleCancelLimitOrder(
                        getMarketKey(payload.order),
                        payload.order.id
                    );
                    return [];
                case OrderAction.NEW_MARKET_ORDER:
                    if (!payload.order || payload.order.type !== OrderType.TAKER) {
                        throw new Error('Invalid taker order payload');
                    }
                    const matches = await this.handleNewMarketOrder(payload.order);
                    return matches;
                case OrderAction.CONFIRMED_TRADE:
                    await this.handleConfirmedTrade(payload.txHash);
                    return [];
                case OrderAction.FAILED_TRADE:
                    await this.handleFailedTrade(payload.match.pendingTradeId);
                    return [];
                default:
                    throw new Error(`Unsupported order action: ${action}`);
            }
        });
    }
}
