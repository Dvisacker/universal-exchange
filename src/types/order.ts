import { z } from 'zod';

export enum OrderType {
    MAKER = 'MAKER',
    TAKER = 'TAKER'
}

export enum OrderSide {
    BUY = 'BUY',
    SELL = 'SELL'
}

export enum OrderAction {
    NEW_LIMIT_ORDER = 'NEW_LIMIT_ORDER',
    CANCEL_LIMIT_ORDER = 'CANCEL_LIMIT_ORDER',
    NEW_MARKET_ORDER = 'NEW_MARKET_ORDER',
    CANCEL_MARKET_ORDER = 'CANCEL_MARKET_ORDER',
    TRADE = 'TRADE',
    CONFIRMED_TX = 'CONFIRMED_TX'
}

const makerOrderSchema = z.object({
    id: z.string(),
    trader: z.string().startsWith('0x'),
    baseToken: z.string().startsWith('0x'),
    baseDecimals: z.number(),
    quoteToken: z.string().startsWith('0x'),
    quoteDecimals: z.number(),
    baseAmount: z.string(),
    baseAmountFilled: z.string(),
    priceLevel: z.string(),
    signature: z.string().startsWith('0x'),
    timestamp: z.number(),
    side: z.nativeEnum(OrderSide),
    type: z.literal(OrderType.MAKER),
    deadline: z.number(),
    salt: z.string()
});

const takerOrderSchema = z.object({
    id: z.string(),
    trader: z.string().startsWith('0x'),
    baseToken: z.string().startsWith('0x'),
    baseDecimals: z.number(),
    quoteToken: z.string().startsWith('0x'),
    quoteDecimals: z.number(),
    baseAmount: z.string(),
    priceLevel: z.string(),
    signature: z.string().startsWith('0x'),
    timestamp: z.number(),
    side: z.nativeEnum(OrderSide),
    type: z.literal(OrderType.TAKER),
    deadline: z.number(),
    salt: z.string()
});

const orderMatchSchema = z.object({
    pendingTradeId: z.string(),
    makerOrderId: z.string(),
    maker: z.string(),
    baseToken: z.string(),
    quoteToken: z.string(),
    baseAmountFilled: z.string(),
    quoteAmountFilled: z.string(),
    makerSignature: z.string().startsWith('0x'),
    makerTimestamp: z.number(),
    makerDeadline: z.number(),
    makerSalt: z.string(),
    makerSide: z.enum(['BUY', 'SELL']),
    taker: z.string(),
    takerOrderId: z.string(),
    takerSignature: z.string().startsWith('0x'),
    takerTimestamp: z.number(),
    takerSalt: z.string()
});

const orderMessageSchema = z.object({
    action: z.enum([
        OrderAction.NEW_LIMIT_ORDER,
        OrderAction.CANCEL_LIMIT_ORDER,
        OrderAction.NEW_MARKET_ORDER,
        OrderAction.CANCEL_MARKET_ORDER
    ]),
    payload: z.object({
        order: z.union([makerOrderSchema, takerOrderSchema])
    })
});

const tradeMessageSchema = z.object({
    action: z.literal(OrderAction.TRADE),
    payload: z.object({
        match: orderMatchSchema
    })
});

const confirmedTxMessageSchema = z.object({
    action: z.literal(OrderAction.CONFIRMED_TX),
    payload: z.object({
        txHash: z.string(),
        match: orderMatchSchema
    })
});

export type MakerOrder = z.infer<typeof makerOrderSchema>;
export type TakerOrder = z.infer<typeof takerOrderSchema>;
export type OrderMatch = z.infer<typeof orderMatchSchema>;
export type OrderMessage = z.infer<typeof orderMessageSchema>;
export type TradeMessage = z.infer<typeof tradeMessageSchema>;
export type ConfirmedTxMessage = z.infer<typeof confirmedTxMessageSchema>;

// Export schemas for runtime validation
export const schemas = {
    makerOrder: makerOrderSchema,
    takerOrder: takerOrderSchema,
    orderMatch: orderMatchSchema,
    orderMessage: orderMessageSchema,
    tradeMessage: tradeMessageSchema,
    confirmedTxMessage: confirmedTxMessageSchema
};

