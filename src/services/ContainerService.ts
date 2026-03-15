// ─── ContainerService ─────────────────────────────────────────────────────────
// High-level facade over HypexContainer (PRoot-based Linux container).
// Handles lifecycle, bundle management, terminal sessions, and build tasks.

import type {
  ContainerStatus,
  ContainerConfig,
  RootFSBundle,
  TerminalEntry,
} from '../types';
import { getContainer, HypexContainer } from '../container/HypexContainer';

// ── Bundle download/extract progress ─────────────────────────────────────────

export interface BundleProgress {
  phase: 'idle' | 'downloading' | 'extracting' | 'verifying' | 'done' | 'error';
  loaded: number;   // bytes or entries processed
  total: number;    // total bytes or entries
  percent: number;  // 0-100
  error?: string;
}

// ── Build / run task result ───────────────────────────────────────────────────

export interface TaskResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

// ── ContainerService class ────────────────────────────────────────────────────

export class ContainerService {
  private container: HypexContainer;
  private _statusListeners: Array<(status: ContainerStatus) => void> = [];
  private _outputListeners: Array<(entry: TerminalEntry) => void> = [];
  private _progressListeners: Array<(progress: BundleProgress) => void> = [];
  private _currentBundle: RootFSBundle = 'minimal';

  constructor() {
    this.container = getContainer();
    // Bridge container status/output callbacks to our listeners
    this.container.addStatusListener(s => this._statusListeners.forEach(l => l(s)));
    this.container.addOutputListener(e => this._outputListeners.forEach(l => l(e)));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /** Start the container with the requested bundle.
   *  Downloads and extracts the root filesystem if not already cached. */
  async start(bundle: RootFSBundle = 'minimal'): Promise<void> {
    this._currentBundle = bundle;
    const config = this.buildConfig(bundle);
    await this.container.initialize(config);
  }

  /** Stop the container and release all resources. */
  async stop(): Promise<void> {
    await this.container.stop();
  }

  /** Return current container status. */
  get status(): ContainerStatus {
    return this.container.status;
  }

  /** Whether the container is in a usable state. */
  get isRunning(): boolean {
    return this.container.status === 'running';
  }

  /** The active root filesystem bundle. */
  get bundle(): RootFSBundle {
    return this._currentBundle;
  }

  // ── Bundle management ─────────────────────────────────────────────────────────

  /** Switch to a different root filesystem bundle (restarts container). */
  async switchBundle(bundle: RootFSBundle): Promise<void> {
    if (bundle === this._currentBundle && this.isRunning) return;
    await this.stop();
    await this.start(bundle);
  }

  /** Download a bundle tarball and report progress. */
  async downloadBundle(
    bundle: RootFSBundle,
    onProgress?: (p: BundleProgress) => void,
  ): Promise<void> {
    const BUNDLE_URLS: Record<RootFSBundle, string> = {
      minimal: 'https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/aarch64/alpine-minirootfs-3.19.1-aarch64.tar.gz',
      standard: 'https://dl.hypex.dev/rootfs/alpine-standard-latest.tar.gz',
      development: 'https://dl.hypex.dev/rootfs/alpine-development-latest.tar.gz',
    };
    const url = BUNDLE_URLS[bundle];
    const progress: BundleProgress = { phase: 'downloading', loaded: 0, total: 0, percent: 0 };

    const notify = (p: Partial<BundleProgress>) => {
      Object.assign(progress, p);
      onProgress?.(progress);
      this._progressListeners.forEach(l => l(progress));
    };

    notify({ phase: 'downloading' });

    try {
      // Try expo-file-system download with progress callback
      const efs = await import('expo-file-system');
      const cacheDir = efs.cacheDirectory ?? '/tmp/';
      const destPath = `${cacheDir}hypex-${bundle}.tar.gz`;

      const downloadResumable = efs.createDownloadResumable(
        url,
        destPath,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const total = totalBytesExpectedToWrite ?? 0;
          const loaded = totalBytesWritten;
          notify({
            phase: 'downloading',
            loaded,
            total,
            percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
          });
        },
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || result.status !== 200) {
        throw new Error(`Download failed with status ${result?.status}`);
      }

      notify({ phase: 'extracting', loaded: 0, total: 0, percent: 0 });
      // Actual tar extraction would happen via a native module; simulate here
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      notify({ phase: 'verifying', percent: 95 });
      await new Promise<void>(resolve => setTimeout(resolve, 200));
      notify({ phase: 'done', percent: 100 });
    } catch (err: any) {
      notify({ phase: 'error', error: err?.message ?? String(err) });
      throw err;
    }
  }

