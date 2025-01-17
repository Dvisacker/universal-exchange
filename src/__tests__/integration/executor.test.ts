import { ethers } from 'ethers';
import { Executor } from '../../services/executor';
import { OrderMatch, OrderSide } from '../../types/order';
import { Settlement, MockERC20 } from '../../types/contracts';
import hre from 'hardhat';
import { JsonRpcProvider } from 'ethers';
import { deadline, defaultDeadline, generateSalt, toWei } from '../../utils';

// Define the domain and types for signing
const DOMAIN = {
    name: 'Universal Exchange',
    version: '1',
    chainId: 31337, // TODO: get from config
    verifyingContract: '' // Set in beforeEach
};

describe('Executor Integration Tests', () => {
    let executor: Executor;
    let settlement: Settlement;
    let weth: MockERC20;
    let usdc: MockERC20;
    let provider: JsonRpcProvider;
    let exchange: ethers.Signer;
    let maker: ethers.Signer;
    let taker: ethers.Signer;
    let sampleMatch: OrderMatch;
    let makerAddress: string;
    let takerAddress: string;

    beforeEach(async () => {
        provider = new JsonRpcProvider('http://localhost:8545');
        [exchange, maker, taker] = await hre.ethers.getSigners();

        // Deploy contracts
        settlement = await hre.ethers.deployContract('Settlement');
        weth = await hre.ethers.deployContract('MockERC20', ['WETH', 'WETH', 18]);
        usdc = await hre.ethers.deployContract('MockERC20', ['USDC', 'USDC', 6]);

        // Update domain with settlement contract address
        DOMAIN.verifyingContract = await settlement.getAddress();

        // Initialize executor
        executor = new Executor(
            provider,
            exchange,
            settlement.target.toString()
        );

        // Setup sample match data
        makerAddress = await maker.getAddress();
        takerAddress = await taker.getAddress();
        // Mint and approve tokens
        await weth.mint(makerAddress, ethers.parseEther('100')); // 100 WETH
        await usdc.mint(takerAddress, ethers.parseUnits('200000', 6)); // 200,000 USDC
        await weth.connect(maker).approve(settlement.target, ethers.MaxUint256);
        await usdc.connect(taker).approve(settlement.target, ethers.MaxUint256);

        let tx = await weth.connect(maker).approve(
            settlement.target,
            toWei("100", 18)
        );

        await tx.wait();


        tx = await usdc.connect(taker).approve(
            settlement.target,
            toWei("200000", 6)
        );

        await tx.wait();


        sampleMatch = {
            pendingTradeId: '1',
            makerOrderId: '1',
            maker: makerAddress,
            baseToken: weth.target.toString(),
            quoteToken: usdc.target.toString(),
            baseAmountFilled: toWei("1", 18),
            quoteAmountFilled: toWei("1800", 6),
            makerSignature: '0x',
            makerTimestamp: Date.now(),
            makerDeadline: defaultDeadline(),
            makerSalt: generateSalt(),
            makerSide: OrderSide.SELL,
            taker: takerAddress,
            takerOrderId: '2',
            takerSignature: '0x',
            takerTimestamp: Date.now(),
            takerSalt: generateSalt()
        };
    });

    it("should track deposits correctly", async () => {
        let tx = await settlement.connect(maker).deposit(
            weth.target,
            toWei("100", 18)
        ); await tx.wait(); let depositedBalance = await settlement.deposits(makerAddress, weth.target); let allowance = await weth.allowance(makerAddress, settlement.target); expect(depositedBalance.toString()).toBe(toWei("100", 18).toString()); expect(allowance.toString()).toBe("0"); tx = await settlement.connect(maker).withdraw(weth.target, toWei("100", 18));

        await tx.wait();

        depositedBalance = await settlement.deposits(
            makerAddress,
            weth.target
        );
        let balance = await weth.balanceOf(makerAddress);
        allowance = await weth.allowance(makerAddress, settlement.target);

        expect(depositedBalance.toString()).toBe("0");
        expect(balance.toString()).toBe(toWei("100", 18).toString());
    });


    it('should successfully simulate a valid trade', async () => {
        let tx = await settlement.connect(maker).deposit(
            weth.target,
            toWei("100", 18)
        );

        await tx.wait();

        tx = await settlement.connect(taker).deposit(
            usdc.target,
            toWei("200000", 6)
        );

        await tx.wait();

        const result = await executor.simulateTrade(sampleMatch);
        expect(result).toBe(true);
    });

    it('should successfully execute a valid trade', async () => {
        let tx = await settlement.connect(maker).deposit(
            weth.target,
            toWei("100", 18)
        );

        await tx.wait();

        tx = await settlement.connect(taker).deposit(
            usdc.target,
            toWei("200000", 6)
        );

        await tx.wait();

        const makerInitialWeth = await settlement.deposits(await maker.getAddress(), weth.target);
        const takerInitialUsdc = await settlement.deposits(await taker.getAddress(), usdc.target);

        // Execute trade
        const txHash = await executor.trade(sampleMatch);
        expect(txHash).toBeDefined();

        const makerFinalWeth = await settlement.deposits(await maker.getAddress(), weth.target);
        const takerFinalUsdc = await settlement.deposits(await taker.getAddress(), usdc.target);

        expect((makerInitialWeth - makerFinalWeth).toString()).toBe(ethers.parseEther('1').toString()); // Maker sent 1 WETH
        expect((takerInitialUsdc - takerFinalUsdc).toString()).toBe(ethers.parseUnits('1800', 6).toString()); // Taker sent 1800 USDC
    });

    it('should fail to execute trade with expired maker deadline', async () => {
        const expiredMatch = {
            ...sampleMatch,
            makerDeadline: deadline(-1)
        };

        const result = await executor.simulateTrade(expiredMatch);
        expect(result).toBe(false);

        await expect(executor.trade(expiredMatch)).rejects.toThrow();
    });

    it('should fail to execute trade with invalid maker signature', async () => {
        const invalidMatch = {
            ...sampleMatch,
            makerSignature: '0x1234567890' as `0x${string}` // Invalid signature
        };

        const result = await executor.simulateTrade(invalidMatch);
        expect(result).toBe(false);

        await expect(executor.trade(invalidMatch)).rejects.toThrow();
    });

    it('should fail to execute trade with insufficient maker balance', async () => {
        // Create match with amount larger than maker's balance
        const largeMatch = {
            ...sampleMatch,
            baseAmountFilled: toWei("1000", 18)
        };

        // Attempt to simulate trade
        const result = await executor.simulateTrade(largeMatch);
        expect(result).toBe(false);

        // Attempt to execute should fail
        await expect(executor.trade(largeMatch)).rejects.toThrow();
    });

    it('should fail to execute trade with insufficient taker balance', async () => {
        // Create match with amount larger than taker's balance
        const largeMatch = {
            ...sampleMatch,
            quoteAmountFilled: toWei("1000000", 6)
        };

        // Attempt to simulate trade
        const result = await executor.simulateTrade(largeMatch);
        expect(result).toBe(false);

        // Attempt to execute should fail
        await expect(executor.trade(largeMatch)).rejects.toThrow();
    });

    it('should fail to execute trade with revoked maker approval', async () => {
        // Revoke maker's approval
        await weth.connect(maker).approve(settlement.target, 0);

        // Attempt to simulate trade
        const result = await executor.simulateTrade(sampleMatch);
        expect(result).toBe(false);

        // Attempt to execute should fail
        await expect(executor.trade(sampleMatch)).rejects.toThrow();

        // Restore approval for other tests
        await weth.connect(maker).approve(settlement.target, ethers.MaxUint256);
    });

    it('should fail to execute trade with revoked taker approval', async () => {
        // Revoke taker's approval
        await usdc.connect(taker).approve(settlement.target, 0);

        // Attempt to simulate trade
        const result = await executor.simulateTrade(sampleMatch);
        expect(result).toBe(false);

        // Attempt to execute should fail
        await expect(executor.trade(sampleMatch)).rejects.toThrow();

        // Restore approval for other tests
        await usdc.connect(taker).approve(settlement.target, ethers.MaxUint256);
    });
}); 