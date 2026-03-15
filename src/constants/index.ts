import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── App ───────────────────────────────────────────────────────────────────────
export const APP_NAME = 'Hypex IDE';
export const APP_TAGLINE = 'Code anywhere, run everywhere';
export const APP_VERSION = '1.0.0';

// ── Screen dimensions ─────────────────────────────────────────────────────────
export const SCREEN = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT,
  IS_SMALL: SCREEN_WIDTH < 375,
  IS_TABLET: SCREEN_WIDTH >= 768,
};

// ── Layout ─────────────────────────────────────────────────────────────────────
export const LAYOUT = {
  TAB_BAR_HEIGHT: 83,
  HEADER_HEIGHT: 56,
  STATUS_BAR_HEIGHT: 44,
  SIDEBAR_WIDTH: 260,
  TERMINAL_MIN_HEIGHT: 200,
  TERMINAL_DEFAULT_HEIGHT: 280,
  EDITOR_TAB_HEIGHT: 40,
  FILE_TREE_INDENT: 16,
};

// ── Storage keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  APP_SETTINGS: 'hypex:settings',
  RECENT_PROJECTS: 'hypex:recent_projects',
  EDITOR_TABS: 'hypex:editor_tabs',
  TERMINAL_SESSIONS: 'hypex:terminal_sessions',
  ONBOARDING_COMPLETE: 'hypex:onboarding_done',
  INSTALLED_EXTENSIONS: 'hypex:extensions',
  CONTAINER_STATE: 'hypex:container',
  THEME: 'hypex:theme',
} as const;

// ── PRoot / Container ─────────────────────────────────────────────────────────
export const CONTAINER = {
  ROOTFS_BASE_URL: 'https://github.com/hypex-ide/rootfs/releases/download/v1.0.0',
  BUNDLES: {
    minimal: {
      name: 'Minimal',
      description: 'Alpine Mini RootFS (~3 MB)',
      url: 'https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/aarch64/alpine-minirootfs-3.19.1-aarch64.tar.gz',
      size: 3 * 1024 * 1024,
      tools: ['sh', 'apk', 'ls', 'cat', 'echo', 'grep', 'find'],
    },
    standard: {
      name: 'Standard',
      description: 'Common developer tools (~80 MB)',
      url: 'https://github.com/hypex-ide/rootfs/releases/download/v1.0.0/standard-arm64.tar.gz',
      size: 80 * 1024 * 1024,
      tools: ['bash', 'python3', 'git', 'curl', 'wget', 'vim', 'nano', 'make'],
    },
    development: {
      name: 'Development',
      description: 'Full dev environment (~250 MB)',
      url: 'https://github.com/hypex-ide/rootfs/releases/download/v1.0.0/dev-arm64.tar.gz',
      size: 250 * 1024 * 1024,
      tools: ['bash', 'python3', 'node', 'npm', 'git', 'gcc', 'make', 'cargo', 'go'],
    },
  },
  VIRTUAL_FS: {
    PROC: '/proc',
    SYS: '/sys',
    DEV: '/dev',
    TMP: '/tmp',
    HOME: '/root',
    ETC: '/etc',
    USR: '/usr',
    BIN: '/bin',
    LIB: '/lib',
  },
};

// ── Syntax highlighting ───────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx'] },
  { id: 'python', name: 'Python', extensions: ['.py'] },
  { id: 'rust', name: 'Rust', extensions: ['.rs'] },
  { id: 'go', name: 'Go', extensions: ['.go'] },
  { id: 'c', name: 'C', extensions: ['.c', '.h'] },
  { id: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.hpp'] },
  { id: 'java', name: 'Java', extensions: ['.java'] },
  { id: 'kotlin', name: 'Kotlin', extensions: ['.kt', '.kts'] },
  { id: 'swift', name: 'Swift', extensions: ['.swift'] },
  { id: 'dart', name: 'Dart', extensions: ['.dart'] },
  { id: 'html', name: 'HTML', extensions: ['.html', '.htm'] },
  { id: 'css', name: 'CSS', extensions: ['.css', '.scss'] },
  { id: 'json', name: 'JSON', extensions: ['.json'] },
  { id: 'yaml', name: 'YAML', extensions: ['.yml', '.yaml'] },
  { id: 'markdown', name: 'Markdown', extensions: ['.md', '.mdx'] },
  { id: 'bash', name: 'Shell', extensions: ['.sh', '.bash', '.zsh'] },
  { id: 'sql', name: 'SQL', extensions: ['.sql'] },
] as const;

