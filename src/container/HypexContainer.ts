import type {
  ContainerConfig,
  ContainerStatus,
  Process,
  MountPoint,
  RootFSBundle,
  SyscallInterception,
  SyscallArgs,
  SyscallResult,
} from '../types';
import { CONTAINER } from '../constants';

// ─── Virtual FileSystem ───────────────────────────────────────────────────────
class VirtualFileSystem {
  private inodes: Map<string, { type: 'file' | 'dir'; content?: Uint8Array; mode: number }>;

  constructor() {
    this.inodes = new Map();
    this.initializeRootFS();
  }

  private initializeRootFS() {
    // Create virtual directories
    const dirs = [
      CONTAINER.VIRTUAL_FS.PROC,
      CONTAINER.VIRTUAL_FS.SYS,
      CONTAINER.VIRTUAL_FS.DEV,
      CONTAINER.VIRTUAL_FS.TMP,
      CONTAINER.VIRTUAL_FS.HOME,
      CONTAINER.VIRTUAL_FS.ETC,
      CONTAINER.VIRTUAL_FS.USR,
      CONTAINER.VIRTUAL_FS.BIN,
      CONTAINER.VIRTUAL_FS.LIB,
      '/usr/local',
      '/usr/local/bin',
      '/dev/pts',
      '/dev/shm',
    ];

    for (const dir of dirs) {
      this.inodes.set(dir, { type: 'dir', mode: 0o755 });
    }

    // Create virtual proc entries
    this.writeFile('/proc/version', 'Linux version 5.15.0-hypex (hypex@build) (gcc version 12.2.0) #1 SMP');
    this.writeFile('/proc/cpuinfo', 'processor\t: 0\nmodel name\t: ARM Cortex-A55\n');
    this.writeFile('/proc/meminfo', 'MemTotal:\t 4096000 kB\nMemFree:\t 2048000 kB\n');
    this.writeFile('/proc/uptime', '0.00 0.00');
    this.writeFile('/etc/hostname', 'hypex-container');
    this.writeFile('/etc/os-release',
      'NAME="Alpine Linux"\nVERSION_ID="3.19.0"\nID=alpine\nPRETTY_NAME="Alpine Linux v3.19"\n'
    );
    this.writeFile('/etc/passwd', 'root:x:0:0:root:/root:/bin/ash\n');
    this.writeFile('/etc/group', 'root:x:0:\n');
    this.writeFile('/etc/shadow', 'root:::0:::::\n');
    this.writeFile('/etc/profile', 'export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin\nexport HOME=/root\n');
    this.writeFile('/root/.bashrc', '# Hypex container bash config\nexport PS1="\\u@hypex:\\w$ "\nalias ll="ls -la"\nalias la="ls -a"\n');
  }

  writeFile(path: string, content: string): void {
    const encoder = new TextEncoder();
    this.inodes.set(path, {
      type: 'file',
      content: encoder.encode(content),
      mode: 0o644,
    });
  }

  readFile(path: string): Uint8Array | null {
    const inode = this.inodes.get(path);
    if (!inode || inode.type !== 'file') return null;
    return inode.content ?? new Uint8Array();
  }

  exists(path: string): boolean {
    return this.inodes.has(path);
  }

  isDirectory(path: string): boolean {
    return this.inodes.get(path)?.type === 'dir';
  }

  listDirectory(path: string): string[] {
    const prefix = path.endsWith('/') ? path : path + '/';
    const entries: string[] = [];
    for (const key of this.inodes.keys()) {
      if (key !== path && key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        if (!rest.includes('/')) {
          entries.push(rest);
        }
      }
    }
    return entries;
  }

  createDirectory(path: string, mode = 0o755): void {
    this.inodes.set(path, { type: 'dir', mode });
  }

  delete(path: string): boolean {
    return this.inodes.delete(path);
  }

  chmod(path: string, mode: number): boolean {
    const inode = this.inodes.get(path);
    if (!inode) return false;
    inode.mode = mode;
    return true;
  }

  stat(path: string): { size: number; mode: number; isDir: boolean } | null {
    const inode = this.inodes.get(path);
    if (!inode) return null;
    return {
      size: inode.content?.length ?? 0,
      mode: inode.mode,
      isDir: inode.type === 'dir',
    };
  }
}

// ─── Path Translator ──────────────────────────────────────────────────────────
class PathTranslator {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Translate a virtual path (/etc/hostname) to a real host path
   */
  toHost(virtualPath: string): string {
    const normalized = this.normalize(virtualPath);
    return this.rootPath + normalized;
  }

