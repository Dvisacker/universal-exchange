import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-ethers';
import '@typechain/hardhat';

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.24',
        settings: {
            viaIR: true,
        },
    },
    typechain: {
        outDir: 'src/types/contracts',
        target: 'ethers-v6',
    },
    networks: {
        localhost: {
            url: 'http://localhost:8545',
            chainId: 31337,
            mining: {
                auto: true,
                interval: 100,
            },
        },
        hardhat: {
            chainId: 31337,
            mining: {
                auto: true,
                interval: 1000,
            },
        },
    },
};

export default config;