// ── Extensions marketplace ────────────────────────────────────────────────────
export const MARKETPLACE = {
  API_URL: 'https://marketplace.hypex.io/api/v1',
  FEATURED_LIMIT: 6,
  SEARCH_DEBOUNCE_MS: 300,
};

// ── Performance ───────────────────────────────────────────────────────────────
export const PERFORMANCE = {
  MAX_FILE_SIZE_FOR_HIGHLIGHTING: 500 * 1024, // 500 KB
  VIRTUAL_LIST_BATCH_SIZE: 20,
  TERMINAL_MAX_LINES: 10000,
  AUTO_SAVE_DEBOUNCE_MS: 1500,
  SEARCH_THROTTLE_MS: 100,
};

// ── Git ───────────────────────────────────────────────────────────────────────
export const GIT = {
  DEFAULT_BRANCH: 'main',
  COMMIT_MAX_LENGTH: 72,
  FETCH_INTERVAL_MS: 60 * 1000,
};

// ── Onboarding ────────────────────────────────────────────────────────────────
export const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Hypex',
    subtitle: 'Code anywhere, run everywhere',
    description: 'A powerful IDE that fits in your pocket. Full terminal, code editor, and Git — all offline.',
    gradient: ['#007AFF', '#5856D6'] as const,
    icon: '⚡',
  },
  {
    id: 'editor',
    title: 'Smart Code Editor',
    subtitle: 'Syntax highlighting for 20+ languages',
    description: 'Write code with full syntax highlighting, auto-complete, and error detection.',
    gradient: ['#34C759', '#30D158'] as const,
    icon: '📝',
  },
  {
    id: 'terminal',
    title: 'Real Linux Terminal',
    subtitle: 'PRoot-powered offline container',
    description: 'Run real Linux commands, install packages, and execute scripts — no internet required.',
    gradient: ['#FF9500', '#FF6B00'] as const,
    icon: '🖥️',
  },
  {
    id: 'git',
    title: 'Built-in Git',
    subtitle: 'Full version control support',
    description: 'Commit, branch, merge, and push — all from within the app.',
    gradient: ['#5856D6', '#BF5AF2'] as const,
    icon: '🌿',
  },
];

// ── Quick Actions ─────────────────────────────────────────────────────────────
export const QUICK_ACTIONS = [
  { id: 'new-project', label: 'New Project', icon: '✨', action: 'CREATE_PROJECT' },
  { id: 'open-folder', label: 'Open Folder', icon: '📂', action: 'OPEN_FOLDER' },
  { id: 'terminal', label: 'Terminal', icon: '🖥️', action: 'OPEN_TERMINAL' },
  { id: 'git-clone', label: 'Clone Repo', icon: '📦', action: 'GIT_CLONE' },
] as const;

// ── Project templates ─────────────────────────────────────────────────────────
export const PROJECT_TEMPLATES = [
  {
    id: 'react-native',
    name: 'React Native',
    description: 'Mobile app with Expo',
    icon: '⚛️',
    language: 'typescript' as const,
    files: ['App.tsx', 'package.json', 'tsconfig.json'],
  },
  {
    id: 'node-express',
    name: 'Node.js API',
    description: 'Express REST API',
    icon: '🚀',
    language: 'typescript' as const,
    files: ['src/index.ts', 'package.json'],
  },
  {
    id: 'python-script',
    name: 'Python Script',
    description: 'Simple Python project',
    icon: '🐍',
    language: 'python' as const,
    files: ['main.py', 'requirements.txt'],
  },
  {
    id: 'rust-cli',
    name: 'Rust CLI',
    description: 'Command-line tool in Rust',
    icon: '🦀',
    language: 'rust' as const,
    files: ['src/main.rs', 'Cargo.toml'],
  },
  {
    id: 'c-program',
    name: 'C Program',
    description: 'C project with Makefile',
    icon: '🔧',
    language: 'c' as const,
    files: ['main.c', 'Makefile'],
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: '📄',
    language: 'plain' as const,
    files: [],
  },
] as const;