  /**
   * Translate a real host path back to virtual path
   */
  toVirtual(hostPath: string): string {
    if (hostPath.startsWith(this.rootPath)) {
      return hostPath.slice(this.rootPath.length) || '/';
    }
    return hostPath;
  }

  normalize(path: string): string {
    const parts = path.split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') resolved.pop();
      else if (part !== '.') resolved.push(part);
    }
    return '/' + resolved.join('/');
  }

  isVirtualPath(path: string): boolean {
    return path.startsWith('/proc') ||
      path.startsWith('/sys') ||
      path.startsWith('/dev');
  }
}

// ─── Syscall Interceptor ──────────────────────────────────────────────────────
class SyscallInterceptor {
  private handlers: Map<number, SyscallInterception>;
  private vfs: VirtualFileSystem;
  private translator: PathTranslator;

  // Linux syscall numbers (arm64)
  static readonly SYS_READ = 63;
  static readonly SYS_WRITE = 64;
  static readonly SYS_OPEN = 2;
  static readonly SYS_OPENAT = 257;
  static readonly SYS_CLOSE = 3;
  static readonly SYS_STAT = 4;
  static readonly SYS_FSTAT = 5;
  static readonly SYS_LSTAT = 6;
  static readonly SYS_MKDIR = 83;
  static readonly SYS_MKDIRAT = 258;
  static readonly SYS_UNLINK = 87;
  static readonly SYS_RENAME = 82;
  static readonly SYS_CHMOD = 90;
  static readonly SYS_CHOWN = 92;
  static readonly SYS_EXECVE = 59;
  static readonly SYS_MOUNT = 165;
  static readonly SYS_GETPID = 39;
  static readonly SYS_GETUID = 102;
  static readonly SYS_GETGID = 104;

  constructor(vfs: VirtualFileSystem, translator: PathTranslator) {
    this.handlers = new Map();
    this.vfs = vfs;
    this.translator = translator;
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    this.register({
      nr: SyscallInterceptor.SYS_OPEN,
      name: 'open',
      handler: (args) => this.handleOpen(args),
    });

    this.register({
      nr: SyscallInterceptor.SYS_STAT,
      name: 'stat',
      handler: (args) => this.handleStat(args),
    });

    this.register({
      nr: SyscallInterceptor.SYS_MKDIR,
      name: 'mkdir',
      handler: (args) => this.handleMkdir(args),
    });

    this.register({
      nr: SyscallInterceptor.SYS_CHMOD,
      name: 'chmod',
      handler: (args) => this.handleChmod(args),
    });

    this.register({
      nr: SyscallInterceptor.SYS_EXECVE,
      name: 'execve',
      handler: (args) => this.handleExecve(args),
    });

    this.register({
      nr: SyscallInterceptor.SYS_GETPID,
      name: 'getpid',
      handler: () => ({ returnValue: 1 }),
    });

    this.register({
      nr: SyscallInterceptor.SYS_GETUID,
      name: 'getuid',
      handler: () => ({ returnValue: 0 }),
    });

    this.register({
      nr: SyscallInterceptor.SYS_GETGID,
      name: 'getgid',
      handler: () => ({ returnValue: 0 }),
    });

    this.register({
      nr: SyscallInterceptor.SYS_MOUNT,
      name: 'mount',
      handler: (args) => this.handleMount(args),
    });
  }

  register(interception: SyscallInterception) {
    this.handlers.set(interception.nr, interception);
  }

  intercept(nr: number, args: SyscallArgs): SyscallResult | null {
    const handler = this.handlers.get(nr);
    if (!handler) return null;
    return handler.handler(args);
  }

  private handleOpen(args: SyscallArgs): SyscallResult {
    const path = args.path ?? '';
    if (this.translator.isVirtualPath(path)) {
      if (this.vfs.exists(path)) {
        return { returnValue: 3 }; // fake fd
      }
      return { returnValue: -2, error: 'ENOENT' };
    }
    return { returnValue: 0 };
  }

  private handleStat(args: SyscallArgs): SyscallResult {
    const path = args.path ?? '';
    const stat = this.vfs.stat(path);
    if (stat) {
      return { returnValue: 0, data: stat };
    }
    return { returnValue: -2, error: 'ENOENT' };
  }

  private handleMkdir(args: SyscallArgs): SyscallResult {
    const path = args.path ?? '';
    if (this.vfs.exists(path)) {
      return { returnValue: -17, error: 'EEXIST' };
    }
    this.vfs.createDirectory(path, args.mode ?? 0o755);
    return { returnValue: 0 };
  }

