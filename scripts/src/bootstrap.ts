/**
 * `pnpm bootstrap` — one command from a fresh clone to a running local stack.
 * Every step is idempotent: running it again keeps existing values and data
 * and only fills in what is missing.
 *
 * Options:
 *   --only=<id,...>   run only these steps
 *   --skip=<id,...>   skip these steps
 * Step ids: tools, install, env, docker, db, chain
 *
 * This file runs directly on Node.js (type stripping) before dependencies are
 * installed, so it imports only Node built-ins and local helpers.
 */
import { compose, databaseVolumeExists } from './lib/compose.ts';
import { CommandError, run } from './lib/exec.ts';
import {
  APP_ENV_FILES,
  ensureAppEnv,
  ensureInfraEnv,
  readEnvFile,
  readInfraEnv,
  rpcUrl,
  type EnvValues,
} from './lib/local-env.ts';
import { log } from './lib/log.ts';
import { LOCAL_CHAIN_ID, rpcChainId } from './lib/rpc.ts';
import { checkTools, freeDiskGb } from './lib/tools.ts';

class BootstrapError extends Error {
  readonly hint: string | undefined;

  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BootstrapError';
    this.hint = hint;
  }
}

interface Context {
  infra: EnvValues | null;
}

interface Step {
  readonly id: string;
  readonly title: string;
  readonly run: (context: Context) => Promise<void>;
}

function requireInfra(context: Context): EnvValues {
  context.infra ??= readInfraEnv();
  if (!context.infra) {
    throw new BootstrapError('infra/docker/.env yok.', '`env` adımını çalıştırın.');
  }
  return context.infra;
}

const MIN_FREE_DISK_GB = 5;

const steps: readonly Step[] = [
  {
    id: 'tools',
    title: 'Araçlar kontrol ediliyor',
    run: () => {
      const results = checkTools();
      for (const tool of results) {
        if (tool.ok) log.ok(`${tool.name} ${tool.found}`);
        else
          log.fail(
            `${tool.name}: bulunan ${tool.found}, gereken ${tool.required}\n      → ${tool.hint}`,
          );
      }
      const free = freeDiskGb();
      if (free < MIN_FREE_DISK_GB) {
        log.warn(
          `Diskte ${free.toFixed(1)} GB boş alan var; en az ${String(MIN_FREE_DISK_GB)} GB önerilir.`,
        );
      }
      const failed = results.filter((tool) => !tool.ok);
      if (failed.length > 0) {
        throw new BootstrapError(
          `${String(failed.length)} araç eksik veya sürümü uyumsuz.`,
          'Yukarıdaki komutlarla kurup yeni bir terminalde `pnpm bootstrap` komutunu tekrar çalıştırın.',
        );
      }
      return Promise.resolve();
    },
  },
  {
    id: 'install',
    title: 'Bağımlılıklar kuruluyor',
    run: async () => {
      try {
        await run('pnpm', ['install', '--frozen-lockfile']);
      } catch (error) {
        throw new BootstrapError(
          'pnpm install başarısız oldu.',
          'pnpm-lock.yaml package.json dosyalarıyla uyumsuzsa `pnpm install` çalıştırıp kilit dosyasını commit edin.',
          { cause: error },
        );
      }
    },
  },
  {
    id: 'env',
    title: 'Yerel ortam dosyaları hazırlanıyor',
    run: (context) => {
      const infra = ensureInfraEnv();
      context.infra = infra.values;
      if (infra.created && databaseVolumeExists()) {
        // New random credentials cannot open a database initialized with the old ones.
        throw new BootstrapError(
          "infra/docker/.env yeniden oluşturuldu ama eski bir veritabanı volume'u duruyor; parolalar eşleşmez.",
          'Yerel verileri silip baştan kurmak için: pnpm infra:reset --yes && pnpm bootstrap',
        );
      }
      log.ok(
        `infra/docker/.env ${infra.created ? 'oluşturuldu' : 'güncel'}${infra.added.length > 0 ? ` (eklenen: ${infra.added.join(', ')})` : ''}`,
      );
      for (const file of APP_ENV_FILES) {
        const result = ensureAppEnv(file, infra.values);
        const details = [
          result.added.length > 0 ? `eklenen: ${result.added.join(', ')}` : '',
          result.updated.length > 0 ? `eşitlenen: ${result.updated.join(', ')}` : '',
        ].filter(Boolean);
        log.ok(
          `${file.targetPath} ${result.created ? 'oluşturuldu' : 'güncel'}${details.length > 0 ? ` (${details.join('; ')})` : ''}`,
        );
      }
      log.info('Değerler dosyalara yazıldı; hiçbiri ekrana basılmaz.');
      return Promise.resolve();
    },
  },
  {
    id: 'docker',
    title: 'Docker servisleri başlatılıyor',
    run: async (context) => {
      requireInfra(context);
      try {
        await compose(['up', '--detach', '--wait', '--wait-timeout', '180']);
      } catch (error) {
        throw new BootstrapError(
          'Docker servisleri sağlıklı başlamadı.',
          'Port çakışması için infra/docker/.env içindeki *_PORT değerlerini değiştirin; ayrıntı için `pnpm infra:logs`.',
          { cause: error },
        );
      }
      log.ok('postgres, redis ve anvil çalışıyor');
    },
  },
  {
    id: 'db',
    title: 'Veritabanı hazırlanıyor',
    run: async () => {
      try {
        await run('pnpm', ['--filter', '@yazesim/database', 'db:migrate'], { quiet: true });
      } catch (error) {
        const output = error instanceof CommandError ? error.output : '';
        const authFailed = /P1000|password authentication failed/iu.test(output);
        throw new BootstrapError(
          authFailed
            ? 'Veritabanı parolası reddedildi: volume farklı bir parolayla oluşturulmuş.'
            : 'Migrasyonlar uygulanamadı.',
          authFailed
            ? 'Yerel verileri silip baştan kurmak için: pnpm infra:reset --yes && pnpm bootstrap'
            : 'Ayrıntı aşağıda; veritabanının çalıştığını `pnpm infra:logs postgres` ile kontrol edin.',
          { cause: error },
        );
      }
      await run('pnpm', ['--filter', '@yazesim/database', 'db:generate'], { quiet: true });
      log.ok('Migrasyonlar güncel, veritabanı istemcisi üretildi');
    },
  },
  {
    id: 'chain',
    title: 'Yerel zincire sahte NoR yayınlanıyor',
    run: async (context) => {
      const infra = requireInfra(context);
      const url = rpcUrl(infra);
      const chainId = await rpcChainId(url);
      if (chainId !== LOCAL_CHAIN_ID) {
        throw new BootstrapError(
          `Anvil beklenen zincir kimliğini (${String(LOCAL_CHAIN_ID)}) değil ${String(chainId)} döndürdü.`,
        );
      }
      log.ok(`Anvil hazır (chainId ${String(LOCAL_CHAIN_ID)}, hardfork cancun)`);
      try {
        // A plain `git clone` leaves lib/forge-std empty; forge needs it. No-op when present.
        await run('git', ['submodule', 'update', '--init', '--recursive'], { quiet: true });
      } catch (error) {
        throw new BootstrapError(
          'Kontrat kütüphanesi (forge-std alt modülü) alınamadı.',
          'İnternet bağlantısını kontrol edip `git submodule update --init --recursive` çalıştırın.',
          { cause: error },
        );
      }
      // Loaded here: it needs viem, which the install step provides.
      const { ensureMockNoR } = await import('./lib/mock-nor.ts');
      const current = readEnvFile('apps/api/.env')?.NOR_TOKEN_ADDRESS;
      let result;
      try {
        result = await ensureMockNoR(url, current);
      } catch (error) {
        throw new BootstrapError(
          'Sahte NoR yerel zincire yayınlanamadı.',
          'Zinciri baştan kurmak için: pnpm infra:reset --yes && pnpm bootstrap',
          { cause: error },
        );
      }
      log.ok(`Sahte NoR ${result.deployed ? 'yayınlandı' : 'zaten yayında'}: ${result.address}`);
      for (const file of APP_ENV_FILES.filter((f) => f.app === 'api' || f.app === 'worker')) {
        ensureAppEnv(file, infra, { norTokenAddress: result.address });
      }
      log.ok('NOR_TOKEN_ADDRESS apps/api/.env ve apps/worker/.env dosyalarına yazıldı');
    },
  },
];

