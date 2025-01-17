import { MakerOrder, TakerOrder } from "./types/order";

export type MarketInfo = {
    baseToken: `0x${string}`;
    baseDecimals: number;
    quoteToken: `0x${string}`;
    quoteDecimals: number;
    symbol: string;
};

export const MARKETS: Record<string, MarketInfo> = {
    'WETH/USDC': {
        baseToken: '0x4200000000000000000000000000000000000006',
        baseDecimals: 18,
        quoteToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        quoteDecimals: 6,
        symbol: 'WETH/USDC'
    }
} as const;

export const MARKET_KEYS: Record<string, string> = {
    '0x4200000000000000000000000000000000000006:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'WETH/USDC',
} as const;