  private handleChmod(args: SyscallArgs): SyscallResult {
    const path = args.path ?? '';
    const success = this.vfs.chmod(path, args.mode ?? 0o644);
    return { returnValue: success ? 0 : -2 };
  }

  private handleExecve(args: SyscallArgs): SyscallResult {
    const path = args.path ?? '';
    const translatedPath = this.translator.toHost(path);
    // In real PRoot, this would invoke the binary with translated paths
    return { returnValue: 0, data: { translatedPath } };
  }

  private handleMount(args: SyscallArgs): SyscallResult {
    // Allow all mount operations in container context
    return { returnValue: 0 };
  }
}

// ─── Process Manager ──────────────────────────────────────────────────────────
class ProcessManager {
  private processes: Map<number, Process>;
  private nextPid: number;

  constructor() {
    this.processes = new Map();
    this.nextPid = 1;
  }

  spawn(command: string, args: string[], cwd: string, env: Record<string, string>): Process {
    const pid = this.nextPid++;
    const process: Process = {
      pid,
      command,
      args,
      cwd,
      env,
      status: 'running',
    };
    this.processes.set(pid, process);
    return process;
  }

  kill(pid: number, signal = 15): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    proc.status = 'stopped';
    proc.exitCode = 128 + signal;
    return true;
  }

  wait(pid: number): Promise<number> {
    return new Promise((resolve) => {
      const check = () => {
        const proc = this.processes.get(pid);
        if (!proc || proc.status !== 'running') {
          resolve(proc?.exitCode ?? 0);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  list(): Process[] {
    return Array.from(this.processes.values());
  }

  get(pid: number): Process | undefined {
    return this.processes.get(pid);
  }

  cleanup() {
    for (const [pid, proc] of this.processes) {
      if (proc.status === 'stopped') {
        this.processes.delete(pid);
      }
    }
  }
}

// ─── HypexContainer ───────────────────────────────────────────────────────────
export class HypexContainer {
  private config: ContainerConfig;
  private status: ContainerStatus;
  private vfs: VirtualFileSystem;
  private translator: PathTranslator;
  private syscallInterceptor: SyscallInterceptor;
  private processManager: ProcessManager;
  private mounts: MountPoint[];
  private statusListeners: Array<(status: ContainerStatus) => void>;
  private outputListeners: Array<(output: string) => void>;

  constructor(config: ContainerConfig) {
    this.config = config;
    this.status = 'uninitialized';
    this.vfs = new VirtualFileSystem();
    this.translator = new PathTranslator(config.rootPath);
    this.syscallInterceptor = new SyscallInterceptor(this.vfs, this.translator);
    this.processManager = new ProcessManager();
    this.mounts = [];
    this.statusListeners = [];
    this.outputListeners = [];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.setStatus('downloading');

    try {
      // In a real implementation, this would:
      // 1. Download the RootFS bundle
      // 2. Extract it to config.rootPath
      // 3. Set up bind mounts
      // 4. Initialize PRoot

      await this.simulateDownload();
      this.setStatus('extracting');
      await this.simulateExtract();
      await this.setupMounts();
      this.setStatus('running');
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  private async simulateDownload(): Promise<void> {
    // In production: fetch the RootFS bundle from CDN
    const bundle = CONTAINER.BUNDLES[this.config.bundle];
    console.log(`[HypexContainer] Downloading ${bundle.name} bundle...`);
    await new Promise((r) => setTimeout(r, 500));
  }

  private async simulateExtract(): Promise<void> {
    console.log('[HypexContainer] Extracting RootFS...');
    await new Promise((r) => setTimeout(r, 500));
  }

  private async setupMounts(): Promise<void> {
    const defaultMounts: MountPoint[] = [
      { source: 'proc', target: '/proc', type: 'proc' },
      { source: 'sysfs', target: '/sys', type: 'sys' },
      { source: 'devtmpfs', target: '/dev', type: 'dev' },
      { source: 'tmpfs', target: '/tmp', type: 'tmpfs' },
    ];

    for (const mount of [...defaultMounts, ...this.config.mounts]) {
      this.mount(mount);
    }
  }

  async stop(): Promise<void> {
    // Kill all processes
    for (const proc of this.processManager.list()) {
      this.processManager.kill(proc.pid);
    }
    // Unmount
    for (const mount of this.mounts) {
      this.unmount(mount.target);
    }
    this.setStatus('stopped');
  }

  // ── Process execution ──────────────────────────────────────────────────────

  async execute(
    command: string,
    args: string[] = [],
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (this.status !== 'running') {
      throw new Error('Container is not running');
    }

    const cwd = options.cwd ?? this.config.env.HOME ?? '/root';
    const env = { ...this.config.env, ...options.env };

    const proc = this.processManager.spawn(command, args, cwd, env);

    // Intercept execve syscall
    const result = this.syscallInterceptor.intercept(
      SyscallInterceptor.SYS_EXECVE,
      { path: command }
    );

    // Simulate command execution
    const output = await this.simulateCommand(command, args, cwd, env);
    proc.status = 'stopped';
    proc.exitCode = output.exitCode;

    this.emitOutput(output.stdout);

    return output;
  }

  private async simulateCommand(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cmd = command.split('/').pop() ?? command;

    switch (cmd) {
      case 'sh':
      case 'bash':
        return { stdout: '', stderr: '', exitCode: 0 };

      case 'echo':
        return { stdout: args.join(' ') + '\n', stderr: '', exitCode: 0 };

      case 'ls':
        return {
          stdout: this.vfs.listDirectory(cwd).join('\n') + '\n',
          stderr: '',
          exitCode: 0,
        };

      case 'pwd':
        return { stdout: cwd + '\n', stderr: '', exitCode: 0 };

      case 'cat': {
        const path = args[0] ? `${cwd}/${args[0]}` : '';
        const content = path ? this.vfs.readFile(path) : null;
        if (!content) {
          return { stdout: '', stderr: `cat: ${args[0]}: No such file\n`, exitCode: 1 };
        }
        return {
          stdout: new TextDecoder().decode(content),
          stderr: '',
          exitCode: 0,
        };
      }

      default:
        return {
          stdout: '',
          stderr: `${cmd}: command not found\n`,
          exitCode: 127,
        };
    }
  }

  // ── Mount management ───────────────────────────────────────────────────────

  mount(mountPoint: MountPoint): void {
    this.mounts.push(mountPoint);
    console.log(`[HypexContainer] Mounted ${mountPoint.source} at ${mountPoint.target}`);
  }

  unmount(target: string): boolean {
    const idx = this.mounts.findIndex((m) => m.target === target);
    if (idx < 0) return false;
    this.mounts.splice(idx, 1);
    return true;
  }

  getMounts(): MountPoint[] {
    return [...this.mounts];
  }

  // ── VFS operations ─────────────────────────────────────────────────────────

  readFile(virtualPath: string): Uint8Array | null {
    return this.vfs.readFile(virtualPath);
  }

  writeFile(virtualPath: string, content: string): void {
    this.vfs.writeFile(virtualPath, content);
  }

  createDirectory(virtualPath: string): void {
    this.vfs.createDirectory(virtualPath);
  }

  listDirectory(virtualPath: string): string[] {
    return this.vfs.listDirectory(virtualPath);
  }

  // ── Path translation ───────────────────────────────────────────────────────

  translatePath(virtualPath: string): string {
    return this.translator.toHost(virtualPath);
  }

  // ── Syscall interception ───────────────────────────────────────────────────

  registerSyscall(interception: SyscallInterception): void {
    this.syscallInterceptor.register(interception);
  }

  interceptSyscall(nr: number, args: SyscallArgs): SyscallResult | null {
    return this.syscallInterceptor.intercept(nr, args);
  }

  // ── Status & events ────────────────────────────────────────────────────────

  getStatus(): ContainerStatus {
    return this.status;
  }

  onStatusChange(listener: (status: ContainerStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  onOutput(listener: (output: string) => void): () => void {
    this.outputListeners.push(listener);
    return () => {
      this.outputListeners = this.outputListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: ContainerStatus) {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private emitOutput(output: string) {
    for (const listener of this.outputListeners) {
      listener(output);
    }
  }

  getProcesses(): Process[] {
    return this.processManager.list();
  }

  getConfig(): ContainerConfig {
    return { ...this.config };
  }
}

// ─── Container singleton factory ──────────────────────────────────────────────
let containerInstance: HypexContainer | null = null;

export function getContainer(bundle: RootFSBundle = 'standard'): HypexContainer {
  if (!containerInstance) {
    containerInstance = new HypexContainer({
      bundle,
      rootPath: '/data/user/0/com.hypex.ide/rootfs',
      env: {
        HOME: '/root',
        USER: 'root',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        TERM: 'xterm-256color',
        LANG: 'en_US.UTF-8',
        SHELL: '/bin/ash',
      },
      mounts: [],
      uid: 0,
      gid: 0,
    });
  }
  return containerInstance;
}

export function resetContainer(): void {
  containerInstance = null;
}

export default HypexContainer;
