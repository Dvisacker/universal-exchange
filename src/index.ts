import { createClient } from 'redis';
import { QueueClient } from './clients/queue-client';
import { OrderBook } from './services/orderbook';
import { ExchangeQueue } from './services/exchange-queue';
import { isAddress, JsonRpcProvider, Wallet } from 'ethers';
import { Logger } from './utils/logger';
import { Executor } from './services/executor';
import { MarketsByTicker } from './types/markets';
import * as dotenv from 'dotenv';

dotenv.config();

function validateEnvironment(): {
    SETTLEMENT_CONTRACT_ADDRESS: string;
    RPC_URL: string;
    REDIS_URL: string;
    PRIVATE_KEY: string;
} {
    const required = [
        'SETTLEMENT_CONTRACT_ADDRESS',
        'RPC_URL',
        'REDIS_URL',
        'PRIVATE_KEY'
    ] as const;

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
            'Please set these variables in your environment or .env file');
    }

    if (!isAddress(process.env.SETTLEMENT_CONTRACT_ADDRESS!)) {
        throw new Error('SETTLEMENT_CONTRACT_ADDRESS must be a valid Ethereum address');
    }

    return {
        SETTLEMENT_CONTRACT_ADDRESS: process.env.SETTLEMENT_CONTRACT_ADDRESS,
        RPC_URL: process.env.RPC_URL!,
        REDIS_URL: process.env.REDIS_URL!,
        PRIVATE_KEY: process.env.PRIVATE_KEY!
    };
}

async function main() {
    try {
        // Validate environment variables first
        const env = validateEnvironment();

        // Initialize provider and signer
        const provider = new JsonRpcProvider(env.RPC_URL);
        const exchangeSigner = new Wallet(env.PRIVATE_KEY, provider);

        // Initialize Redis
        const redisClient = createClient({
            url: env.REDIS_URL
        });

        await redisClient.connect();
        Logger.info('Redis connected successfully');

        const marketsByTicker: MarketsByTicker = {
            'WETH/USDC': {
                baseToken: '0x4200000000000000000000000000000000000006',
                baseDecimals: 18,
                quoteToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                quoteDecimals: 6,
                symbol: 'WETH/USDC'
            }
        }

        // Initialize core services
        const orderBook = new OrderBook(marketsByTicker);
        const queueClient = new QueueClient();
        const executor = new Executor(provider, exchangeSigner, env.SETTLEMENT_CONTRACT_ADDRESS);
        const exchangeQueue = new ExchangeQueue(
            orderBook,
            executor,
            provider
        );

        // Set up graceful shutdown
        const shutdown = async () => {
            Logger.warn('Shutting down exchange...');
            await queueClient.close();
            await redisClient.quit();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        Logger.info('Environment validation successful');
        Logger.info('Exchange initialized successfully');
        Logger.info(`Settlement contract: ${env.SETTLEMENT_CONTRACT_ADDRESS}`);
        Logger.info(`Exchange address: ${exchangeSigner.address}`);

    } catch (error) {
        Logger.error(error as Error);
        process.exit(1);
    }
}

main().catch((error) => {
    Logger.error(error);
    process.exit(1);
});
