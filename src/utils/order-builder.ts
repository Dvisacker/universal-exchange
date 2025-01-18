import { TypedDataDomain } from 'ethers';
import { MakerOrder, OrderSide, OrderType, TakerOrder } from '../types/order';
import { keccak256, AbiCoder } from 'ethers';
import { Signer } from 'ethers';
import { orderDeadline, generateSalt, toWei } from './helpers';
import { MarketInfo, MarketsByTicker, TickersByTokenPair } from '../types/markets';

export const DOMAIN: TypedDataDomain = {
    name: 'DEX',
    version: '1',
    chainId: 1, // TODO: Make this configurable
};

export const MAKER_ORDER_TYPE = {
    MakerOrder: [
        { name: 'id', type: 'string' },
        { name: 'trader', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseDecimals', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'quoteDecimals', type: 'uint256' },
        { name: 'baseAmount', type: 'uint256' },
        { name: 'priceLevel', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'side', type: 'string' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const TAKER_ORDER_TYPE = {
    TakerOrder: [
        { name: 'id', type: 'string' },
        { name: 'trader', type: 'address' },
        { name: 'baseToken', type: 'address' },
        { name: 'baseDecimals', type: 'uint256' },
        { name: 'quoteToken', type: 'address' },
        { name: 'quoteDecimals', type: 'uint256' },
        { name: 'baseAmount', type: 'uint256' },
        { name: 'priceLevel', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'side', type: 'string' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export class OrderBuilder {
    private signer: Signer;
    private marketsByTicker: MarketsByTicker;

    constructor(signer: Signer, marketsByTicker: MarketsByTicker) {
        this.signer = signer;
        this.marketsByTicker = marketsByTicker;
    }

    private getMarketInfo(ticker: string): MarketInfo {
        const market = this.marketsByTicker[ticker];
        if (!market) {
            throw new Error(`Market pair ${ticker} not supported`);
        }
        return market;
    }

    private generateMakerOrderId(order: Omit<MakerOrder, 'id' | 'signature'>): string {
        const abiCoder = new AbiCoder();
        const encodedParams = abiCoder.encode(
            [
                'address',
                'address',
                'address',
                'uint256',
                'uint256',
                'string',
                'uint256',
                'string',
                'uint256',
            ],
            [
                order.trader,
                order.baseToken,
                order.quoteToken,
                order.baseAmount,
                order.baseAmountFilled,
                order.priceLevel,
                order.timestamp,
                order.side,
                order.deadline,
            ]
        );
        return keccak256(encodedParams);
    }

    private generateTakerOrderId(order: Omit<TakerOrder, 'id' | 'signature'>): string {
        const abiCoder = new AbiCoder();
        const encodedParams = abiCoder.encode(
            ['address', 'address', 'address', 'uint256', 'string', 'uint256', 'string'],
            [
                order.trader,
                order.baseToken,
                order.quoteToken,
                order.baseAmount,
                order.priceLevel,
                order.timestamp,
                order.side,
            ]
        );
        return keccak256(encodedParams);
    }

    // TODO: make this synchronous
    async createLimitOrder(
        marketPair: string,
        amount: string,
        priceLevel: string,
        side: OrderSide,
        deadline: number = orderDeadline()
    ): Promise<MakerOrder> {
        const market = this.getMarketInfo(marketPair);
        const baseAmountInWei = toWei(amount, market.baseDecimals);
        const timestamp = Date.now();
        const salt = generateSalt();

        const orderData = {
            trader: await this.signer.getAddress(),
            baseToken: market.baseToken,
            baseDecimals: market.baseDecimals,
            quoteToken: market.quoteToken,
            quoteDecimals: market.quoteDecimals,
            baseAmount: baseAmountInWei,
            baseAmountFilled: '0',
            priceLevel,
            timestamp,
            side,
            salt,
            type: OrderType.MAKER,
            deadline,
        } as const;

        const order: MakerOrder = {
            ...orderData,
            id: this.generateMakerOrderId(orderData),
            signature: '0x', // Will be filled after signing
        };

        // Sign the order
        const signature = await this.signMakerOrder(order);
        order.signature = signature;

        return order;
    }

    // TODO: make this synchronous
    async createMarketOrder(
        marketPair: string,
        amount: string,
        priceLevel: string,
        side: OrderSide,
        deadline: number = orderDeadline()
    ): Promise<TakerOrder> {
        const market = this.getMarketInfo(marketPair);
        const baseAmountInWei = toWei(amount, market.baseDecimals);
        const timestamp = Date.now();
        const salt = generateSalt();

        const orderData = {
            trader: await this.signer.getAddress(),
            baseToken: market.baseToken,
            baseDecimals: market.baseDecimals,
            quoteToken: market.quoteToken,
            quoteDecimals: market.quoteDecimals,
            baseAmount: baseAmountInWei,
            priceLevel,
            timestamp,
            side,
            salt,
            type: OrderType.TAKER,
            deadline,
        } as const;

        const order: TakerOrder = {
            ...orderData,
            id: this.generateTakerOrderId(orderData),
            signature: '0x', // Will be filled after signing
        };

        // Sign the order
        const signature = await this.signTakerOrder(order);
        order.signature = signature;

        return order;
    }

    private async signMakerOrder(order: MakerOrder): Promise<`0x${string}`> {
        const typedData = {
            domain: DOMAIN,
            types: MAKER_ORDER_TYPE,
            primaryType: 'MakerOrder',
            message: {
                id: order.id,
                trader: order.trader,
                baseToken: order.baseToken,
                baseDecimals: order.baseDecimals,
                quoteToken: order.quoteToken,
                quoteDecimals: order.quoteDecimals,
                baseAmount: order.baseAmount,
                priceLevel: order.priceLevel,
                timestamp: order.timestamp,
                side: order.side,
                deadline: order.deadline,
            },
        };

        const signature = await this.signer.signTypedData(
            typedData.domain,
            { MakerOrder: typedData.types.MakerOrder },
            typedData.message
        );

        return signature as `0x${string}`;
    }

    private async signTakerOrder(order: TakerOrder): Promise<`0x${string}`> {
        const typedData = {
            domain: DOMAIN,
            types: TAKER_ORDER_TYPE,
            primaryType: 'TakerOrder',
            message: {
                id: order.id,
                trader: order.trader,
                baseToken: order.baseToken,
                baseDecimals: order.baseDecimals,
                quoteToken: order.quoteToken,
                quoteDecimals: order.quoteDecimals,
                baseAmount: order.baseAmount,
                priceLevel: order.priceLevel,
                timestamp: order.timestamp,
                deadline: order.deadline,
                side: order.side,
            },
        };

        const signature = await this.signer.signTypedData(
            typedData.domain,
            { TakerOrder: typedData.types.TakerOrder },
            typedData.message
        );

        return signature as `0x${string}`;
    }
}
