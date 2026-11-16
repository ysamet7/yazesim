import { describe, expect, it } from 'vitest';
import { parseDeployedAddress } from './mock-nor.ts';

const ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

describe('parseDeployedAddress', () => {
  it('finds the MockNoR creation in a forge broadcast record', () => {
    const json = JSON.stringify({
      transactions: [
        { transactionType: 'CALL', contractName: null, contractAddress: null },
        { transactionType: 'CREATE', contractName: 'MockNoR', contractAddress: ADDRESS },
      ],
    });
    expect(parseDeployedAddress(json)).toBe(ADDRESS);
  });

  it('refuses a record without the deployment', () => {
    expect(() => parseDeployedAddress('{"transactions":[]}')).toThrow(/MockNoR/u);
    expect(() =>
      parseDeployedAddress(
        JSON.stringify({
          transactions: [
            { transactionType: 'CREATE', contractName: 'Other', contractAddress: ADDRESS },
          ],
        }),
      ),
    ).toThrow(/MockNoR/u);
  });

  it('refuses a malformed address', () => {
    const json = JSON.stringify({
      transactions: [
        { transactionType: 'CREATE', contractName: 'MockNoR', contractAddress: '0x12' },
      ],
    });
    expect(() => parseDeployedAddress(json)).toThrow(/MockNoR/u);
  });
});
