import { verifyTypedData, Wallet } from 'ethers';
import { MarketsByTicker } from '../../types/markets';
import { OrderSide } from '../../types/order';
import { orderDeadline } from '../../utils/helpers';
import { DOMAIN, MAKER_ORDER_TYPE, OrderBuilder, TAKER_ORDER_TYPE } from '../../utils/order-builder';

describe('OrderClient Integration Tests', () => {
    let builder: OrderBuilder;
    let wallet: Wallet;
    const TEST_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';

    beforeEach(() => {
        const marketsByTicker: MarketsByTicker = {
            'uSOL/USDC': {
                baseToken: '0x4200000000000000000000000000000000000006',
                baseDecimals: 18,
                quoteToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                quoteDecimals: 6,
                symbol: 'uSOL/USDC'
            }
        }

        wallet = new Wallet(TEST_PRIVATE_KEY);
        builder = new OrderBuilder(wallet, marketsByTicker);
    });

    describe('createLimitOrder', () => {
        it('should create a valid limit order with correct market info', async () => {
            const baseAmount = '1'
            const priceLevel = '180.00';
            const side = OrderSide.SELL;
            const deadline = orderDeadline()

            const order = await builder.createLimitOrder(
                'uSOL/USDC',
                baseAmount,
                priceLevel,
                side,
            );

            // Verify order properties
            expect(order.trader).toBe(wallet.address);
            expect(order.baseToken).toBe('0x4200000000000000000000000000000000000006');
            expect(order.quoteToken).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
            expect(order.baseDecimals.toString()).toBe('18');
            expect(order.quoteDecimals.toString()).toBe('6');
            expect(order.baseAmount.toString()).toBe('1000000000000000000');
            expect(order.baseAmountFilled.toString()).toBe('0');
            expect(order.priceLevel).toBe(priceLevel);
            expect(order.side).toBe(side);
            expect(order.deadline).toBe(deadline);
            expect(order.signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes hex

            const value = {
                id: order.id,
                trader: order.trader,
                baseToken: order.baseToken,
                baseDecimals: order.baseDecimals,
                quoteToken: order.quoteToken,
                quoteDecimals: order.quoteDecimals,
                baseAmount: order.baseAmount,
                priceLevel: order.priceLevel,
                timestamp: order.timestamp,
                side: order.side,
                deadline: order.deadline,
                salt: order.salt
            };

            const recoveredAddress = verifyTypedData(
                DOMAIN,
                MAKER_ORDER_TYPE,
                value,
                order.signature
            );

            expect(recoveredAddress).toBe(wallet.address);
        });

        it('should throw error for unsupported market pair', async () => {
            await expect(builder.createLimitOrder(
                'UNSUPPORTED/PAIR',
                '1',
                '1800.00',
                OrderSide.SELL,
            )).rejects.toThrow('Market pair');
        });
    });

    describe('createMarketOrder', () => {
        it('should create a valid market order with correct market info', async () => {
            const baseAmount = '1';
            const priceLevel = '180.00';
            const side = OrderSide.SELL;
            const deadline = orderDeadline();
            const order = await builder.createMarketOrder(
                'uSOL/USDC',
                baseAmount,
                priceLevel,
                side,
                deadline
            );

            // Verify order properties
            expect(order.trader).toBe(wallet.address);
            expect(order.baseToken).toBe('0x4200000000000000000000000000000000000006');
            expect(order.quoteToken).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
            expect(order.baseDecimals.toString()).toBe('18');
            expect(order.quoteDecimals.toString()).toBe('6');
            expect(order.baseAmount.toString()).toBe('1000000000000000000');
            expect(order.priceLevel).toBe(priceLevel);
            expect(order.side).toBe(side);
            expect(order.signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes hex

            const value = {
                id: order.id,
                trader: order.trader,
                baseToken: order.baseToken,
                baseDecimals: order.baseDecimals,
                quoteToken: order.quoteToken,
                quoteDecimals: order.quoteDecimals,
                baseAmount: order.baseAmount,
                priceLevel: order.priceLevel,
                timestamp: order.timestamp,
                side: order.side,
                deadline: order.deadline
            };

            const recoveredAddress = verifyTypedData(
                DOMAIN,
                TAKER_ORDER_TYPE,
                value,
                order.signature
            );

            expect(recoveredAddress).toBe(wallet.address);
        });

        it('should throw error for unsupported market pair', async () => {
            await expect(builder.createMarketOrder(
                'UNSUPPORTED/PAIR',
                '1',
                '1800.00',
                OrderSide.SELL,
            )).rejects.toThrow('Market pair');
        });
    });
}); 