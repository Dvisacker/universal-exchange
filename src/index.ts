import { createClient } from 'redis';
import { QueueClient } from './clients/queue-client';
import { OrderBook } from './services/orderbook';
import { ExchangeQueue } from './services/exchange-queue';
import { ethers } from 'hardhat';
import { Provider, JsonRpcProvider } from 'ethers';
import { Logger } from './utils/logger';
import { Executor } from './services/executor';

function validateEnvironment(): {
    SETTLEMENT_CONTRACT_ADDRESS: string;
    RPC_URL: string;
    REDIS_URL: string;
} {
    const required = [
        'SETTLEMENT_CONTRACT_ADDRESS',
        'RPC_URL',
        'REDIS_URL'
    ] as const;

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
            'Please set these variables in your environment or .env file');
    }

    // Validate contract address format
    if (!process.env.SETTLEMENT_CONTRACT_ADDRESS?.startsWith('0x') ||
        process.env.SETTLEMENT_CONTRACT_ADDRESS.length !== 42) {
        throw new Error('SETTLEMENT_CONTRACT_ADDRESS must be a valid Ethereum address');
    }

    // After validation, we can safely assert these exist
    return {
        SETTLEMENT_CONTRACT_ADDRESS: process.env.SETTLEMENT_CONTRACT_ADDRESS,
        RPC_URL: process.env.RPC_URL!,
        REDIS_URL: process.env.REDIS_URL!
    };
}

async function main() {
    try {
        // Validate environment variables first
        const env = validateEnvironment();

        // Initialize provider
        const provider = new JsonRpcProvider(env.RPC_URL);
        const [exchangeSigner] = await ethers.getSigners();

        // Initialize Redis
        const redisClient = createClient({
            url: env.REDIS_URL
        });

        await redisClient.connect();
        Logger.info('Redis connected successfully');

        // Initialize core services
        const orderBook = new OrderBook();
        const queueClient = new QueueClient();
        const executor = new Executor(provider, exchangeSigner, env.SETTLEMENT_CONTRACT_ADDRESS);
        const exchangeQueue = new ExchangeQueue(
            orderBook,
            executor,
            provider
        );

        // Set up graceful shutdown
        const shutdown = async () => {
            Logger.info('Shutting down exchange...');
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
        Logger.info(`Connected to RPC: ${env.RPC_URL}`);
        Logger.info(`Connected to Redis: ${env.REDIS_URL}`);

    } catch (error) {
        Logger.error('Failed to initialize exchange:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
}

// Ensure environment variables are loaded before starting
if (require.main === module) {
    main().catch((error) => {
        Logger.error('Unhandled error:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    });
}
