import { createClient } from 'redis';
import { MakerOrder, OrderSide, TakerOrder, OrderAction, OrderType, makerOrderToMap, takerOrderToMap, makerOrderToObject, OrderMatch, orderMatchToMap, OrderMessage } from '../types/order';
import { calculateQuoteAmount, getMarketKey, hashIds } from '../utils';
import { MARKET_KEYS } from '../constants';
import { MarketsByTicker, TickersByTokenPair } from '../types/markets';

/**
 * A Redis-based order book implementation for the DEX system.
 * Manages limit orders, market orders, and trades using Redis as the backing store.
 * Handles order matching, cancellation, and trade scheduling.
 */
export class OrderBook {
    private redisClient;
    private readonly marketInfoByTicker: MarketsByTicker = {};
    private readonly tickersByTokenPair: TickersByTokenPair = {};
    private readonly PRICE_LEVELS = 'price_levels';
    private readonly OPEN_ORDERS = 'open_orders';
    private readonly INFLIGHT_ORDERS = 'inflight_orders';
    private readonly CANCELLED_ORDERS = 'cancelled_orders';
    private readonly MATCHED_ORDERS = 'matched_orders';
    private readonly SCHEDULED_TRADES = 'scheduled_trades';
    private readonly MATCHED_ORDERS_BY_TAKER_ID = 'matched_orders_by_taker_id';
    private readonly MATCHED_ORDERS_BY_MAKER_ID = 'matched_orders_by_maker_id';
    private readonly FILLED_ORDERS = 'filled_orders';

    private readonly MAX_TIMESTAMP = 9999999999; // Used for price-time priority scoring
    private readonly PRICE_MULTIPLIER = 1000000; // 6 decimal places for price precision

