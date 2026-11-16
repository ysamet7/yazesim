/**
 * Single source of truth for the chains YazeSim runs on. NoR lives on Avalanche
 * C-Chain (43114); development uses a local Anvil chain and staging uses Fuji.
 * Contract addresses are never stored here: they come from the environment
 * (`NOR_TOKEN_ADDRESS`), so a build can never point at the wrong token.
 */
import type { Address, Chain, Hash } from 'viem';
import { anvil, avalanche, avalancheFuji } from 'viem/chains';

export const CHAIN_IDS = {
  local: 31337,
  fuji: 43113,
  avalanche: 43114,
} as const;

export type ChainKey = keyof typeof CHAIN_IDS;
export type SupportedChainId = (typeof CHAIN_IDS)[ChainKey];

export const MAINNET_CHAIN_ID = CHAIN_IDS.avalanche;

export interface ChainExplorer {
  readonly name: string;
  readonly url: string;
  readonly txUrl: (hash: Hash) => string;
  readonly addressUrl: (address: Address) => string;
}

export interface YazeSimChain {
  readonly key: ChainKey;
  readonly id: SupportedChainId;
  readonly name: string;
  readonly testnet: boolean;
  /** Golden rule 5: nothing that sends transactions to a locked chain runs without an explicit opt-in. */
  readonly locked: boolean;
  readonly explorer: ChainExplorer | null;
  readonly viem: Chain;
}

function snowtrace(url: string): ChainExplorer {
  return {
    name: 'Snowtrace',
    url,
    txUrl: (hash) => `${url}/tx/${hash}`,
    addressUrl: (address) => `${url}/address/${address}`,
  };
}

export const chains: Readonly<Record<ChainKey, YazeSimChain>> = {
  local: {
    key: 'local',
    id: CHAIN_IDS.local,
    name: 'Yerel (Anvil)',
    testnet: true,
    locked: false,
    explorer: null,
    viem: anvil,
  },
  fuji: {
    key: 'fuji',
    id: CHAIN_IDS.fuji,
    name: 'Avalanche Fuji (test ağı)',
    testnet: true,
    locked: false,
    explorer: snowtrace('https://testnet.snowtrace.io'),
    viem: avalancheFuji,
  },
  avalanche: {
    key: 'avalanche',
    id: CHAIN_IDS.avalanche,
    name: 'Avalanche C-Chain',
    testnet: false,
    locked: true,
    explorer: snowtrace('https://snowtrace.io'),
    viem: avalanche,
  },
};

const chainsById = new Map<number, YazeSimChain>(Object.values(chains).map((c) => [c.id, c]));

export class ChainNotSupportedError extends Error {
  readonly code = 'CHAIN_NOT_SUPPORTED';

  constructor(readonly chainId: number) {
    super(`Chain ${chainId} is not supported. Supported: ${[...chainsById.keys()].join(', ')}`);
    this.name = 'ChainNotSupportedError';
  }
}

export class MainnetLockedError extends Error {
  readonly code = 'MAINNET_LOCKED';

  constructor(readonly chainId: number) {
    super(
      `Chain ${chainId} (Avalanche mainnet) is locked. Anything that sends transactions there ` +
        'needs an explicit ALLOW_MAINNET=true opt-in (CLAUDE.md golden rule 5).',
    );
    this.name = 'MainnetLockedError';
  }
}

export function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return chainsById.has(chainId);
}

/** @throws {ChainNotSupportedError} */
export function getChain(chainId: number): YazeSimChain {
  const chain = chainsById.get(chainId);
  if (!chain) throw new ChainNotSupportedError(chainId);
  return chain;
}

/**
 * Guards every code path that deploys to or operates on a chain.
 *
 * @throws {ChainNotSupportedError} for unknown chains
 * @throws {MainnetLockedError} for a locked chain without `allowMainnet`
 */
export function assertChainAllowed(chainId: number, options: { allowMainnet: boolean }): void {
  const chain = getChain(chainId);
  if (chain.locked && !options.allowMainnet) throw new MainnetLockedError(chainId);
}
