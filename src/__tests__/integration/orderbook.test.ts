import { Wallet } from 'ethers';
import { createClient } from 'redis';
import { OrderBook } from '../../services/orderbook';
import { MarketsByTicker } from '../../types/markets';
import { OrderAction, OrderSide } from '../../types/order';
import { orderDeadline } from '../../utils/helpers';
import { OrderBuilder } from '../../utils/order-builder';
describe('OrderBook Integration Tests', () => {
    let orderBook: OrderBook;
    let redisClient: ReturnType<typeof createClient>;
    let orderBuilder: OrderBuilder;
    let wallet: Wallet;
    const testPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

    beforeEach(async () => {
        redisClient = createClient();

        const marketsByTicker: MarketsByTicker = {
            'uSOL/USDC': {
                baseToken: '0x9b8df6e244526ab5f6e6400d331db28c8fdddb55',
                baseDecimals: 18,
                quoteToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                quoteDecimals: 6,
                symbol: 'uSOL/USDC'
            }
        }

        orderBook = new OrderBook(marketsByTicker);
        wallet = new Wallet(testPrivateKey);
        orderBuilder = new OrderBuilder(wallet, marketsByTicker);
        await redisClient.connect();
        await redisClient.flushAll();
    });

    afterEach(async () => {
        await redisClient.quit();
    });

    describe('handleNewLimitOrder', () => {
        it('should successfully add a new sell limit order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1.0',
                '300.00',
                OrderSide.SELL,
            );

            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            });

            const openOrderKey = `open_orders:${mockOrder.id}`;
            const orderExists = await redisClient.exists(openOrderKey);
            expect(orderExists).toBe(1);

            const priceLevelKey = `price_levels:uSOL/USDC`;
            const compositeIds = await redisClient.zRangeByScore(priceLevelKey, '-inf', 'inf');
            expect(compositeIds.length).toBe(1);
            expect(compositeIds[0]).toBe(`${mockOrder.timestamp}:${mockOrder.id}`);
            const order = await redisClient.hGetAll(openOrderKey);
            expect(order.id).toBe(mockOrder.id);
            expect(order.priceLevel).toBe(mockOrder.priceLevel);
            expect(order.side).toBe(mockOrder.side);
        });

        it('should successfully add a new buy limit order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1.0',
                '300.00',
                OrderSide.BUY,
            );

            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            });

            // Verify the order was added correctly
            const openOrderKey = `open_orders:${mockOrder.id}`;
            const orderExists = await redisClient.exists(openOrderKey);
            expect(orderExists).toBe(1);

            // Verify price level was added
            const priceLevelKey = `price_levels:uSOL/USDC`;
            const compositeIds = await redisClient.zRangeByScore(priceLevelKey, '-inf', 'inf');
            expect(compositeIds.length).toBe(1);
            expect(compositeIds[0]).toBe(`${mockOrder.timestamp}:${mockOrder.id}`);
            const order = await redisClient.hGetAll(openOrderKey);
            expect(order.id).toBe(mockOrder.id);
            expect(order.priceLevel).toBe(mockOrder.priceLevel);
            expect(order.side).toBe(mockOrder.side);
        });

        it('successfully adds many limit orders', async () => {
            const [
                mockOrder,
                mockOrder2,
                mockOrder3,
                mockOrder4,
                mockOrder5,
                mockOrder6
            ] = await Promise.all([
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '310.00',
                    OrderSide.SELL,
                ),
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '309.90',
                    OrderSide.SELL,
                ),
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '309.80',
                    OrderSide.SELL,
                ),
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '309.70',
                    OrderSide.BUY,
                ),
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '309.60',
                    OrderSide.BUY,
                ),
                orderBuilder.createLimitOrder(
                    'uSOL/USDC',
                    '1.0',
                    '309.50',
                    OrderSide.BUY,
                )
            ]);

            for (const order of [mockOrder, mockOrder2, mockOrder3, mockOrder4, mockOrder5, mockOrder6]) {
                orderBook.handleOrderRequest({
                    action: OrderAction.NEW_LIMIT_ORDER,
                    payload: { order }
                });
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const priceLevelKey = `price_levels:uSOL/USDC`;
            const compositeIds = await redisClient.zRangeByScore(priceLevelKey, '-inf', 'inf');
            expect(compositeIds.length).toBe(6);
        });

        it('should throw error when adding duplicate order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1.0',
                '300.00',
                OrderSide.SELL,
            );

            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            });
            await expect(orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            })).rejects.toThrow('Order');
        });
    });

    describe('handleCancelLimitOrder', () => {
        it('should successfully cancel an existing limit order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.SELL,
            );

            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            });
            await orderBook.handleOrderRequest({
                action: OrderAction.CANCEL_LIMIT_ORDER,
                payload: { order: mockOrder }
            });

            const openOrderKey = `open_orders:${mockOrder.id}`;
            const orderExists = await redisClient.exists(openOrderKey);
            expect(orderExists).toBe(0);

            const priceLevelKey = `price_levels:uSOL/USDC`;
            const priceLevel = await redisClient.zScore(priceLevelKey, mockOrder.id);
            expect(priceLevel).toBeNull();
        });

        it('should throw error when cancelling non-existent order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.SELL,
            );

            await expect(orderBook.handleOrderRequest({
                action: OrderAction.CANCEL_LIMIT_ORDER,
                payload: { order: mockOrder }
            })).rejects.toThrow('Order');
        });

        it('should throw error when cancelling an inflight order', async () => {
            const mockOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1.0',
                '300.00',
                OrderSide.SELL,
            );

            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: mockOrder }
            });

            // Add order to inflight orders
            const inflightOrderKey = `inflight_orders:${mockOrder.id}`;
            await redisClient.hSet(inflightOrderKey, 'id', mockOrder.id);

            await expect(orderBook.handleOrderRequest({
                action: OrderAction.CANCEL_LIMIT_ORDER,
                payload: { order: mockOrder }
            })).rejects.toThrow('inflight');
        });
    });

    describe('handleNewMarketOrder', () => {
        it('should match a market buy order with a single limit sell order', async () => {
            // Create and add a limit sell order
            const limitOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder }
            });

            // Create a market buy order
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.BUY,
            );

            // Execute the market order
            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });

            // Verify match
            expect(matches.length).toBe(1);
            expect(matches[0].makerOrderId).toBe(limitOrder.id);
            expect(matches[0].takerOrderId).toBe(marketOrder.id);
            expect(matches[0].baseAmountFilled).toBe(marketOrder.baseAmount);
        });

        it('should partially fill a market buy order with multiple limit sell orders', async () => {
            // Create and add multiple limit sell orders at different price levels
            const limitOrder1 = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '200.00',
                OrderSide.SELL,
            );
            const limitOrder2 = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '210.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder1 }
            });
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder2 }
            });

            // Create a market buy order for more than available at best price
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '2',
                '220.00',
                OrderSide.BUY,
            );

            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });
            const totalFilled = BigInt(matches[0].baseAmountFilled) + BigInt(matches[1].baseAmountFilled);

            // Verify matches
            expect(matches.length).toBe(2);
            expect(matches[0].makerOrderId).toBe(limitOrder1.id);
            expect(matches[1].makerOrderId).toBe(limitOrder2.id);
            expect(totalFilled.toString()).toBe(marketOrder.baseAmount);
        });

        it('should not match orders above market order price limit', async () => {
            // Create a limit sell order above market order's max price
            const limitOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '200.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder }
            });

            // Create a market buy order with lower max price
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '190.00',
                OrderSide.BUY,
            );

            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });

            // Verify no matches
            expect(matches.length).toBe(0);
        });

        it('should match market sell order with limit buy orders', async () => {
            // Create and add a limit buy order
            const limitOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '180.00',
                OrderSide.BUY,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder }
            });

            // Create a market sell order
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '170.00', // Willing to sell at this price or higher
                OrderSide.SELL,
            );

            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });

            expect(matches.length).toBe(1);
            expect(matches[0].makerOrderId).toBe(limitOrder.id);
            expect(matches[0].takerOrderId).toBe(marketOrder.id);
        });

        it('should skip expired limit orders during matching', async () => {
            // Create an expired limit order
            const expiredOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '180.00',
                OrderSide.SELL,
                orderDeadline(-1) // Expired 1 hour ago
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: expiredOrder }
            });

            // Create a valid limit order
            const validOrder = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '185.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: validOrder }
            });

            // Create a market buy order
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '190.00',
                OrderSide.BUY,
            );

            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });

            // Should only match with the valid order
            expect(matches.length).toBe(1);
            expect(matches[0].makerOrderId).toBe(validOrder.id);
        });

        it('should match orders based on price-time priority', async () => {
            // Create multiple limit orders at same price
            const limitOrder1 = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '180.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder1 }
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            const limitOrder2 = await orderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '180.00',
                OrderSide.SELL,
            );
            await orderBook.handleOrderRequest({
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order: limitOrder2 }
            });

            // Create a market buy order
            const marketOrder = await orderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '180.00',
                OrderSide.BUY,
            );

            const matches = await orderBook.handleOrderRequest({
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order: marketOrder }
            });

            expect(matches.length).toBe(1);
            expect(matches[0].makerOrderId).toBe(limitOrder1.id);
        });
    });
}); 