    /**
     * Creates a new OrderBook instance and connects to Redis
     */
    constructor(markets: MarketsByTicker) {
        this.redisClient = createClient();
        this.redisClient.connect().catch(console.error);

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
        const marketKey = `${baseToken}:${quoteToken}`
        if (!this.tickersByTokenPair[marketKey]) {
            throw new Error(`Market key not found for ${baseToken}:${quoteToken}`);
        }
        return this.tickersByTokenPair[marketKey];
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
     * Gets the Redis key for an inflight order
     * @param orderId - The order ID
     * @returns The Redis key for the inflight order
     */
    private getInflightOrderKey(orderId: string): string {
        return `${this.INFLIGHT_ORDERS}:${orderId}`;
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
        return `${this.SCHEDULED_TRADES}:${pendingTradeId}`;
    }

    private getPendingTradeKeyByTakerId(takerOrderId: string): string {
        return `${this.MATCHED_ORDERS_BY_TAKER_ID}:${takerOrderId}`;
    }

    private getPendingTradeKeyByMakerId(makerOrderId: string): string {
        return `${this.MATCHED_ORDERS_BY_MAKER_ID}:${makerOrderId}`;
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
        return side === OrderSide.SELL ?
            priceAsInt / this.PRICE_MULTIPLIER + normalizedTime :
            -priceAsInt / this.PRICE_MULTIPLIER + normalizedTime;
    }

    /**
     * Handles a new limit order submission
     * @param order - The maker (limit) order to process
     * @returns A promise that resolves when the order is processed
     */
    async handleNewLimitOrder(order: MakerOrder): Promise<void> {
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
        multi.zAdd(priceLevelKey, [{
            score,
            value: `${order.timestamp}:${order.id}` // TODO: the timestamp needs to be set by the orderbook, not the client
        }]);

        await multi.exec();
    }

    /**
     * Handles a limit order cancellation
     * @param marketKey - The market key
     * @param orderId - The ID of the order to cancel
     * @returns A promise that resolves when the order is cancelled
     */
    async handleCancelLimitOrder(marketKey: string, orderId: string): Promise<void> {
        const openOrderKey = this.getOpenOrderKey(orderId);
        const priceLevelKey = this.getPriceLevelKey(marketKey);
        const inflightOrderKey = this.getInflightOrderKey(orderId);

        // check if the order is in the open orders list
        if (!await this.redisClient.exists(openOrderKey)) {
            throw new Error(`Order ${orderId} not found in open orders`);
        }

        // check if the order is in the inflight orders list
        if (await this.redisClient.exists(inflightOrderKey)) {
            throw new Error(`Order ${orderId} already in inflight orders`);
        }

        const multi = this.redisClient.multi();
        multi.del(openOrderKey);
        multi.zRem(priceLevelKey, orderId);
        await multi.exec();
    }

    /**
     * Adds an order to the inflight orders list
     * @param order - The taker order to mark as inflight
     * @returns A promise that resolves when the order is added
     */
    async addInflightOrder(order: TakerOrder): Promise<void> {
        const inflightOrderKey = this.getInflightOrderKey(order.id);
        const orderMap = takerOrderToMap(order);
        await this.redisClient.hSet(inflightOrderKey, orderMap);
    }

    /**
     * Adds a maker order to the scheduled trades list
     * @param order - The maker order to schedule
     * @returns A promise that resolves when the order is scheduled
     */
    async addScheduledMakerOrder(order: MakerOrder): Promise<void> {
        const scheduledOrderKey = this.getPendingTradeId(order.id);
        const orderMap = makerOrderToMap(order);
        await this.redisClient.hSet(scheduledOrderKey, orderMap);
    }

    /**
     * Adds a taker order to the scheduled trades list
     * @param order - The taker order to schedule
     * @returns A promise that resolves when the order is scheduled
     */
    async addScheduledTakerOrder(order: TakerOrder): Promise<void> {
        const scheduledOrderKey = this.getPendingTradeId(order.id);
        const orderMap = takerOrderToMap(order);
        await this.redisClient.hSet(scheduledOrderKey, orderMap);
    }

    /**
     * Removes an order from the inflight orders list
     * @param orderId - The ID of the order to remove
     * @returns A promise that resolves when the order is removed
     */
    async removeInflightOrder(orderId: string): Promise<void> {
        const inflightOrderKey = this.getInflightOrderKey(orderId);
        await this.redisClient.del(inflightOrderKey);
    }

    /**
     * Cancels a taker (market) order
     * @param orderId - The ID of the order to cancel
     * @returns A promise that resolves when the order is cancelled
     */
    async cancelTakerOrder(orderId: string): Promise<void> {
        const inflightOrderKey = this.getInflightOrderKey(orderId);
        await this.redisClient.del(inflightOrderKey);
    }

    /**
     * Processes a new market order and attempts to match it with existing limit orders
     * @param takerOrder - The market order to process
     * @returns A promise that resolves to an array of matched orders
     */
    async handleNewMarketOrder(takerOrder: TakerOrder): Promise<OrderMatch[]> {
        const marketKey = this.getMarketKey(takerOrder.baseToken, takerOrder.quoteToken);
        const priceKey = `${this.PRICE_LEVELS}:${marketKey}`;

        // For sell orders: get buy orders with highest prices first (lowest scores)
        // For buy orders: get sell orders with lowest prices first (lowest scores)
        const makerOrderCompositeIds = await this.redisClient.zRange(priceKey, 0, -1);
        const sortedIds = makerOrderCompositeIds.sort((a, b) => {
            const aTimestamp = Number(a.split(':')[0]);
            const bTimestamp = Number(b.split(':')[0]);
            return aTimestamp - bTimestamp;
        }).map(id => id.split(':')[1]);

        const matchingOrders: OrderMatch[] = [];

        let takerBaseAmountRemaining = BigInt(takerOrder.baseAmount);

        const multi = this.redisClient.multi();

        for (const makerOrderId of sortedIds) {
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
                (takerOrder.side === OrderSide.BUY && makerOrder.priceLevel <= takerOrder.priceLevel) ||
                (takerOrder.side === OrderSide.SELL && makerOrder.priceLevel >= takerOrder.priceLevel)
            ) {

                // case where the taker order has a large amount than the maker order
                let baseAmountFilled = BigInt(0);

                // the limit order is bigged that the taker order
                if (BigInt(makerOrder.baseAmount) >= takerBaseAmountRemaining) {
                    baseAmountFilled = BigInt(takerBaseAmountRemaining);
                    const quoteAmountFilled = calculateQuoteAmount(baseAmountFilled, makerOrder.priceLevel, makerOrder.baseDecimals, makerOrder.quoteDecimals);
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

                    matchingOrders.push(orderMatch);
                    multi.hSet(openOrderKey, 'baseAmountFilled', baseAmountFilled.toString());
                    multi.hSet(this.MATCHED_ORDERS, orderMatchToMap(orderMatch));

                    // edge case where both orders are filled
                    if (BigInt(makerOrder.baseAmount) === baseAmountFilled) {
                        const priceLevelKey = this.getPriceLevelKey(marketKey);
                        multi.del(openOrderKey);
                        multi.zRem(priceLevelKey, makerOrder.id);
                    }

                    break;
                } else if (BigInt(makerOrder.baseAmount) < takerBaseAmountRemaining) {
                    baseAmountFilled = BigInt(makerOrder.baseAmount);
                    const quoteAmountFilled = calculateQuoteAmount(baseAmountFilled, makerOrder.priceLevel, makerOrder.baseDecimals, makerOrder.quoteDecimals);
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
                    const filledOrderKey = this.getFilledOrderKey(makerOrder.id);
                    const pendingTradeKeyByTakerId = this.getPendingTradeKeyByTakerId(takerOrder.id);
                    const pendingTradeKeyByMakerId = this.getPendingTradeKeyByMakerId(makerOrder.id);

                    matchingOrders.push(orderMatch);
                    multi.del(openOrderKey);
                    multi.hSet(filledOrderKey, makerOrderToMap(makerOrder));
                    multi.hSet(pendingTradeKey, orderMatchToMap(orderMatch));
                    multi.hSet(pendingTradeKeyByTakerId, orderMatchToMap(orderMatch));
                    multi.hSet(pendingTradeKeyByMakerId, orderMatchToMap(orderMatch));
                }

            }
        }

        await multi.exec();
        return matchingOrders;
    }

