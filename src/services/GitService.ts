// ─── GitService ────────────────────────────────────────────────────────────────
// Wraps isomorphic-git for all Git operations inside Hypex IDE.
// Falls back to container shell commands when the JS API is insufficient.

import type {
  GitStatus,
  GitFile,
  GitFileStatus,
  GitCommit,
  GitBranch,
} from '../types';

// ── isomorphic-git lazy import (optional dep) ─────────────────────────────────
// We import lazily so the app still boots even if the module isn't installed yet.
type IsomorphicGit = typeof import('isomorphic-git');
let _git: IsomorphicGit | null = null;

async function git(): Promise<IsomorphicGit> {
  if (!_git) {
    try {
      _git = await import('isomorphic-git');
    } catch {
      throw new Error('isomorphic-git is not installed. Run: npm install isomorphic-git');
    }
  }
  return _git;
}

// ── expo-file-system fs adapter ───────────────────────────────────────────────
let _fs: object | null = null;

async function fsAdapter(): Promise<object> {
  if (!_fs) {
    try {
      const { default: rnfs } = await import('isomorphic-git/http/web') as any;
      _fs = rnfs;
    } catch {
      // Minimal in-memory fs shim for environments without the adapter
      _fs = createMemoryFs();
    }
  }
  return _fs!;
}

