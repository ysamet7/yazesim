/**
 * Local Docker stack commands: `pnpm infra:up`, `pnpm infra:down`,
 * `pnpm infra:logs`, `pnpm infra:reset --yes`. Volumes are kept on `down`.
 */
import { compose } from './lib/compose.ts';
import { CommandError } from './lib/exec.ts';
import { readInfraEnv } from './lib/local-env.ts';
import { log } from './lib/log.ts';

const USAGE = 'Kullanım: node scripts/src/infra.ts <up|down|logs|ps|reset> [servis...]';

async function main(): Promise<void> {
  const [command, ...services] = process.argv.slice(2);
  if (!readInfraEnv()) {
    log.fail('infra/docker/.env bulunamadı. Önce `pnpm bootstrap` çalıştırın.');
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case 'up':
      log.info('Docker servisleri başlatılıyor ve sağlık kontrolleri bekleniyor…');
      await compose(['up', '--detach', '--wait', '--wait-timeout', '180', ...services]);
      log.ok('Servisler çalışıyor.');
      return;
    case 'down':
      await compose(['down', ...services]);
      log.ok('Servisler durduruldu (veriler korunuyor).');
      return;
    case 'logs':
      await compose(['logs', '--follow', '--tail', '100', ...services]);
      return;
    case 'ps':
      await compose(['ps', ...services]);
      return;
    case 'reset':
      // Destructive: deletes the local database, Redis data and chain state.
      if (!services.includes('--yes')) {
        log.warn('Bu komut yerel veritabanı, Redis ve zincir verilerini kalıcı olarak siler.');
        log.info('Onaylamak için: pnpm infra:reset --yes');
        process.exitCode = 1;
        return;
      }
      await compose(['down', '--volumes', '--remove-orphans']);
      log.ok('Servisler durduruldu ve yerel veriler silindi. Yeniden kurmak için: pnpm bootstrap');
      return;
    case undefined:
    default:
      log.fail(USAGE);
      process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  log.fail(error instanceof CommandError ? error.message : String(error));
  process.exitCode = 1;
}
