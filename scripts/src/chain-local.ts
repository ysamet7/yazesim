/**
 * `pnpm chain:local` — makes sure the local Anvil chain is running and is the
 * chain the apps expect (31337). The test NoR deployment joins in the
 * contracts step of phase 0.
 */
import { compose } from './lib/compose.ts';
import { CommandError } from './lib/exec.ts';
import { readInfraEnv, rpcUrl } from './lib/local-env.ts';
import { log } from './lib/log.ts';
import { LOCAL_CHAIN_ID, rpcChainId } from './lib/rpc.ts';

async function main(): Promise<void> {
  const infra = readInfraEnv();
  if (!infra) {
    log.fail('infra/docker/.env bulunamadı. Önce `pnpm bootstrap` çalıştırın.');
    process.exitCode = 1;
    return;
  }
  await compose(['up', '--detach', '--wait', 'anvil']);
  const url = rpcUrl(infra);
  const chainId = await rpcChainId(url);
  if (chainId !== LOCAL_CHAIN_ID) {
    throw new Error(
      `Anvil beklenen zincir kimliğini (${String(LOCAL_CHAIN_ID)}) değil ${String(chainId)} döndürdü.`,
    );
  }
  log.ok(`Anvil çalışıyor: ${url} (chainId ${String(LOCAL_CHAIN_ID)})`);
}

try {
  await main();
} catch (error) {
  if (error instanceof CommandError) {
    log.fail(error.message);
    if (error.output) log.info(error.output.slice(-3000));
  } else {
    log.fail(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}
