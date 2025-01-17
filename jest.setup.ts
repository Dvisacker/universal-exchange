// Handle BigInt serialization
expect.addSnapshotSerializer({
    test: (val) => typeof val === 'bigint',
    print: (val: any) => val.toString()
});

// Add toJSON to BigInt prototype
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

// Add custom stringifier to global JSON
// const originalStringify = JSON.stringify;
// (global as any).JSON.stringify = function (value: any, ...args: any[]) {
//     return originalStringify(value, (_, value) => {
//         if (typeof value === 'bigint') {
//             return value.toString();
//         }
//         return value;
//     }, ...args);
// };