  // ── Command execution ─────────────────────────────────────────────────────────

  /** Run a command inside the container, returning buffered output. */
  async exec(
    command: string,
    opts: {
      cwd?: string;
      env?: Record<string, string>;
      timeoutMs?: number;
      onOutput?: (line: string) => void;
    } = {},
  ): Promise<TaskResult> {
    if (!this.isRunning) throw new Error('Container is not running');

    const startTime = Date.now();
    const stdout: string[] = [];
    const stderr: string[] = [];

    // Subscribe to output for this execution window
    const unsub = this.container.addOutputListener((entry) => {
      if (entry.type === 'output') {
        stdout.push(entry.content);
        opts.onOutput?.(entry.content);
      } else if (entry.type === 'error') {
        stderr.push(entry.content);
      }
    });

    let exitCode = 0;
    try {
      const result = await withTimeout(
        this.container.execute(command, { cwd: opts.cwd, env: opts.env }),
        opts.timeoutMs ?? 30_000,
        `Command timed out after ${opts.timeoutMs ?? 30_000}ms: ${command}`,
      );
      exitCode = result.exitCode;
    } finally {
      unsub();
    }

    return {
      exitCode,
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n'),
      durationMs: Date.now() - startTime,
    };
  }

  // ── Language runners ──────────────────────────────────────────────────────────

  /** Run a Python script. Returns TaskResult. */
  async runPython(
    scriptPath: string,
    args: string[] = [],
    opts: { cwd?: string; onOutput?: (line: string) => void } = {},
  ): Promise<TaskResult> {
    const argv = [scriptPath, ...args].map(shellescape).join(' ');
    return this.exec(`python3 ${argv}`, opts);
  }

  /** Run a Node.js script. Returns TaskResult. */
  async runNode(
    scriptPath: string,
    args: string[] = [],
    opts: { cwd?: string; onOutput?: (line: string) => void } = {},
  ): Promise<TaskResult> {
    const argv = [scriptPath, ...args].map(shellescape).join(' ');
    return this.exec(`node ${argv}`, opts);
  }

  /** Compile and run a C file. Returns TaskResult. */
  async runC(
    sourcePath: string,
    opts: { cwd?: string; onOutput?: (line: string) => void } = {},
  ): Promise<TaskResult> {
    const outPath = sourcePath.replace(/\.c$/, '');
    const compile = await this.exec(`gcc ${shellescape(sourcePath)} -o ${shellescape(outPath)}`, opts);
    if (compile.exitCode !== 0) return compile;
    return this.exec(shellescape(outPath), opts);
  }

  /** Run shell script. */
  async runShell(
    scriptPath: string,
    opts: { cwd?: string; onOutput?: (line: string) => void } = {},
  ): Promise<TaskResult> {
    return this.exec(`sh ${shellescape(scriptPath)}`, opts);
  }

  // ── Package management helpers ────────────────────────────────────────────────

  /** Install Alpine packages via apk. */
  async apkAdd(packages: string[], onOutput?: (line: string) => void): Promise<TaskResult> {
    return this.exec(`apk add --no-cache ${packages.map(shellescape).join(' ')}`, { onOutput });
  }

