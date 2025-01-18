import { OrderMessage, TradeMessage, ConfirmedTxMessage, OrderAction, OrderMatch, schemas } from '../types/order';
import { OrderBook } from './orderbook';
import { Executor } from './executor';
import Queue, { Job } from 'bull';
import { ethers } from 'ethers';
import { pollForReceipt } from '../utils';
import { z } from 'zod';

export class Exchange {
    private provider: ethers.Provider;
    public orderQueue: Queue.Queue<OrderMessage>;
    public scheduledTxQueue: Queue.Queue<TradeMessage>;
    public confirmedTxQueue: Queue.Queue<ConfirmedTxMessage>;
    private orderbook: OrderBook;
    private executor: Executor;

    /* 
    - TODO: Use different orderbooks/queues for each market
    - TODO: Use different executors/signers for each market
    */
    constructor(orderbook: OrderBook, executor: Executor, provider: ethers.Provider) {
        this.provider = provider;
        this.orderQueue = new Queue<OrderMessage>('orders');
        this.scheduledTxQueue = new Queue<TradeMessage>('scheduled-tx');
        this.confirmedTxQueue = new Queue<ConfirmedTxMessage>('confirmed-tx');
        this.orderbook = orderbook;
        this.executor = executor;

        // TODO: I believe bull processes jobs sequentially 1 by 1 by default but still needs to be tested
        this.orderQueue.process(async (job: Job<OrderMessage>, done: Queue.DoneCallback) => {
            try {
                const request = job.data;
                const matches = await this.orderbook.handleOrderRequest(request);
                if (request.action === OrderAction.NEW_MARKET_ORDER && z.array(schemas.orderMatch).safeParse(matches).success) {
                    for (const match of matches) {
                        const canExecute = await this.executor.simulateTrade(match);
                        if (canExecute) {
                            this.scheduledTxQueue.add({
                                action: OrderAction.TRADE,
                                payload: { match }
                            });
                        }
                    }
                }

                done(null, { success: true, matches });
            } catch (error) {
                console.log(error)
                done(error as Error);
            }
        });

        /* 
        We have to throttle the number of transactions we can send because we 
        we probably have a limited number of signers/wallets to send transactions from 
        and queuing too much transactions might cause the following transactions
        to fail as well (nonce problem). Ideally we should have many wallets being 
        able to settle transactions simultaneously so that we do not ever run into
        this issue in practice. 

        An additional solution is also to batch trades on the same block
        and same pair.

        TODO: 
        - Batch trades - probably with a multicall
        .*/
        this.scheduledTxQueue.process(20, async (job: Job<TradeMessage>, done: Queue.DoneCallback) => {
            const request = job.data;
            if (request.action === OrderAction.TRADE && request.payload.match) {
                const match = request.payload.match;
                try {
                    const txHash = await this.executor.trade(match);

                    await this.confirmedTxQueue.add({
                        action: OrderAction.CONFIRMED_TX,
                        payload: { txHash, match }
                    });
                    done(null, { success: true, txHash });
                } catch (error) {
                    console.log(error)
                    await this.orderbook.removeInflightOrder(match.takerOrderId);
                    done(error as Error);
                }
            }
        });

        // Process confirmed transactions
        this.confirmedTxQueue.process(20, async (job: Job<ConfirmedTxMessage>, done: Queue.DoneCallback) => {
            const request = job.data;
            if (request.action === OrderAction.CONFIRMED_TX && request.payload.match) {
                const { match, txHash } = request.payload;
                try {
                    /* 
                    provider.waitForTransaction doesn't seem to work with hardhat so we use polling
                    until we find a better solution.
                    */
                    const receipt = await pollForReceipt(this.provider, txHash);

                    if (!receipt) {
                        throw new Error(`Transaction receipt not found: ${txHash}`);
                    }

                    if (receipt.status === 0) {
                        throw new Error(`Transaction failed: ${txHash}`);
                    }

                    done(null, { success: true, receipt });
                } catch (error) {
                    await this.orderbook.removeInflightOrder(match.takerOrderId);
                    done(error as Error);
                }
            }
        });
    }
}


