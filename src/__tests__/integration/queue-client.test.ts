import { QueueClient } from '../../clients/queue-client';
import { OrderBuilder } from '../../services/order-builder';
import { OrderBook } from '../../services/orderbook';
import { MakerOrder, OrderSide } from '../../types/order';
import { createClient } from 'redis';
import { Settlement } from '../../types/contracts';
import hre from 'hardhat';
import { MockERC20 } from '../../types/contracts';
import { deadline, toWei } from '../../utils';
import { ExchangeQueue } from '../../services/exchange-queue';
import { Provider, JsonRpcProvider } from 'ethers';
import { Executor } from '../../services/executor';
import { MarketsByTicker } from '../../types/markets';

describe('QueueClient Integration Tests', () => {
    let queueClient: QueueClient;
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
        provider = new JsonRpcProvider('http://localhost:8545');

        settlement = await hre.ethers.deployContract('Settlement');
        weth = await hre.ethers.deployContract('MockERC20', ['WETH', 'WETH', 18]);
        usdc = await hre.ethers.deployContract('MockERC20', ['USDC', 'USDC', 6]);

        let settlementContractAddress = settlement.target.toString();

        let tx = await weth.mint(maker.address, toWei("100", 18)); // 100 WETH
        await tx.wait();
        tx = await weth.connect(maker).approve(settlementContractAddress, toWei("100", 18));
        await tx.wait();

        tx = await usdc.mint(taker.address, toWei("200000", 6));
        await tx.wait();
        tx = await usdc.connect(taker).approve(settlementContractAddress, toWei("200000", 6));
        await tx.wait();

        redisClient = createClient();
        await redisClient.connect();
        await redisClient.flushAll();

        // const allowance = await weth.allowance(settlementContractAddress, maker.address);
        // console.log('allowance', allowance);

        const marketsByTicker: MarketsByTicker = {
            'WETH/USDC': {
                symbol: 'WETH/USDC',
                baseToken: weth.target.toString(),
                baseDecimals: 18,
                quoteToken: usdc.target.toString(),
                quoteDecimals: 6,
            }
        }

        orderBook = new OrderBook(marketsByTicker);
        makerOrderBuilder = new OrderBuilder(maker, marketsByTicker);
        takerOrderBuilder = new OrderBuilder(taker, marketsByTicker);
        queueClient = new QueueClient();
        executor = new Executor(provider, exchange, settlementContractAddress);

    });

    afterEach(async () => {
        await redisClient.quit();
    });

    describe('QueueClient Tests', () => {
        it('should execute a trade', async () => {
            let [exchange, maker, taker] = await hre.ethers.getSigners();
            const exchangeQueue = new ExchangeQueue(orderBook, executor, provider);

            let tx = await settlement.connect(maker).deposit(weth.target.toString(), toWei("100", 18));
            await tx.wait();
            tx = await settlement.connect(taker).deposit(usdc.target.toString(), toWei("200000", 6));
            await tx.wait();

            let makerDeposit = await settlement.deposits(maker.address, weth.target);
            let takerDeposit = await settlement.deposits(taker.address, usdc.target);

            // maker sells 1 ETH for 3000 USDC
            const limitOrder = await makerOrderBuilder.createLimitOrder('WETH/USDC', '1', '3000.00', OrderSide.SELL, deadline());
            // taker buys 1 ETH for 3000 USDC (min received)
            const marketOrder = await takerOrderBuilder.createMarketOrder('WETH/USDC', '1', '3000.00', OrderSide.BUY, deadline());
            let processed = false;


            // exchangeQueue.orderQueue.on('completed', (job, result) => {
            //     // console.log('order queue completed', result)
            //     // processed = true;
            // });

            // exchangeQueue.scheduledTxQueue.on('completed', (job, result) => {
            //     console.log('scheduled tx queue completed', result)
            //     processed = true;
            // });

            // await new Promise<void>((resolve) => {
            //     exchangeQueue.confirmedTxQueue.on('completed', (job, result) => {
            //         console.log('confirmed tx queue completed', result)
            //         processed = true;
            //         resolve();
            //     });
            // });



            queueClient.submitLimitOrder(limitOrder);
            queueClient.submitMarketOrder(marketOrder);

            // const orderQueueCompleted = await new Promise<boolean>((resolve) => {
            //     exchangeQueue.orderQueue.on('completed', (job, result) => {
            //         console.log('order queue completed', job)
            //         processed = false;
            //         resolve(processed);
            //     });
            // });

            const confirmedTxQueueCompleted = await new Promise<boolean>((resolve) => {
                exchangeQueue.confirmedTxQueue.on('completed', (job, result) => {
                    console.log('confirmed tx queue completed', job)
                    console.log('result', result)
                    processed = true;
                    resolve(processed);
                });
            });

            console.log('confirmedTxQueueCompleted', confirmedTxQueueCompleted)

            await new Promise(resolve => setTimeout(resolve, 1000));
            expect(processed).toBe(true);
        });
    });
});
