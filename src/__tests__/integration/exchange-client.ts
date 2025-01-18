import { Provider } from 'ethers';
import hre from 'hardhat';
import '@nomicfoundation/hardhat-ethers';
import { createClient } from 'redis';
import { ExchangeClient } from '../../clients/exchange-client';
import { Exchange } from '../../services/exchange';
import { Executor } from '../../services/executor';
import { OrderBook } from '../../services/orderbook';
import { MockERC20, Settlement } from '../../types/contracts';
import { MarketsByTicker } from '../../types/markets';
import { OrderSide } from '../../types/order';
import { orderDeadline, toWei } from '../../utils/helpers';
import { OrderBuilder } from '../../utils/order-builder';

describe('ExchangeClient Integration Tests', () => {
    let exchangeClient: ExchangeClient;
    let orderBook: OrderBook;
    let redisClient: ReturnType<typeof createClient>;
    let settlement: Settlement;
    let makerOrderBuilder: OrderBuilder;
    let takerOrderBuilder: OrderBuilder;
    let provider: Provider;
    let executor: Executor;
    let weth: MockERC20;
    let usdc: MockERC20;

    beforeEach(async () => {
        let [exchange, maker, taker] = await hre.ethers.getSigners();
        provider = hre.ethers.provider;

        settlement = await hre.ethers.deployContract('Settlement');
        weth = await hre.ethers.deployContract('MockERC20', ['uSOL', 'uSOL', 18]);
        usdc = await hre.ethers.deployContract('MockERC20', ['USDC', 'USDC', 6]);

        let settlementContractAddress = settlement.target.toString();

        await weth.mint(maker.address, toWei('100', 18)); // 100 uSOL
        await weth.connect(maker).approve(settlementContractAddress, toWei('100', 18));
        await usdc.mint(taker.address, toWei('200000', 6));
        await usdc.connect(taker).approve(settlementContractAddress, toWei('200000', 6));

        redisClient = createClient();
        await redisClient.connect();
        await redisClient.flushAll();

        const marketsByTicker: MarketsByTicker = {
            'uSOL/USDC': {
                symbol: 'uSOL/USDC',
                baseToken: weth.target.toString(),
                baseDecimals: 18,
                quoteToken: usdc.target.toString(),
                quoteDecimals: 6,
            },
        };

        orderBook = new OrderBook(marketsByTicker);
        makerOrderBuilder = new OrderBuilder(maker, marketsByTicker);
        takerOrderBuilder = new OrderBuilder(taker, marketsByTicker);
        exchangeClient = new ExchangeClient();
        executor = new Executor(provider, exchange, settlementContractAddress);
    });

    afterEach(async () => {
        await redisClient.quit();
    });

    describe('QueueClient Tests', () => {
        it('should execute a trade', async () => {
            await hre.network.provider.send('evm_setAutomine', [true]);
            let [exchange, maker, taker] = await hre.ethers.getSigners();
            const exchangeQueue = new Exchange(orderBook, executor, provider);

            let tx = await settlement
                .connect(maker)
                .deposit(weth.target.toString(), toWei('100', 18));
            tx = await settlement
                .connect(taker)
                .deposit(usdc.target.toString(), toWei('200000', 6));

            let initialMakerWethDeposit = await settlement.deposits(maker.address, weth.target);
            let initialMakerUsdcDeposit = await settlement.deposits(maker.address, usdc.target);
            let initialTakerWethDeposit = await settlement.deposits(taker.address, weth.target);
            let initialTakerUsdcDeposit = await settlement.deposits(taker.address, usdc.target);

            // maker sells 1 ETH for 3000 USDC
            const limitOrder = await makerOrderBuilder.createLimitOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.SELL,
                orderDeadline()
            );
            // taker buys 1 ETH for 3000 USDC (min received)
            const marketOrder = await takerOrderBuilder.createMarketOrder(
                'uSOL/USDC',
                '1',
                '300.00',
                OrderSide.BUY,
                orderDeadline()
            );

            exchangeClient.submitLimitOrder(limitOrder);
            exchangeClient.submitMarketOrder(marketOrder);

            let confirmedTxQueueResult = await new Promise<any>((resolve) => {
                exchangeQueue.confirmedTxQueue.on('completed', (job, result) => {
                    resolve(result);
                });
            });

            let makerWethDeposit = await settlement.deposits(maker.address, weth.target);
            let makerUsdcDeposit = await settlement.deposits(maker.address, usdc.target);
            let takerWethDeposit = await settlement.deposits(taker.address, weth.target);
            let takerUsdcDeposit = await settlement.deposits(taker.address, usdc.target);

            expect(confirmedTxQueueResult.success).toBe(true);
            expect(confirmedTxQueueResult.receipt.hash).toBeDefined();
            expect(confirmedTxQueueResult.receipt.status).toBe(1);
            expect((makerWethDeposit - initialMakerWethDeposit).toString()).toBe(toWei('-1', 18));
            expect((takerWethDeposit - initialTakerWethDeposit).toString()).toBe(toWei('1', 18));
            expect((makerUsdcDeposit - initialMakerUsdcDeposit).toString()).toBe(toWei('3000', 6));
            expect((takerUsdcDeposit - initialTakerUsdcDeposit).toString()).toBe(toWei('-3000', 6));
        });
    });
});