    /**
     * Processes a matched order and updates the order book state
     * @param order - The matched order to process
     * @returns A promise that resolves when the matched order is processed
     */
    async handleNewMatchedOrder(order: OrderMatch): Promise<void> {
        const inflightOrderKey = this.getInflightOrderKey(order.takerOrderId);
        const multi = this.redisClient.multi();
        multi.hSet(inflightOrderKey, orderMatchToMap(order));
        await multi.exec();
    }

    /**
     * Handles an order request message and routes it to the appropriate handler
     * @param request - The order request message to process
     * @returns A promise that resolves to an array of matched orders
     */
    async handleOrderRequest(request: OrderMessage): Promise<OrderMatch[]> {
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
                await this.handleCancelLimitOrder(getMarketKey(payload.order), payload.order.id);
                return [];
            case OrderAction.NEW_MARKET_ORDER:
                if (!payload.order || payload.order.type !== OrderType.TAKER) {
                    throw new Error('Invalid taker order payload');
                }
                // First find potential matches
                const matches = await this.handleNewMarketOrder(payload.order);
                return matches;

            // this is useless right now but the idea is to use a queue with a higher priority for the taker order
            case OrderAction.CANCEL_MARKET_ORDER:
                if (!payload.order || !payload.order.id) {
                    throw new Error('Order ID required for cancellation');
                }
                await this.cancelTakerOrder(payload.order.id);
                return [];
            default:
                throw new Error(`Unsupported order action: ${action}`);
        }
    }
} 