// ── Minimal in-memory FS shim (used in tests / CI) ───────────────────────────
function createMemoryFs() {
  const store = new Map<string, string | Uint8Array>();
  return {
    promises: {
      readFile: async (path: string, opts?: { encoding?: string }) => {
        const data = store.get(path);
        if (data === undefined) { const e: any = new Error(`ENOENT: ${path}`); e.code = 'ENOENT'; throw e; }
        return opts?.encoding === 'utf8' ? data.toString() : data;
      },
      writeFile: async (path: string, data: string | Uint8Array) => { store.set(path, data); },
      unlink: async (path: string) => { store.delete(path); },
      readdir: async (path: string) => {
        const prefix = path.endsWith('/') ? path : path + '/';
        return [...store.keys()]
          .filter(k => k.startsWith(prefix) && k.slice(prefix.length).split('/').length === 1)
          .map(k => k.slice(prefix.length));
      },
      mkdir: async (_path: string) => {},
      rmdir: async (path: string) => { store.delete(path); },
      stat: async (path: string) => {
        if (!store.has(path)) { const e: any = new Error(`ENOENT: ${path}`); e.code = 'ENOENT'; throw e; }
        const data = store.get(path)!;
        return { isFile: () => true, isDirectory: () => false, size: data.toString().length, mtimeMs: Date.now(), ctimeMs: Date.now(), mode: 0o100644, ino: 0 };
      },
      lstat: async (path: string) => {
        if (!store.has(path)) { const e: any = new Error(`ENOENT: ${path}`); e.code = 'ENOENT'; throw e; }
        const data = store.get(path)!;
        return { isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false, size: data.toString().length, mtimeMs: Date.now(), ctimeMs: Date.now(), mode: 0o100644, ino: 0 };
      },
      symlink: async () => {},
      readlink: async (path: string) => { throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' }); },
    },
  };
}

// ── GitService class ──────────────────────────────────────────────────────────

export class GitService {
  private repoPath: string;
  private authorName: string;
  private authorEmail: string;

  constructor(repoPath: string, authorName = 'Hypex User', authorEmail = 'user@hypex.dev') {
    this.repoPath = repoPath;
    this.authorName = authorName;
    this.authorEmail = authorEmail;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Initialize a new git repository at repoPath. */
  async init(): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.init({ fs, dir: this.repoPath, defaultBranch: 'main' });
  }

  /** Clone a remote repository into repoPath. */
  async clone(url: string, onProgress?: (phase: string, loaded: number, total: number) => void): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    let http: any;
    try {
      http = (await import('isomorphic-git/http/web')).default;
    } catch {
      throw new Error('HTTP transport not available');
    }
    await g.clone({
      fs,
      http,
      dir: this.repoPath,
      url,
      singleBranch: true,
      depth: 1,
      onProgress: onProgress
        ? ({ phase, loaded, total }) => onProgress(phase, loaded, total ?? 0)
        : undefined,
    });
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  /** Returns the full working-tree status (staged, unstaged, untracked, branch). */
  async status(): Promise<GitStatus> {
    const g = await git();
    const fs = await fsAdapter();

    const [branch, matrix] = await Promise.all([
      g.currentBranch({ fs, dir: this.repoPath, fullname: false }).catch(() => 'HEAD'),
      g.statusMatrix({ fs, dir: this.repoPath }),
    ]);

    const staged: GitFile[] = [];
    const unstaged: GitFile[] = [];
    const untracked: string[] = [];

    for (const [filepath, head, workdir, idx] of matrix) {
      // statusMatrix codes: HEAD=0/1, workdir=0/1/2, idx=0/1/2
      const headPresent = head === 1;
      const idxPresent = idx === 1 || idx === 2;
      const workdirPresent = workdir === 1 || workdir === 2;

      // Untracked
      if (!headPresent && !idxPresent && workdirPresent) {
        untracked.push(filepath as string);
        continue;
      }

      // Staged changes (idx differs from HEAD)
      if (idx !== head) {
        let status: GitFileStatus = 'M';
        if (!headPresent && idxPresent) status = 'A';
        if (headPresent && !idxPresent) status = 'D';
        staged.push({ path: filepath as string, status });
      }

      // Unstaged changes (workdir differs from idx)
      if (workdir !== idx) {
        let status: GitFileStatus = 'M';
        if (!idxPresent && workdirPresent) status = 'A';
        if (idxPresent && !workdirPresent) status = 'D';
        unstaged.push({ path: filepath as string, status });
      }
    }

    // Ahead / behind counts require reading the remote tracking branch
    let ahead = 0;
    let behind = 0;
    try {
      const remote = await g.getRemoteInfo2({ http: null as any, url: '' }).catch(() => null);
      if (remote) {
        // isomorphic-git doesn't expose ahead/behind directly; skip for now
      }
    } catch { /* network not available */ }

    return { branch: branch ?? 'HEAD', ahead, behind, staged, unstaged, untracked };
  }

  // ── Staging ─────────────────────────────────────────────────────────────────

  /** Stage a file (git add). */
  async add(filepath: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.add({ fs, dir: this.repoPath, filepath });
  }

  /** Stage all changes. */
  async addAll(): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.add({ fs, dir: this.repoPath, filepath: '.' });
  }

  /** Unstage a file (git reset HEAD <file>). */
  async unstage(filepath: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.resetIndex({ fs, dir: this.repoPath, filepath });
  }

  /** Discard working-tree changes for a file (git checkout -- <file>). */
  async discard(filepath: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.checkout({ fs, dir: this.repoPath, filepaths: [filepath], force: true });
  }

  // ── Commits ─────────────────────────────────────────────────────────────────

  /** Create a commit with the given message. Returns the new commit hash. */
  async commit(message: string): Promise<string> {
    const g = await git();
    const fs = await fsAdapter();
    const sha = await g.commit({
      fs,
      dir: this.repoPath,
      message,
      author: { name: this.authorName, email: this.authorEmail },
    });
    return sha;
  }

  /** Amend the most recent commit message. */
  async amendCommit(message: string): Promise<string> {
    const g = await git();
    const fs = await fsAdapter();
    const sha = await g.commit({
      fs,
      dir: this.repoPath,
      message,
      author: { name: this.authorName, email: this.authorEmail },
      amend: true,
    });
    return sha;
  }

  /** Read a list of commits from HEAD. */
  async log(depth = 50): Promise<GitCommit[]> {
    const g = await git();
    const fs = await fsAdapter();
    const commits = await g.log({ fs, dir: this.repoPath, depth });
    return commits.map(({ oid, commit }) => ({
      hash: oid,
      shortHash: oid.slice(0, 7),
      message: commit.message.trim(),
      author: commit.author.name,
      email: commit.author.email,
      date: new Date(commit.author.timestamp * 1000),
      parents: commit.parent,
    }));
  }

  // ── Branches ─────────────────────────────────────────────────────────────────

  /** List all local (and remote-tracking) branches. */
  async branches(): Promise<GitBranch[]> {
    const g = await git();
    const fs = await fsAdapter();

    const [localBranches, currentBranch, remoteBranches] = await Promise.all([
      g.listBranches({ fs, dir: this.repoPath }),
      g.currentBranch({ fs, dir: this.repoPath, fullname: false }),
      g.listBranches({ fs, dir: this.repoPath, remote: 'origin' }).catch(() => [] as string[]),
    ]);

    const local: GitBranch[] = localBranches.map(name => ({
      name,
      isRemote: false,
      isCurrent: name === currentBranch,
    }));

    const remote: GitBranch[] = (remoteBranches as string[]).map(name => ({
      name: `origin/${name}`,
      isRemote: true,
      isCurrent: false,
    }));

    return [...local, ...remote];
  }

  /** Create a new branch from the current HEAD. */
  async createBranch(name: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.branch({ fs, dir: this.repoPath, ref: name });
  }

  /** Switch to an existing branch. */
  async checkout(branch: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.checkout({ fs, dir: this.repoPath, ref: branch });
  }

  /** Delete a local branch. */
  async deleteBranch(name: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    await g.deleteBranch({ fs, dir: this.repoPath, ref: name });
  }

  // ── Remote operations ────────────────────────────────────────────────────────

  /** Push the current branch to origin. */
  async push(remote = 'origin', branch?: string): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    let http: any;
    try { http = (await import('isomorphic-git/http/web')).default; }
    catch { throw new Error('HTTP transport not available'); }
    const ref = branch ?? (await g.currentBranch({ fs, dir: this.repoPath, fullname: false })) ?? 'main';
    await g.push({ fs, http, dir: this.repoPath, remote, ref });
  }

  /** Fetch from origin (does not merge). */
  async fetch(remote = 'origin'): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    let http: any;
    try { http = (await import('isomorphic-git/http/web')).default; }
    catch { throw new Error('HTTP transport not available'); }
    await g.fetch({ fs, http, dir: this.repoPath, remote });
  }

  /** Pull (fetch + merge) current branch from origin. */
  async pull(remote = 'origin'): Promise<void> {
    const g = await git();
    const fs = await fsAdapter();
    let http: any;
    try { http = (await import('isomorphic-git/http/web')).default; }
    catch { throw new Error('HTTP transport not available'); }
    const ref = (await g.currentBranch({ fs, dir: this.repoPath, fullname: false })) ?? 'main';
    await g.pull({
      fs,
      http,
      dir: this.repoPath,
      remote,
      ref,
      author: { name: this.authorName, email: this.authorEmail },
    });
  }

  // ── Diff ────────────────────────────────────────────────────────────────────

  /** Return unified diff lines for a single file (HEAD vs working tree). */
  async diff(filepath: string): Promise<Array<{ type: 'add' | 'remove' | 'context'; line: string }>> {
    const g = await git();
    const fs = await fsAdapter();

    let headContent = '';
    try {
      const blob = await g.readBlob({
        fs,
        dir: this.repoPath,
        oid: await g.resolveRef({ fs, dir: this.repoPath, ref: 'HEAD' }),
        filepath,
      });
      headContent = new TextDecoder().decode(blob.blob);
    } catch { /* new file */ }

    let workContent = '';
    try {
      const adapter = fs as any;
      workContent = await adapter.promises.readFile(`${this.repoPath}/${filepath}`, { encoding: 'utf8' });
    } catch { /* deleted file */ }

    return computeDiff(headContent, workContent);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Check whether repoPath is a valid git repository. */
  async isRepo(): Promise<boolean> {
    try {
      const g = await git();
      const fs = await fsAdapter();
      await g.currentBranch({ fs, dir: this.repoPath, fullname: false });
      return true;
    } catch {
      return false;
    }
  }

  /** Update author identity for subsequent commits. */
  setAuthor(name: string, email: string): void {
    this.authorName = name;
    this.authorEmail = email;
  }
}

