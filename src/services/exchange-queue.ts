import { OrderMessage, TradeMessage, ConfirmedTxMessage, OrderAction, OrderMatch } from '../types/order';
import { OrderBook } from './orderbook';
import { Executor } from './executor';
import Queue, { Job } from 'bull';
import { ethers } from 'ethers';
import { JsonRpcProvider } from 'ethers';
export class ExchangeQueue {
    private provider: ethers.Provider;
    public orderQueue: Queue.Queue<OrderMessage>;
    public scheduledTxQueue: Queue.Queue<TradeMessage>;
    public confirmedTxQueue: Queue.Queue<ConfirmedTxMessage>;
    private orderbook: OrderBook;
    private executor: Executor;

    constructor(orderbook: OrderBook, executor: Executor, provider: ethers.Provider) {
        this.provider = provider;
        this.orderQueue = new Queue<OrderMessage>('orders');
        this.scheduledTxQueue = new Queue<TradeMessage>('scheduled-tx');
        this.confirmedTxQueue = new Queue<ConfirmedTxMessage>('confirmed-tx');
        this.orderbook = orderbook;
        this.executor = executor;

        // Process orders from the orderbook queue
        this.orderQueue.process(async (job: Job<OrderMessage>, done: Queue.DoneCallback) => {
            try {
                const request = job.data;
                const result = await this.orderbook.handleOrderRequest(request);
                // For market orders get matched, send them to the scheduled tx queue
                if (request.action === OrderAction.NEW_MARKET_ORDER && Array.isArray(result)) {
                    const matches = result as OrderMatch[];
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

                done(null, { processed: true });
            } catch (error) {
                console.log('order queue error', error)
                // console.log(error)
                done(error as Error);
            }
        });

        /* 
        We have to throttle the number of transactions we can send because we 
        we probably have a limited number of wallets to send transactions from 
        and queuing too much transactions might cause the following transactions
        to fail as well (nonce problem). Ideally we should have many wallets being 
        able to settle transactions simultaneously so that we do not ever run into
        this issue in practice. 

        An additional solution is also to batch (netting) trades on the same block
        and same pair.
        .*/
        this.scheduledTxQueue.process(async (job: Job<TradeMessage>, done: Queue.DoneCallback) => {
            console.log('scheduled tx queue process')
            const request = job.data;
            if (request.action === OrderAction.TRADE && request.payload.match) {
                const match = request.payload.match;
                try {
                    // Execute the trade on-chain
                    const txHash = await this.executor.trade(match);

                    // Add to confirmed tx queue for monitoring
                    await this.confirmedTxQueue.add({
                        action: OrderAction.CONFIRMED_TX,
                        payload: { txHash, match }
                    });
                    done(null, { txHash });
                } catch (error) {
                    console.log('scheduled tx error', error)
                    // If the trade fails, remove it from the inflight orders
                    await this.orderbook.removeInflightOrder(match.takerOrderId);
                    done(error as Error);
                }
            }
        });

        // Process confirmed transactions
        this.confirmedTxQueue.process(async (job: Job<ConfirmedTxMessage>, done: Queue.DoneCallback) => {
            const request = job.data;
            if (request.action === OrderAction.CONFIRMED_TX && request.payload.match) {
                const { match, txHash } = request.payload;
                try {
                    const receipt = await this.provider.getTransactionReceipt(txHash);
                    console.log('receipt', receipt)

                    // const receipt = await this.provider.waitForTransaction(txHash);
                    // console.log('receipt', receipt)
                    if (!receipt) {
                        throw new Error(`Transaction receipt not found: ${txHash}`);
                    }

                    console.log('receipt', receipt)

                    if (receipt.status === 0) {
                        await this.orderbook.removeInflightOrder(match.takerOrderId);
                        throw new Error(`Transaction failed: ${txHash}`);
                    }

                    done(null, { receipt });
                } catch (error) {
                    console.log('confirmed tx error', error)
                    // If monitoring fails, remove the order from inflight state
                    // await this.orderbook.removeInflightOrder(match.takerOrderId);
                    done(error as Error);
                }
            }
        });
    }

    public async submitOrder(request: OrderMessage): Promise<void> {
        await this.orderQueue.add(request);
    }
}


