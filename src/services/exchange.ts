import { OrderMessage, OrderAction, OrderMatch, schemas, ConfirmedTradeMessage, PendingTradeMessage } from '../types/order';
import { OrderBook } from './orderbook';
import { Executor } from './executor';
import Queue, { Job } from 'bull';
import { ethers } from 'ethers';
import { pollForReceipt } from '../utils/helpers';
import { z } from 'zod';

export class Exchange {
    private provider: ethers.Provider;
    public orderQueue: Queue.Queue<OrderMessage>;
    public scheduledTxQueue: Queue.Queue<PendingTradeMessage>;
    public confirmedTxQueue: Queue.Queue<ConfirmedTradeMessage>;
    private orderbook: OrderBook;
    private executor: Executor;

    /* 
    - TODO: Use different orderbooks/queues for each market
    - TODO: Use different executors/signers for each market
    */
    constructor(orderbook: OrderBook, executor: Executor, provider: ethers.Provider) {
        this.provider = provider;
        this.orderQueue = new Queue<OrderMessage>('orders');
        this.scheduledTxQueue = new Queue<PendingTradeMessage>('scheduled-tx');
        this.confirmedTxQueue = new Queue<ConfirmedTradeMessage>('confirmed-tx');
        this.orderbook = orderbook;
        this.executor = executor;

        // TODO: I believe bull processes jobs sequentially 1 by 1 by default but needs to be confirmed
        this.orderQueue.process(async (job: Job<OrderMessage>, done: Queue.DoneCallback) => {
            try {
                const request = job.data;
                const matches = await this.orderbook.handleOrderRequest(request);
                if (request.action === OrderAction.NEW_MARKET_ORDER && z.array(schemas.orderMatch).safeParse(matches).success) {
                    // how do we handle the different matches here. 
                    for (const match of matches) {
                        try {
                            const canExecute = await this.executor.simulateTrade(match);
                            if (canExecute) {
                                this.scheduledTxQueue.add({
                                    action: OrderAction.PENDING_TRADE,
                                    payload: { match }
                                });
                            }
                        } catch (error) {
                            await this.orderbook.handleOrderRequest({
                                action: OrderAction.FAILED_TRADE,
                                payload: { match }
                            });
                            done(error);
                        }
                    }
                }

                done(null, { success: true, matches });
            } catch (error) {
                done(error);
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
        this.scheduledTxQueue.process(20, async (job: Job<PendingTradeMessage>, done: Queue.DoneCallback) => {
            const request = job.data;
            if (request.action === OrderAction.PENDING_TRADE && request.payload.match) {
                const match = request.payload.match;
                try {
                    const txHash = await this.executor.trade(match);

                    await this.confirmedTxQueue.add({
                        action: OrderAction.CONFIRMED_TRADE,
                        payload: { txHash, match }
                    });
                    done(null, { success: true, txHash });
                } catch (error) {
                    await this.orderbook.handleOrderRequest({
                        action: OrderAction.FAILED_TRADE,
                        payload: { match }
                    });
                    done(error);
                }
            }
        });

        // Process confirmed transactions
        this.confirmedTxQueue.process(20, async (job: Job<ConfirmedTradeMessage>, done: Queue.DoneCallback) => {
            const request = job.data;
            if (request.action === OrderAction.CONFIRMED_TRADE && request.payload.match) {
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
                    await this.orderbook.handleOrderRequest({
                        action: OrderAction.FAILED_TRADE,
                        payload: { match }
                    });
                    done(error);
                }
            }
        });
    }
}