// ── Diff utility ─────────────────────────────────────────────────────────────

function computeDiff(
  oldText: string,
  newText: string,
): Array<{ type: 'add' | 'remove' | 'context'; line: string }> {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: Array<{ type: 'add' | 'remove' | 'context'; line: string }> = [];

  // Simple LCS-based diff (good enough for file-level diff display)
  const lcs = computeLCS(oldLines, newLines);
  let oi = 0;
  let ni = 0;
  let li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length &&
        oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ type: 'context', line: oldLines[oi] });
      oi++; ni++; li++;
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      result.push({ type: 'add', line: newLines[ni++] });
    } else if (oi < oldLines.length) {
      result.push({ type: 'remove', line: oldLines[oi++] });
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  // Limit LCS computation to avoid O(m*n) blowup on large files
  if (m * n > 200_000) return [];
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs: string[] = [];
  let i = m; let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { lcs.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) { i--; }
    else { j--; }
  }
  return lcs;
}

// ── Singleton factory ─────────────────────────────────────────────────────────

const _instances = new Map<string, GitService>();

export function getGitService(
  repoPath: string,
  authorName?: string,
  authorEmail?: string,
): GitService {
  if (!_instances.has(repoPath)) {
    _instances.set(repoPath, new GitService(repoPath, authorName, authorEmail));
  }
  const svc = _instances.get(repoPath)!;
  if (authorName) svc.setAuthor(authorName, authorEmail ?? '');
  return svc;
}

export function clearGitServiceCache(): void {
  _instances.clear();
}
