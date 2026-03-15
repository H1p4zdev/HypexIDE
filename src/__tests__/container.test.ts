import { HypexContainer } from '../container/HypexContainer';
import type { ContainerConfig } from '../types';

const TEST_CONFIG: ContainerConfig = {
  bundle: 'minimal',
  rootPath: '/tmp/test-rootfs',
  env: { HOME: '/root', USER: 'root', PATH: '/bin' },
  mounts: [],
  uid: 0,
  gid: 0,
};

describe('HypexContainer', () => {
  let container: HypexContainer;

  beforeEach(() => {
    container = new HypexContainer(TEST_CONFIG);
  });

  describe('Initialization', () => {
    it('starts with uninitialized status', () => {
      expect(container.getStatus()).toBe('uninitialized');
    });

    it('reaches running status after initialize()', async () => {
      await container.initialize();
      expect(container.getStatus()).toBe('running');
    });

    it('calls status listeners on state transitions', async () => {
      const transitions: string[] = [];
      container.onStatusChange((s) => transitions.push(s));
      await container.initialize();
      expect(transitions).toEqual(['downloading', 'extracting', 'running']);
    });
  });

  describe('Virtual FileSystem', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('reads /proc/version', () => {
      const content = container.readFile('/proc/version');
      expect(content).not.toBeNull();
      const text = new TextDecoder().decode(content!);
      expect(text).toContain('Linux');
    });

    it('reads /etc/hostname', () => {
      const content = container.readFile('/etc/hostname');
      const text = new TextDecoder().decode(content!);
      expect(text).toBe('hypex-container');
    });

    it('writes and reads files', () => {
      container.writeFile('/tmp/test.txt', 'hello world');
      const content = container.readFile('/tmp/test.txt');
      expect(content).not.toBeNull();
      expect(new TextDecoder().decode(content!)).toBe('hello world');
    });

    it('creates directories', () => {
      container.createDirectory('/tmp/newdir');
      const listing = container.listDirectory('/tmp');
      expect(listing).toContain('newdir');
    });

    it('lists /etc directory', () => {
      const listing = container.listDirectory('/etc');
      expect(listing).toContain('hostname');
      expect(listing).toContain('os-release');
    });
  });

  describe('Path Translation', () => {
    it('translates virtual paths to host paths', () => {
      const hostPath = container.translatePath('/root');
      expect(hostPath).toBe('/tmp/test-rootfs/root');
    });

    it('normalizes paths correctly', () => {
      const hostPath = container.translatePath('/root/../etc/passwd');
      expect(hostPath).toBe('/tmp/test-rootfs/etc/passwd');
    });
  });

  describe('Syscall Interception', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('intercepts getpid syscall (nr=39)', () => {
      const result = container.interceptSyscall(39, {});
      expect(result).not.toBeNull();
      expect(result!.returnValue).toBe(1);
    });

    it('intercepts getuid syscall (nr=102)', () => {
      const result = container.interceptSyscall(102, {});
      expect(result!.returnValue).toBe(0);
    });

    it('intercepts mkdir syscall (nr=83)', () => {
      const result = container.interceptSyscall(83, { path: '/tmp/syscall-test', mode: 0o755 });
      expect(result!.returnValue).toBe(0);
    });

    it('returns null for unregistered syscalls', () => {
      const result = container.interceptSyscall(9999, {});
      expect(result).toBeNull();
    });
  });

  describe('Process Management', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('executes echo command', async () => {
      const result = await container.execute('echo', ['hello'], {});
      expect(result.stdout).toBe('hello\n');
      expect(result.exitCode).toBe(0);
    });

    it('returns exitCode 127 for unknown commands', async () => {
      const result = await container.execute('nonexistent-command', [], {});
      expect(result.exitCode).toBe(127);
      expect(result.stderr).toContain('command not found');
    });

    it('throws when container is not running', async () => {
      const stopped = new HypexContainer(TEST_CONFIG);
      await expect(stopped.execute('echo', ['test'])).rejects.toThrow('not running');
    });
  });

  describe('Mount Management', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('mounts are set up during initialization', () => {
      const mounts = container.getMounts();
      expect(mounts.length).toBeGreaterThan(0);
      expect(mounts.some((m) => m.target === '/proc')).toBe(true);
    });

    it('can add additional mounts', () => {
      container.mount({
        source: '/host/projects',
        target: '/root/projects',
        type: 'bind',
      });
      const mounts = container.getMounts();
      expect(mounts.some((m) => m.target === '/root/projects')).toBe(true);
    });

    it('can unmount', () => {
      container.mount({ source: 'tmp', target: '/tmp/extra', type: 'tmpfs' });
      const success = container.unmount('/tmp/extra');
      expect(success).toBe(true);
      expect(container.getMounts().some((m) => m.target === '/tmp/extra')).toBe(false);
    });
  });

  describe('Stop', () => {
    it('stops the container', async () => {
      await container.initialize();
      await container.stop();
      expect(container.getStatus()).toBe('stopped');
    });
  });
});
