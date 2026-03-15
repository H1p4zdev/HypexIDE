// ─── Hypex IDE Type Definitions ───────────────────────────────────────────────

// ── File System ──────────────────────────────────────────────────────────────
export type FileLanguage =
  | 'typescript' | 'javascript' | 'tsx' | 'jsx'
  | 'python' | 'rust' | 'go' | 'c' | 'cpp'
  | 'java' | 'kotlin' | 'swift' | 'dart'
  | 'html' | 'css' | 'scss' | 'json' | 'yaml'
  | 'markdown' | 'bash' | 'sql' | 'plain';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: FileLanguage;
  size?: number;
  modified?: Date;
  children?: FileNode[];
  isOpen?: boolean;
  content?: string;
  isDirty?: boolean;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  language: FileLanguage;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
  isGitRepo?: boolean;
  thumbnail?: string;
  tags?: string[];
  size?: number;
}

// ── Editor ────────────────────────────────────────────────────────────────────
export interface EditorTab {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  language: FileLanguage;
  content: string;
  isDirty: boolean;
  cursorPosition: { line: number; column: number };
  scrollOffset?: number;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  theme: EditorTheme;
  autoSave: boolean;
  formatOnSave: boolean;
  autoComplete: boolean;
  syntaxHighlighting: boolean;
  bracketMatching: boolean;
}

export type EditorTheme =
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'one-dark'
  | 'github-dark'
  | 'github-light'
  | 'dracula'
  | 'nord';

// ── Terminal ──────────────────────────────────────────────────────────────────
export interface TerminalSession {
  id: string;
  title: string;
  pid?: number;
  cwd: string;
  isActive: boolean;
  history: TerminalEntry[];
  createdAt: Date;
}

export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

// ── Container / PRoot ─────────────────────────────────────────────────────────
export type ContainerStatus =
  | 'uninitialized'
  | 'downloading'
  | 'extracting'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'error';

export type RootFSBundle = 'minimal' | 'standard' | 'development';

export interface ContainerConfig {
  bundle: RootFSBundle;
  rootPath: string;
  env: Record<string, string>;
  mounts: MountPoint[];
  uid: number;
  gid: number;
}

export interface MountPoint {
  source: string;
  target: string;
  type: 'bind' | 'proc' | 'sys' | 'dev' | 'tmpfs';
  options?: string[];
}

export interface Process {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  status: 'running' | 'stopped' | 'zombie';
  exitCode?: number;
}

export interface SyscallInterception {
  nr: number;
  name: string;
  handler: (args: SyscallArgs) => SyscallResult;
}

export interface SyscallArgs {
  path?: string;
  flags?: number;
  mode?: number;
  fd?: number;
  buf?: Uint8Array;
  count?: number;
}

export interface SyscallResult {
  returnValue: number;
  error?: string;
  data?: unknown;
}

// ── Git ───────────────────────────────────────────────────────────────────────
export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFile[];
  unstaged: GitFile[];
  untracked: string[];
}

export type GitFileStatus = 'M' | 'A' | 'D' | 'R' | 'C' | '?' | '!';

export interface GitFile {
  path: string;
  status: GitFileStatus;
  oldPath?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  parents: string[];
}

export interface GitBranch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  upstream?: string;
  lastCommit?: GitCommit;
}

// ── Extensions ────────────────────────────────────────────────────────────────
export interface HypexExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  publisher: string;
  categories: ExtensionCategory[];
  keywords?: string[];
  contributes?: ExtensionContributions;
  activationEvents?: string[];
  main?: string;
  rating?: number;
  downloads?: number;
  isInstalled?: boolean;
  isEnabled?: boolean;
  isFeatured?: boolean;
}

export type ExtensionCategory =
  | 'languages'
  | 'themes'
  | 'snippets'
  | 'linters'
  | 'formatters'
  | 'keymaps'
  | 'debuggers'
  | 'other';

export interface ExtensionContributions {
  languages?: LanguageContribution[];
  themes?: ThemeContribution[];
  snippets?: SnippetContribution[];
  commands?: CommandContribution[];
  keybindings?: KeybindingContribution[];
  grammars?: GrammarContribution[];
}

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  mimetypes?: string[];
  configuration?: string;
}

export interface ThemeContribution {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

export interface SnippetContribution {
  language: string;
  path: string;
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  when?: string;
}

export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string;
}

// ── App / Navigation ──────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Editor: { fileId: string; filePath: string };
  Terminal: { sessionId?: string };
  Git: { projectPath: string };
  Settings: { section?: string };
  Marketplace: undefined;
  FilePreview: { filePath: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Explorer: undefined;
  Git: undefined;
  Terminal: undefined;
  Settings: undefined;
};

// ── Settings ──────────────────────────────────────────────────────────────────
export interface AppSettings {
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    reducedMotion: boolean;
  };
  editor: EditorSettings;
  terminal: {
    fontSize: number;
    fontFamily: string;
    shell: string;
    scrollbackLines: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    bellEnabled: boolean;
  };
  git: {
    name: string;
    email: string;
    defaultBranch: string;
    autoFetch: boolean;
    fetchInterval: number;
  };
  storage: {
    maxProjectSize: number;
    autoCleanup: boolean;
    containerBundle: RootFSBundle;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
}
