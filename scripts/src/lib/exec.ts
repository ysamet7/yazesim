import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { REPO_ROOT } from './paths.ts';

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  /** Capture output instead of streaming it to the terminal. */
  readonly quiet?: boolean;
  /** Text written to the command's standard input (`capture` only); never part of argv. */
  readonly input?: string;
}

export class CommandError extends Error {
  readonly exitCode: number | null;
  readonly output: string;

  constructor(command: string, exitCode: number | null, output: string) {
    super(`"${command}" failed with exit code ${String(exitCode)}`);
    this.name = 'CommandError';
    this.exitCode = exitCode;
    this.output = output;
  }
}

interface Resolved {
  readonly file: string;
  readonly args: readonly string[];
  readonly shell: boolean;
}

/**
 * Resolves how to start a command portably. Windows cannot spawn `.cmd` shims
 * without a shell, so pnpm is started through the executable that is running
 * this script (`npm_execpath`) when available. Arguments are always fixed
 * strings from this repository, never user input.
 */
function resolve(command: string, args: readonly string[]): Resolved {
  if (command === 'pnpm') {
    const execPath = process.env.npm_execpath;
    if (execPath && path.basename(execPath).toLowerCase().startsWith('pnpm')) {
      return /\.(c|m)?js$/u.test(execPath)
        ? { file: process.execPath, args: [execPath, ...args], shell: false }
        : { file: execPath, args, shell: false };
    }
    return { file: 'pnpm', args, shell: process.platform === 'win32' };
  }
  return { file: command, args, shell: false };
}

/** Runs a command and resolves with its captured output when it exits with code 0. */
export function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): Promise<string> {
  const resolved = resolve(command, args);
  const label = [command, ...args].join(' ');
  const quiet = options.quiet === true;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(resolved.file, resolved.args, {
      cwd: options.cwd ?? REPO_ROOT,
      env: options.env ?? process.env,
      shell: resolved.shell,
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new CommandError(label, null, error.message));
    });
    child.on('close', (code) => {
      if (code === 0) resolvePromise(output);
      else reject(new CommandError(label, code, output));
    });
  });
}

export interface CaptureResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly stderr: string;
}

/** Runs a short command synchronously and captures its output (for version checks). */
export function capture(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): CaptureResult {
  const resolved = resolve(command, args);
  const result = spawnSync(resolved.file, resolved.args, {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    shell: resolved.shell,
    encoding: 'utf8',
    timeout: 30_000,
    ...(options.input === undefined ? {} : { input: options.input }),
  });
  // stdout/stderr are null when the executable could not be started at all.
  const stdout = result.stdout as string | null;
  const stderr = result.stderr as string | null;
  return {
    ok: result.status === 0,
    stdout: stdout?.trim() ?? '',
    stderr: stderr?.trim() ?? '',
  };
}
