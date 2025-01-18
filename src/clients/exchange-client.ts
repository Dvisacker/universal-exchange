import {
    OrderMessage,
    OrderAction,
    MakerOrder,
    TakerOrder,
    ConfirmedTradeMessage,
    PendingTradeMessage,
} from '../types/order';
import Queue from 'bull';

export enum Priority {
    HIGH = 1,
    LOW = 2,
}

export class ExchangeClient {
    public orderQueue: Queue.Queue<OrderMessage>;
    public scheduledTxQueue: Queue.Queue<PendingTradeMessage>;
    public confirmedTxQueue: Queue.Queue<ConfirmedTradeMessage>;

    constructor() {
        this.orderQueue = new Queue<OrderMessage>('orders');
        this.scheduledTxQueue = new Queue<PendingTradeMessage>('scheduled-tx');
        this.confirmedTxQueue = new Queue<ConfirmedTradeMessage>('confirmed-tx');
    }

    /**
     * Submit a limit order to the exchange
     * @param order The limit order to submit
     * @returns The job ID of the submitted order
     */
    async submitLimitOrder(order: MakerOrder): Promise<string> {
        const job = await this.orderQueue.add(
            {
                action: OrderAction.NEW_LIMIT_ORDER,
                payload: { order },
            },
            {
                priority: Priority.HIGH,
            }
        );
        return job.id.toString();
    }

    /**
     * Submit a market order to the exchange
     * @param order The market order to submit
     * @returns The job ID of the submitted order
     */
    async submitMarketOrder(order: TakerOrder): Promise<string> {
        const job = await this.orderQueue.add(
            {
                action: OrderAction.NEW_MARKET_ORDER,
                payload: { order },
            },
            {
                priority: Priority.LOW,
            }
        );
        return job.id.toString();
    }

    /**
     * Cancel a limit order
     * @param order The limit order to cancel
     * @returns The job ID of the cancellation request
     *
     * Cancelling orders should be prioritized over new orders
     */
    async cancelLimitOrder(order: MakerOrder): Promise<string> {
        const job = await this.orderQueue.add(
            {
                action: OrderAction.CANCEL_LIMIT_ORDER,
                payload: { order },
            },
            {
                priority: Priority.HIGH,
            }
        );
        return job.id.toString();
    }

    /**
     * Get the status of a job by its ID
     * @param jobId The ID of the job to check
     * @returns The job status
     */
    async getJobStatus(jobId: string): Promise<string> {
        const job = await this.orderQueue.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        return job.getState();
    }

    /**
     * Clean up resources when the client is no longer needed
     */
    async close(): Promise<void> {
        await this.orderQueue.close();
        await this.scheduledTxQueue.close();
        await this.confirmedTxQueue.close();
    }
}