function parseList(flag: string): Set<string> | null {
  const arg = process.argv.slice(2).find((value) => value.startsWith(`--${flag}=`));
  if (arg === undefined) return null;
  return new Set(
    arg
      .slice(flag.length + 3)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function selectSteps(): readonly Step[] {
  const only = parseList('only');
  const skip = parseList('skip') ?? new Set<string>();
  const known = new Set(steps.map((step) => step.id));
  for (const id of [...(only ?? []), ...skip]) {
    if (!known.has(id)) {
      throw new BootstrapError(
        `Bilinmeyen adım: ${id}`,
        `Geçerli adımlar: ${[...known].join(', ')}`,
      );
    }
  }
  return steps.filter((step) => (only === null || only.has(step.id)) && !skip.has(step.id));
}

function printSummary(infra: EnvValues | null): void {
  log.title('Kurulum tamamlandı');
  const rows = [
    ['Web', 'http://localhost:3200'],
    ['API', 'http://localhost:4200/api/v1/saglik'],
    ['İşçi', 'http://localhost:4210/saglik'],
    ['Anvil RPC', infra ? rpcUrl(infra) : 'http://127.0.0.1:8546'],
    ['Sahte NoR', readEnvFile('apps/api/.env')?.NOR_TOKEN_ADDRESS ?? '—'],
  ];
  for (const [name, url] of rows) log.info(`${(name ?? '').padEnd(12)} ${url ?? ''}`);
  log.info('\nSıradaki komut:  pnpm dev');
}

async function main(): Promise<void> {
  const selected = selectSteps();
  log.title('YazeSim — yerel kurulum');
  const context: Context = { infra: null };
  for (const [index, step] of selected.entries()) {
    log.step(index + 1, selected.length, step.title);
    await step.run(context);
  }
  printSummary(context.infra ?? readInfraEnv());
}

try {
  await main();
} catch (error) {
  if (error instanceof BootstrapError) {
    log.fail(error.message);
    if (error.hint) log.info(`→ ${error.hint}`);
    if (error.cause instanceof CommandError) {
      if (error.cause.output) log.info(error.cause.output.slice(-2000));
    } else if (error.cause instanceof Error) {
      log.info(error.cause.message);
    }
  } else if (error instanceof CommandError) {
    log.fail(error.message);
    if (error.output) log.info(error.output.slice(-2000));
  } else {
    log.fail(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}
