export type MarketInfo = {
    baseToken: string;
    baseDecimals: number;
    quoteToken: string;
    quoteDecimals: number;
    symbol: string;
};

export type MarketsByTicker = Record<string, MarketInfo>;

export type TickersByTokenPair = Record<string, string>;