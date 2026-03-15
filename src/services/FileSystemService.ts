// ─── FileSystemService ────────────────────────────────────────────────────────
// Abstraction over expo-file-system for all persistent file I/O in Hypex IDE.
// Provides project management, file CRUD, directory trees, and storage stats.

import type { FileNode, FileLanguage, Project } from '../types';
import { detectLanguage, formatFileSize } from '../utils/files';

// ── expo-file-system lazy import ──────────────────────────────────────────────
type EFS = typeof import('expo-file-system');
let _efs: EFS | null = null;

async function efs(): Promise<EFS> {
  if (!_efs) {
    try {
      _efs = await import('expo-file-system');
    } catch {
      throw new Error('expo-file-system is not available');
    }
  }
  return _efs;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_PREVIEW_SIZE = 512 * 1024; // 512 KB — don't load larger files into editor
const MAX_TREE_DEPTH = 10;           // Maximum folder recursion depth

// ── Path utilities ────────────────────────────────────────────────────────────

function join(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, '')))
    .filter(Boolean)
    .join('/');
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
}

function ext(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot) : '';
}

// ── FileSystemService class ────────────────────────────────────────────────────

export class FileSystemService {
  private projectsRoot: string;

  constructor(projectsRoot?: string) {
    // Will be resolved lazily once expo-file-system is available
    this.projectsRoot = projectsRoot ?? '';
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  private async root(): Promise<string> {
    if (!this.projectsRoot) {
      const fs = await efs();
      this.projectsRoot = join(fs.documentDirectory ?? '/tmp', 'HypexIDE', 'projects');
    }
    return this.projectsRoot;
  }

  /** Ensure the projects root directory exists. */
  async initialize(): Promise<void> {
    const fs = await efs();
    const root = await this.root();
    const info = await fs.getInfoAsync(root);
    if (!info.exists) {
      await fs.makeDirectoryAsync(root, { intermediates: true });
    }
  }

  // ── Project management ────────────────────────────────────────────────────────

  /** List all projects in the projects root. */
  async listProjects(): Promise<Project[]> {
    const fs = await efs();
    const root = await this.root();
    await this.initialize();

    const entries = await fs.readDirectoryAsync(root).catch(() => [] as string[]);
    const projects: Project[] = [];

    for (const name of entries) {
      const projectPath = join(root, name);
      const info = await fs.getInfoAsync(projectPath, { size: true });
      if (!info.exists || !info.isDirectory) continue;

      const metaPath = join(projectPath, '.hypex', 'project.json');
      let meta: Partial<Project> = {};
      try {
        const raw = await fs.readAsStringAsync(metaPath);
        meta = JSON.parse(raw);
      } catch { /* no meta yet */ }

      const language = await this.detectProjectLanguage(projectPath);
      projects.push({
        id: meta.id ?? name,
        name: meta.name ?? name,
        path: projectPath,
        description: meta.description,
        language: meta.language ?? language,
        createdAt: meta.createdAt ? new Date(meta.createdAt) : new Date(),
        updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : new Date(),
        lastOpenedAt: meta.lastOpenedAt ? new Date(meta.lastOpenedAt) : undefined,
        isGitRepo: await this.exists(join(projectPath, '.git')),
        tags: meta.tags,
        size: info.size,
      });
    }

    return projects.sort((a, b) =>
      (b.lastOpenedAt ?? b.updatedAt).getTime() - (a.lastOpenedAt ?? a.updatedAt).getTime(),
    );
  }

  /** Create a new project directory with optional template content. */
  async createProject(
    name: string,
    language: FileLanguage,
    template?: Record<string, string>,
  ): Promise<Project> {
    const fs = await efs();
    const root = await this.root();
    const safeName = name.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    const projectPath = join(root, safeName);

    await fs.makeDirectoryAsync(projectPath, { intermediates: true });
    await fs.makeDirectoryAsync(join(projectPath, '.hypex'), { intermediates: true });

    const project: Project = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: safeName,
      path: projectPath,
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
      isGitRepo: false,
    };

    await fs.writeAsStringAsync(join(projectPath, '.hypex', 'project.json'), JSON.stringify(project, null, 2));

    if (template) {
      for (const [relPath, content] of Object.entries(template)) {
        const fullPath = join(projectPath, relPath);
        await fs.makeDirectoryAsync(dirname(fullPath), { intermediates: true }).catch(() => {});
        await fs.writeAsStringAsync(fullPath, content);
      }
    }

    return project;
  }

