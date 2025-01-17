import { ethers } from 'ethers';
import { OrderMatch } from '../types/order';
import { Settlement, Settlement__factory } from '../types/contracts';

/**
 * Service responsible for executing trades on the blockchain.
 * Handles trade simulation, execution, and signing of matched orders.
 */
export class Executor {
    private signer: ethers.Signer;
    private provider: ethers.Provider;
    private settlementContract: Settlement;

    /**
     * Creates a new Executor instance
     * @param provider - The Ethereum provider to use for blockchain interactions
     * @param signingKey - The private key to use for signing transactions
     * @param settlementContractAddress - The address of the settlement contract
     */
    constructor(provider: ethers.Provider, signer: ethers.Signer, settlementContractAddress: string) {
        this.provider = provider;
        this.signer = signer;
        this.settlementContract = Settlement__factory.connect(settlementContractAddress, this.signer);
    }

    /**
     * Gets the Ethereum provider instance
     * @returns The current provider instance
     */
    public getProvider(): ethers.Provider {
        return this.provider;
    }

    /**
     * Simulates a trade execution without sending a transaction
     * @param match - The matched order to simulate
     * @returns A promise that resolves to true if the simulation succeeds
     */
    public async simulateTrade(match: OrderMatch): Promise<boolean> {
        try {
            const result = await this.settlementContract.trade.staticCall({
                makerOrderId: match.makerOrderId,
                maker: match.maker,
                baseToken: match.baseToken,
                quoteToken: match.quoteToken,
                baseAmountFilled: match.baseAmountFilled,
                quoteAmountFilled: match.quoteAmountFilled,
                makerSignature: match.makerSignature,
                makerTimestamp: match.makerTimestamp,
                makerDeadline: match.makerDeadline,
                makerSalt: match.makerSalt,
                makerSide: ethers.toUtf8Bytes(match.makerSide),
                taker: match.taker,
                takerOrderId: match.takerOrderId,
                takerSignature: match.takerSignature,
                takerTimestamp: match.takerTimestamp
            })
            return result
        } catch (error) {
            console.error('Error simulating trade', error);
            return false;
        }
    }

    /**
     * Executes a trade on the blockchain
     * @param match - The matched order to execute
     * @returns A promise that resolves to the transaction hash
     */
    public async trade(match: OrderMatch): Promise<string> {
        const tx = await this.settlementContract.trade({
            makerOrderId: match.makerOrderId,
            maker: match.maker,
            baseToken: match.baseToken,
            quoteToken: match.quoteToken,
            baseAmountFilled: match.baseAmountFilled,
            quoteAmountFilled: match.quoteAmountFilled,
            makerSignature: match.makerSignature,
            makerTimestamp: match.makerTimestamp,
            makerDeadline: match.makerDeadline,
            makerSalt: match.makerSalt,
            makerSide: ethers.toUtf8Bytes(match.makerSide),
            taker: match.taker,
            takerOrderId: match.takerOrderId,
            takerSignature: match.takerSignature,
            takerTimestamp: match.takerTimestamp
        });

        return tx.hash;
    }
} 