export function makerOrderToMap(order: MakerOrder): Map<string, string> {
    // Validate the order
    schemas.makerOrder.parse(order);

    const orderMap = new Map<string, string>();
    orderMap.set('id', order.id);
    orderMap.set('trader', order.trader);
    orderMap.set('baseToken', order.baseToken);
    orderMap.set('baseDecimals', order.baseDecimals.toString());
    orderMap.set('quoteToken', order.quoteToken);
    orderMap.set('quoteDecimals', order.quoteDecimals.toString());
    orderMap.set('baseAmount', order.baseAmount.toString());
    orderMap.set('baseAmountFilled', order.baseAmountFilled.toString());
    orderMap.set('priceLevel', order.priceLevel);
    orderMap.set('deadline', order.deadline.toString());
    orderMap.set('signature', order.signature);
    orderMap.set('timestamp', order.timestamp.toString());
    orderMap.set('salt', order.salt);
    orderMap.set('side', order.side);
    orderMap.set('type', order.type);
    return orderMap;
}

export function makerOrderToObject(order: { [key: string]: string }): MakerOrder {
    const makerOrder = {
        id: order.id,
        trader: order.trader,
        baseToken: order.baseToken,
        quoteToken: order.quoteToken,
        baseDecimals: +order.baseDecimals,
        quoteDecimals: +order.quoteDecimals,
        baseAmount: order.baseAmount,
        baseAmountFilled: order.baseAmountFilled,
        priceLevel: order.priceLevel,
        signature: order.signature,
        timestamp: +order.timestamp,
        salt: order.salt,
        side: order.side,
        type: order.type,
        deadline: +order.deadline,
    };

    // Validate and return the parsed order
    return schemas.makerOrder.parse(makerOrder);
}

export function takerOrderToMap(order: TakerOrder): Map<string, string> {
    // Validate the order
    schemas.takerOrder.parse(order);

    const orderMap = new Map<string, string>();
    orderMap.set('id', order.id);
    orderMap.set('trader', order.trader);
    orderMap.set('baseToken', order.baseToken);
    orderMap.set('baseDecimals', order.baseDecimals.toString());
    orderMap.set('quoteToken', order.quoteToken);
    orderMap.set('quoteDecimals', order.quoteDecimals.toString());
    orderMap.set('baseAmount', order.baseAmount.toString());
    orderMap.set('priceLevel', order.priceLevel);
    orderMap.set('signature', order.signature);
    orderMap.set('timestamp', order.timestamp.toString());
    orderMap.set('side', order.side);
    orderMap.set('type', order.type);
    return orderMap;
}

export function takerOrderToObject(order: { [key: string]: string }): TakerOrder {
    const takerOrder = {
        id: order.id,
        trader: order.trader,
        baseToken: order.baseToken,
        baseDecimals: +order.baseDecimals,
        quoteToken: order.quoteToken,
        quoteDecimals: +order.quoteDecimals,
        baseAmount: order.baseAmount,
        priceLevel: order.priceLevel,
        signature: order.signature,
        timestamp: +order.timestamp,
        side: order.side,
        deadline: +order.deadline,
        salt: order.salt,
        type: order.type,
    };

    // Validate and return the parsed order
    return schemas.takerOrder.parse(takerOrder);
}

export function orderMatchToMap(order: OrderMatch): Map<string, string> {
    // Validate the order match
    schemas.orderMatch.parse(order);

    const orderMap = new Map<string, string>();
    orderMap.set('makerOrderId', order.makerOrderId);
    orderMap.set('maker', order.maker);
    orderMap.set('baseToken', order.baseToken);
    orderMap.set('quoteToken', order.quoteToken);
    orderMap.set('baseAmountFilled', order.baseAmountFilled.toString());
    orderMap.set('quoteAmountFilled', order.quoteAmountFilled.toString());
    orderMap.set('makerSignature', order.makerSignature);
    orderMap.set('makerTimestamp', order.makerTimestamp.toString());
    orderMap.set('makerDeadline', order.makerDeadline.toString());
    orderMap.set('makerSalt', order.makerSalt);
    orderMap.set('makerSide', order.makerSide)
    orderMap.set('taker', order.taker);
    orderMap.set('takerOrderId', order.takerOrderId);
    orderMap.set('takerSignature', order.takerSignature);
    orderMap.set('takerTimestamp', order.takerTimestamp.toString());
    return orderMap;
}