  /** Install Python packages via pip. */
  async pipInstall(packages: string[], onOutput?: (line: string) => void): Promise<TaskResult> {
    return this.exec(`pip3 install ${packages.map(shellescape).join(' ')}`, { onOutput });
  }

  /** Install Node packages via npm. */
  async npmInstall(
    packages: string[],
    cwd?: string,
    onOutput?: (line: string) => void,
  ): Promise<TaskResult> {
    const pkgs = packages.length > 0 ? packages.map(shellescape).join(' ') : '';
    return this.exec(pkgs ? `npm install ${pkgs}` : 'npm install', { cwd, onOutput });
  }

  // ── VFS file access ────────────────────────────────────────────────────────────

  /** Read a file from the container's virtual filesystem. */
  readVfsFile(path: string): string | null {
    return this.container.readFile(path);
  }

  /** Write a file to the container's virtual filesystem. */
  writeVfsFile(path: string, content: string): void {
    this.container.writeFile(path, content);
  }

  /** Mount a real (expo-file-system) path into the container. */
  async mount(hostPath: string, containerPath: string): Promise<void> {
    await this.container.mount(hostPath, containerPath);
  }

  /** Unmount a path from the container. */
  async unmount(containerPath: string): Promise<void> {
    await this.container.unmount(containerPath);
  }

  // ── Observer / event API ──────────────────────────────────────────────────────

  /** Subscribe to status changes. Returns unsubscribe function. */
  addStatusListener(listener: (status: ContainerStatus) => void): () => void {
    this._statusListeners.push(listener);
    return () => {
      this._statusListeners = this._statusListeners.filter(l => l !== listener);
    };
  }

  /** Subscribe to terminal output from the container. Returns unsubscribe function. */
  addOutputListener(listener: (entry: TerminalEntry) => void): () => void {
    this._outputListeners.push(listener);
    return () => {
      this._outputListeners = this._outputListeners.filter(l => l !== listener);
    };
  }

  /** Subscribe to bundle download/extract progress. Returns unsubscribe function. */
  addProgressListener(listener: (progress: BundleProgress) => void): () => void {
    this._progressListeners.push(listener);
    return () => {
      this._progressListeners = this._progressListeners.filter(l => l !== listener);
    };
  }

  // ── System info ───────────────────────────────────────────────────────────────

  /** Return a snapshot of container metrics. */
  async systemInfo(): Promise<{
    status: ContainerStatus;
    bundle: RootFSBundle;
    uptime?: number;
    memInfo?: string;
    kernelVersion?: string;
  }> {
    const memInfo = this.readVfsFile('/proc/meminfo') ?? undefined;
    const kernelVersion = this.readVfsFile('/proc/version') ?? undefined;
    return {
      status: this.status,
      bundle: this._currentBundle,
      memInfo,
      kernelVersion,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private buildConfig(bundle: RootFSBundle): ContainerConfig {
    return {
      bundle,
      rootPath: `/data/hypex/rootfs/${bundle}`,
      uid: 0,
      gid: 0,
      env: {
        PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        HOME: '/root',
        TERM: 'xterm-256color',
        LANG: 'en_US.UTF-8',
        HYPEX_VERSION: '1.0.0',
      },
      mounts: [
        { source: 'proc', target: '/proc', type: 'proc' },
        { source: 'sysfs', target: '/sys', type: 'sys' },
        { source: 'devtmpfs', target: '/dev', type: 'dev' },
        { source: 'tmpfs', target: '/tmp', type: 'tmpfs' },
      ],
    };
  }
}

// ── Timeout helper ─────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

// ── Shell escape ──────────────────────────────────────────────────────────────

function shellescape(arg: string): string {
  // Single-quote everything; escape embedded single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: ContainerService | null = null;

export function getContainerService(): ContainerService {
  if (!_instance) {
    _instance = new ContainerService();
  }
  return _instance;
}

export function resetContainerService(): void {
  _instance = null;
}
