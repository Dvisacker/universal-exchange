import { parseUnits } from 'ethers';
import { solidityPackedKeccak256 } from 'ethers'
import { TakerOrder } from './types/order';
import { MakerOrder } from './types/order';
import { ethers } from 'hardhat';
import { Provider } from 'ethers';
/**
 * Calculates the quote token amount based on the base amount and price level
 * @param baseAmount - The amount of base token in its smallest unit (wei)
 * @param priceLevel - The price as a decimal string (e.g. "1800.50")
 * @param baseDecimals - Number of decimals for the base token
 * @param quoteDecimals - Number of decimals for the quote token
 * @returns The calculated quote amount in its smallest unit (wei)
 */
export function calculateQuoteAmount(
    baseAmount: bigint,
    priceLevel: string,
    baseDecimals: number,
    quoteDecimals: number
): bigint {
    // Convert price level to BigInt with extra precision
    const PRICE_PRECISION = 18;
    const priceInWei = parseUnits(priceLevel, PRICE_PRECISION);
    // console.log(priceInWei, baseAmount, quoteDecimals, baseDecimals);

    // Formula: quoteAmount = baseAmount * price * (10^quoteDecimals) / (10^(baseDecimals + PRICE_PRECISION))
    const quoteAmount = (
        BigInt(baseAmount) * priceInWei * BigInt(10 ** quoteDecimals)
    ) / BigInt(10 ** (baseDecimals + PRICE_PRECISION));

    return quoteAmount;
}

/**
 * Creates a deterministic hash from two IDs by sorting them and applying keccak256
 * @param id1 - First ID string
 * @param id2 - Second ID string
 * @returns Keccak256 hash of the sorted IDs
 */
export const hashIds = (id1: string, id2: string): string => {
    const sorted = [id1, id2].sort()
    return solidityPackedKeccak256(['string', 'string'], sorted)
}

/**
 * Generates a market key in the format "baseToken:quoteToken"
 * @param order - A maker or taker order object
 * @returns Formatted market key string
 */
export const getMarketKey = (order: MakerOrder | TakerOrder) => `${order.baseToken}:${order.quoteToken}`;

/**
 * Converts a decimal string amount to wei (smallest token unit)
 * @param amount - Amount as a decimal string
 * @param decimals - Number of decimals for the token (default: 18)
 * @returns Amount in wei as a bigint
 */
export const toWei = (amount: string, decimals: number = 18): string => {
    return ethers.parseUnits(amount, decimals).toString();
};

/**
 * Converts a wei amount to a decimal string
 * @param amount - Amount in wei as a bigint
 * @param decimals - Number of decimals for the token (default: 18)
 * @returns Formatted decimal string
 */
export const fromWei = (amount: bigint, decimals: number = 18): string => {
    return ethers.formatUnits(amount, decimals);
};

/**
 * Generates a random hexadecimal salt
 * @returns Hexadecimal string prefixed with "0x"
 */
export const generateSalt = (): string => {
    return '0x' + Math.floor(Math.random() * 1000000).toString(16);
};

/**
 * Calculates a future timestamp in milliseconds
 * @param hours - Number of hours from now (default: 1)
 * @returns Future timestamp as a bigint
 */
export const deadline = (hours = 1): number => {
    return Date.now() + hours * 3600 * 1000;
};

export const defaultDeadline = (hours = 1): number => {
    return Date.now() + hours * 3600000;
};

export const pollForReceipt = async (provider: Provider, txHash: string, maxAttempts: number = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) return receipt;
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Receipt not found');
}
