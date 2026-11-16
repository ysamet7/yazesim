/** Checks that every tool `pnpm bootstrap` needs is installed at a supported version. */
import { statfsSync } from 'node:fs';
import { capture } from './exec.ts';
import { REPO_ROOT } from './paths.ts';
import {
  compareVersions,
  formatVersion,
  parseNodeRange,
  parseVersion,
  readRootManifest,
  readToolchain,
  type Version,
} from './versions.ts';

export interface ToolStatus {
  readonly name: string;
  readonly ok: boolean;
  readonly found: string;
  readonly required: string;
  /** Turkish, actionable instruction shown when the check fails. */
  readonly hint: string;
}

const platform = process.platform;

function installHint(windows: string, mac: string, linux: string): string {
  if (platform === 'win32') return windows;
  if (platform === 'darwin') return mac;
  return linux;
}

function versionOf(command: string, args: readonly string[]): Version | null {
  const result = capture(command, args);
  return result.ok ? parseVersion(`${result.stdout}\n${result.stderr}`) : null;
}

function exact(name: string, found: Version | null, required: string, hint: string): ToolStatus {
  const requiredVersion = parseVersion(required);
  const ok =
    found !== null && requiredVersion !== null && compareVersions(found, requiredVersion) === 0;
  return { name, ok, found: found ? formatVersion(found) : 'yok', required, hint };
}

function atLeast(name: string, found: Version | null, minimum: Version, hint: string): ToolStatus {
  const ok = found !== null && compareVersions(found, minimum) >= 0;
  return {
    name,
    ok,
    found: found ? formatVersion(found) : 'yok',
    required: `>= ${formatVersion(minimum)}`,
    hint,
  };
}

export function checkTools(): ToolStatus[] {
  const toolchain = readToolchain();
  const manifest = readRootManifest();
  const nodeRange = parseNodeRange(manifest.engines.node);
  const pnpmRequired = manifest.packageManager.replace(/^pnpm@/u, '');

  const node = parseVersion(process.versions.node);
  const nodeOk =
    node !== null &&
    compareVersions(node, nodeRange.min) >= 0 &&
    node[0] < nodeRange.maxMajorExclusive;

  const dockerDaemon = capture('docker', ['version', '--format', '{{.Server.Version}}']);
  const compose = versionOf('docker', ['compose', 'version', '--short']);

  return [
    {
      name: 'Node.js',
      ok: nodeOk,
      found: process.versions.node,
      required: manifest.engines.node,
      hint: `Node.js ${toolchain.node} LTS kurun (https://nodejs.org) veya nvm/fnm ile: nvm install ${toolchain.node}`,
    },
    exact(
      'pnpm',
      versionOf('pnpm', ['--version']),
      pnpmRequired,
      `pnpm sürümü package.json'daki packageManager alanından otomatik seçilir. Kurulum: npm install --global pnpm@${pnpmRequired}`,
    ),
    atLeast(
      'Git',
      versionOf('git', ['--version']),
      [2, 40, 0],
      installHint(
        'winget install --id Git.Git -e',
        'brew install git',
        'https://git-scm.com/download/linux',
      ),
    ),
    {
      name: 'Docker (servis çalışıyor mu)',
      ok: dockerDaemon.ok && dockerDaemon.stdout !== '',
      found: dockerDaemon.ok ? dockerDaemon.stdout : 'çalışmıyor veya yok',
      required: 'çalışan Docker servisi',
      hint: installHint(
        'Docker Desktop kurun ve açın: winget install --id Docker.DockerDesktop -e',
        'Docker Desktop kurun ve açın: brew install --cask docker',
        'Docker Engine kurun ve başlatın: https://docs.docker.com/engine/install/',
      ),
    },
    atLeast(
      'Docker Compose',
      compose,
      [2, 24, 0],
      'Docker Desktop veya docker-compose-plugin güncelleyin.',
    ),
    exact(
      'Foundry (forge)',
      versionOf('forge', ['--version']),
      toolchain.foundry,
      `Foundry kurun ve sürümü sabitleyin: curl -L https://foundry.paradigm.xyz | bash && foundryup --install v${toolchain.foundry}` +
        (platform === 'win32' ? ' (Windows: Git Bash içinde çalıştırın)' : ''),
    ),
    atLeast(
      'gitleaks',
      versionOf('gitleaks', ['version']),
      [8, 19, 0],
      installHint(
        'winget install --id Gitleaks.Gitleaks -e',
        'brew install gitleaks',
        'https://github.com/gitleaks/gitleaks#installing',
      ),
    ),
  ];
}

/** Free disk space on the volume that holds the repository, in gigabytes. */
export function freeDiskGb(): number {
  const stats = statfsSync(REPO_ROOT);
  return (stats.bavail * stats.bsize) / 1024 ** 3;
}