  /** Update project metadata. */
  async updateProject(projectPath: string, updates: Partial<Project>): Promise<void> {
    const fs = await efs();
    const metaPath = join(projectPath, '.hypex', 'project.json');
    let current: Partial<Project> = {};
    try {
      current = JSON.parse(await fs.readAsStringAsync(metaPath));
    } catch { /* ok */ }
    const merged = { ...current, ...updates, updatedAt: new Date() };
    await fs.writeAsStringAsync(metaPath, JSON.stringify(merged, null, 2));
  }

  /** Delete a project directory (irreversible). */
  async deleteProject(projectPath: string): Promise<void> {
    const fs = await efs();
    await fs.deleteAsync(projectPath, { idempotent: true });
  }

  /** Record that a project was opened (updates lastOpenedAt). */
  async touchProject(projectPath: string): Promise<void> {
    await this.updateProject(projectPath, { lastOpenedAt: new Date() });
  }

  // ── File tree ─────────────────────────────────────────────────────────────────

  /** Build a FileNode tree for a directory (up to MAX_TREE_DEPTH deep). */
  async readTree(dirPath: string, depth = 0): Promise<FileNode[]> {
    if (depth > MAX_TREE_DEPTH) return [];
    const fs = await efs();

    let entries: string[];
    try {
      entries = await fs.readDirectoryAsync(dirPath);
    } catch {
      return [];
    }

    const IGNORED = new Set(['.git', 'node_modules', '.expo', '.hypex', '__pycache__', '.DS_Store', 'dist', 'build', '.next']);

    const nodes: FileNode[] = [];
    for (const name of entries) {
      if (IGNORED.has(name)) continue;
      const fullPath = join(dirPath, name);
      const info = await fs.getInfoAsync(fullPath, { size: true });
      if (!info.exists) continue;

      if (info.isDirectory) {
        nodes.push({
          id: fullPath,
          name,
          path: fullPath,
          type: 'directory',
          children: await this.readTree(fullPath, depth + 1),
          isOpen: false,
        });
      } else {
        nodes.push({
          id: fullPath,
          name,
          path: fullPath,
          type: 'file',
          language: detectLanguage(name),
          size: info.size,
          modified: info.modificationTime ? new Date(info.modificationTime * 1000) : undefined,
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  // ── File CRUD ─────────────────────────────────────────────────────────────────

  /** Read a file as a UTF-8 string. Returns null if too large. */
  async readFile(filePath: string): Promise<string | null> {
    const fs = await efs();
    const info = await fs.getInfoAsync(filePath, { size: true });
    if (!info.exists) return null;
    if (info.size && info.size > MAX_PREVIEW_SIZE) return null; // file too large
    return fs.readAsStringAsync(filePath, { encoding: 'utf8' as any });
  }

  /** Write a string to a file, creating parent directories if needed. */
  async writeFile(filePath: string, content: string): Promise<void> {
    const fs = await efs();
    await fs.makeDirectoryAsync(dirname(filePath), { intermediates: true }).catch(() => {});
    await fs.writeAsStringAsync(filePath, content, { encoding: 'utf8' as any });
  }

  /** Append content to a file. */
  async appendFile(filePath: string, content: string): Promise<void> {
    const existing = await this.readFile(filePath) ?? '';
    await this.writeFile(filePath, existing + content);
  }

  /** Delete a file or directory. */
  async delete(path: string): Promise<void> {
    const fs = await efs();
    await fs.deleteAsync(path, { idempotent: true });
  }

  /** Move/rename a file or directory. */
  async move(fromPath: string, toPath: string): Promise<void> {
    const fs = await efs();
    await fs.makeDirectoryAsync(dirname(toPath), { intermediates: true }).catch(() => {});
    await fs.moveAsync({ from: fromPath, to: toPath });
  }

  /** Copy a file or directory. */
  async copy(fromPath: string, toPath: string): Promise<void> {
    const fs = await efs();
    await fs.makeDirectoryAsync(dirname(toPath), { intermediates: true }).catch(() => {});
    await fs.copyAsync({ from: fromPath, to: toPath });
  }

  /** Create a directory (and parents). */
  async mkdir(dirPath: string): Promise<void> {
    const fs = await efs();
    await fs.makeDirectoryAsync(dirPath, { intermediates: true });
  }

  /** Check whether a path exists. */
  async exists(path: string): Promise<boolean> {
    const fs = await efs();
    const info = await fs.getInfoAsync(path);
    return info.exists;
  }

  /** Return info about a path (size, isDirectory, modificationTime). */
  async stat(path: string): Promise<{
    exists: boolean;
    isDirectory: boolean;
    size?: number;
    modifiedAt?: Date;
  }> {
    const fs = await efs();
    const info = await fs.getInfoAsync(path, { size: true });
    return {
      exists: info.exists,
      isDirectory: info.exists ? (info as any).isDirectory ?? false : false,
      size: info.exists ? (info as any).size : undefined,
      modifiedAt: info.exists && (info as any).modificationTime
        ? new Date((info as any).modificationTime * 1000)
        : undefined,
    };
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  /** Recursively search for files matching a pattern in name or content. */
  async search(
    rootDir: string,
    query: string,
    opts: { searchContent?: boolean; caseSensitive?: boolean } = {},
  ): Promise<Array<{ path: string; line?: number; preview?: string }>> {
    const results: Array<{ path: string; line?: number; preview?: string }> = [];
    const flags = opts.caseSensitive ? '' : 'i';
    const re = new RegExp(escapeRegex(query), flags);
    await this._searchDir(rootDir, re, opts.searchContent ?? false, results);
    return results.slice(0, 200); // cap at 200 results
  }

  private async _searchDir(
    dir: string,
    re: RegExp,
    searchContent: boolean,
    results: Array<{ path: string; line?: number; preview?: string }>,
  ): Promise<void> {
    const fs = await efs();
    const IGNORED = new Set(['.git', 'node_modules', '.expo', '__pycache__']);
    let entries: string[];
    try { entries = await fs.readDirectoryAsync(dir); }
    catch { return; }

    for (const name of entries) {
      if (IGNORED.has(name)) continue;
      const fullPath = join(dir, name);
      const info = await fs.getInfoAsync(fullPath, { size: true });
      if (!info.exists) continue;

      if (info.isDirectory) {
        await this._searchDir(fullPath, re, searchContent, results);
        continue;
      }

      // Name match
      if (re.test(name)) {
        results.push({ path: fullPath });
      }

      // Content match
      if (searchContent && info.size && info.size <= MAX_PREVIEW_SIZE) {
        try {
          const content = await fs.readAsStringAsync(fullPath, { encoding: 'utf8' as any });
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              results.push({ path: fullPath, line: i + 1, preview: lines[i].trim().slice(0, 120) });
            }
          }
        } catch { /* binary file */ }
      }
    }
  }

  // ── Storage stats ─────────────────────────────────────────────────────────────

  /** Return total and free storage in bytes. */
  async storageInfo(): Promise<{
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedFormatted: string;
    freeFormatted: string;
    totalFormatted: string;
  }> {
    const fs = await efs();
    const info = await (fs as any).getFreeDiskStorageAsync?.() ?? 0;
    const total = await (fs as any).getTotalDiskCapacityAsync?.() ?? 0;
    const free = typeof info === 'number' ? info : 0;
    const used = total - free;
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usedFormatted: formatFileSize(used),
      freeFormatted: formatFileSize(free),
      totalFormatted: formatFileSize(total),
    };
  }

  /** Return storage used by a specific project directory. */
  async projectSize(projectPath: string): Promise<number> {
    return this._dirSize(projectPath);
  }

  private async _dirSize(dir: string): Promise<number> {
    const fs = await efs();
    let total = 0;
    let entries: string[];
    try { entries = await fs.readDirectoryAsync(dir); }
    catch { return 0; }
    for (const name of entries) {
      const fullPath = join(dir, name);
      const info = await fs.getInfoAsync(fullPath, { size: true });
      if (!info.exists) continue;
      if (info.isDirectory) {
        total += await this._dirSize(fullPath);
      } else {
        total += (info as any).size ?? 0;
      }
    }
    return total;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────

  private async detectProjectLanguage(projectPath: string): Promise<FileLanguage> {
    const fs = await efs();
    const checks: Array<[string, FileLanguage]> = [
      ['package.json', 'typescript'],
      ['tsconfig.json', 'typescript'],
      ['requirements.txt', 'python'],
      ['pyproject.toml', 'python'],
      ['Cargo.toml', 'rust'],
      ['go.mod', 'go'],
      ['build.gradle', 'java'],
      ['pom.xml', 'java'],
      ['pubspec.yaml', 'dart'],
    ];
    for (const [file, lang] of checks) {
      const info = await fs.getInfoAsync(join(projectPath, file));
      if (info.exists) return lang;
    }
    return 'plain';
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _instance: FileSystemService | null = null;

export function getFileSystemService(): FileSystemService {
  if (!_instance) {
    _instance = new FileSystemService();
  }
  return _instance;
}
