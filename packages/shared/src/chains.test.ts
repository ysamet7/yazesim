import { describe, expect, it } from 'vitest';
import {
  CHAIN_IDS,
  ChainNotSupportedError,
  MainnetLockedError,
  assertChainAllowed,
  chains,
  getChain,
  isSupportedChainId,
} from './chains.js';

const TX_HASH = `0x${'ab'.repeat(32)}` as const;
const ADDRESS = `0x${'12'.repeat(20)}` as const;

describe('chain registry', () => {
  it('defines exactly the local, Fuji and Avalanche chains', () => {
    expect(CHAIN_IDS).toEqual({ local: 31337, fuji: 43113, avalanche: 43114 });
    expect(Object.keys(chains).sort()).toEqual(['avalanche', 'fuji', 'local']);
  });

  it('marks only Avalanche mainnet as locked', () => {
    expect(chains.avalanche.locked).toBe(true);
    expect(chains.fuji.locked).toBe(false);
    expect(chains.local.locked).toBe(false);
  });

  it('flags test networks', () => {
    expect(chains.local.testnet).toBe(true);
    expect(chains.fuji.testnet).toBe(true);
    expect(chains.avalanche.testnet).toBe(false);
  });

  it('keeps the viem chain definition in sync with the chain id', () => {
    for (const chain of Object.values(chains)) {
      expect(chain.viem.id).toBe(chain.id);
    }
  });

  it('builds Snowtrace links for public networks', () => {
    expect(chains.fuji.explorer?.txUrl(TX_HASH)).toBe(`https://testnet.snowtrace.io/tx/${TX_HASH}`);
    expect(chains.fuji.explorer?.addressUrl(ADDRESS)).toBe(
      `https://testnet.snowtrace.io/address/${ADDRESS}`,
    );
    expect(chains.avalanche.explorer?.txUrl(TX_HASH)).toBe(`https://snowtrace.io/tx/${TX_HASH}`);
  });

  it('has no public explorer for the local chain', () => {
    expect(chains.local.explorer).toBeNull();
  });
});

describe('getChain', () => {
  it('finds a chain by id', () => {
    expect(getChain(43113).key).toBe('fuji');
    expect(getChain(31337).key).toBe('local');
    expect(getChain(43114).key).toBe('avalanche');
  });

  it('rejects unsupported chains', () => {
    expect(() => getChain(1)).toThrow(ChainNotSupportedError);
    expect(() => getChain(1)).toThrow(expect.objectContaining({ code: 'CHAIN_NOT_SUPPORTED' }));
  });
});

describe('isSupportedChainId', () => {
  it('narrows known chain ids', () => {
    expect(isSupportedChainId(31337)).toBe(true);
    expect(isSupportedChainId(43113)).toBe(true);
    expect(isSupportedChainId(43114)).toBe(true);
    expect(isSupportedChainId(1)).toBe(false);
    expect(isSupportedChainId(Number.NaN)).toBe(false);
  });
});

describe('assertChainAllowed (golden rule 5)', () => {
  it('allows the local chain and Fuji', () => {
    expect(() => {
      assertChainAllowed(31337, { allowMainnet: false });
    }).not.toThrow();
    expect(() => {
      assertChainAllowed(43113, { allowMainnet: false });
    }).not.toThrow();
  });

  it('refuses Avalanche mainnet without an explicit opt-in', () => {
    expect(() => {
      assertChainAllowed(43114, { allowMainnet: false });
    }).toThrow(MainnetLockedError);
    expect(() => {
      assertChainAllowed(43114, { allowMainnet: false });
    }).toThrow(expect.objectContaining({ code: 'MAINNET_LOCKED' }));
  });

  it('allows Avalanche mainnet only with the explicit opt-in', () => {
    expect(() => {
      assertChainAllowed(43114, { allowMainnet: true });
    }).not.toThrow();
  });

  it('rejects unsupported chains regardless of the opt-in', () => {
    expect(() => {
      assertChainAllowed(1, { allowMainnet: true });
    }).toThrow(ChainNotSupportedError);
  });
});
