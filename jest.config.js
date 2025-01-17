module.exports = {
    preset: 'ts-jest',
    setupFilesAfterEnv: ['./jest.setup.ts'],
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    runInBand: true,
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json',
                isolatedModules: true,
            }
        ],
    },
}; 