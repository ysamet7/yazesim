/**
 * Deploys the test NoR token (contracts/src/MockNoR.sol) to the local Anvil
 * chain, once: a chain that already has it keeps it. Anvil's development
 * accounts are unlocked, so the deployment needs no private key at all.
 */
import { readFileSync } from 'node:fs';
import { run } from './exec.ts';
import { repoPath } from './paths.ts';
import { LOCAL_CHAIN_ID, rpcChainId, rpcHasCode } from './rpc.ts';

/** Anvil's first development account: a public, well-known address, unlocked on Anvil. */
export const ANVIL_DEPLOYER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const SCRIPT = 'script/DeployMockNoR.s.sol:DeployMockNoR';
const BROADCAST_FILE = `contracts/broadcast/DeployMockNoR.s.sol/${String(LOCAL_CHAIN_ID)}/run-latest.json`;

interface BroadcastFile {
  readonly transactions?: readonly {
    readonly transactionType?: string;
    readonly contractName?: string | null;
    readonly contractAddress?: string | null;
  }[];
}

/** The MockNoR address from a forge broadcast record. */
export function parseDeployedAddress(json: string): string {
  const record = JSON.parse(json) as BroadcastFile;
  const create = record.transactions?.find(
    (tx) => tx.transactionType === 'CREATE' && tx.contractName === 'MockNoR',
  );
  const address = create?.contractAddress;
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/u.test(address)) {
    throw new Error('Yayın kaydında MockNoR adresi bulunamadı');
  }
  return address;
}

export interface MockNoRResult {
  /** Checksummed address. */
  readonly address: string;
  readonly deployed: boolean;
}

export async function ensureMockNoR(rpcUrl: string, current?: string): Promise<MockNoRResult> {
  // Local only: a broadcast to any other chain must never start from here.
  const chainId = await rpcChainId(rpcUrl);
  if (chainId !== LOCAL_CHAIN_ID) {
    throw new Error(
      `Sahte NoR yalnız yerel zincire (${String(LOCAL_CHAIN_ID)}) yayınlanır; uç nokta ${String(chainId)} bildiriyor.`,
    );
  }
  const { getAddress } = await import('viem');
  if (current !== undefined && current !== '' && (await rpcHasCode(rpcUrl, current))) {
    return { address: getAddress(current), deployed: false };
  }
  await run(
    'forge',
    [
      'script',
      SCRIPT,
      '--rpc-url',
      rpcUrl,
      '--broadcast',
      '--unlocked',
      '--sender',
      ANVIL_DEPLOYER,
    ],
    { cwd: repoPath('contracts'), quiet: true },
  );
  const address = getAddress(parseDeployedAddress(readFileSync(repoPath(BROADCAST_FILE), 'utf8')));
  if (!(await rpcHasCode(rpcUrl, address))) {
    throw new Error('Sahte NoR yayınlandı görünüyor ama adreste kod yok');
  }
  return { address, deployed: true };
}
