/**
 * `pnpm chain:local` — makes sure the local Anvil chain is running, deploys
 * the test NoR token when the chain has none (a chain that already has it is
 * left alone) and writes its address into the API and worker env files.
 */
import { compose } from './lib/compose.ts';
import { CommandError } from './lib/exec.ts';
import { APP_ENV_FILES, ensureAppEnv, readEnvFile, readInfraEnv, rpcUrl } from './lib/local-env.ts';
import { log } from './lib/log.ts';
import { ensureMockNoR } from './lib/mock-nor.ts';

async function main(): Promise<void> {
  const infra = readInfraEnv();
  if (!infra) {
    log.fail('infra/docker/.env bulunamadı. Önce `pnpm bootstrap` çalıştırın.');
    process.exitCode = 1;
    return;
  }
  await compose(['up', '--detach', '--wait', 'anvil']);
  const url = rpcUrl(infra);
  log.ok(`Anvil çalışıyor: ${url}`);
  const result = await ensureMockNoR(url, readEnvFile('apps/api/.env')?.NOR_TOKEN_ADDRESS);
  log.ok(`Sahte NoR ${result.deployed ? 'yayınlandı' : 'zaten yayında'}: ${result.address}`);
  for (const file of APP_ENV_FILES.filter((f) => f.app === 'api' || f.app === 'worker')) {
    ensureAppEnv(file, infra, { norTokenAddress: result.address });
  }
  log.info('Adres apps/api/.env ve apps/worker/.env dosyalarına yazıldı.');
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
