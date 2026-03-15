import type {
  HypexExtension,
  ExtensionContributions,
  CommandContribution,
} from '../types';

// ─── Extension sandbox ────────────────────────────────────────────────────────
class ExtensionSandbox {
  private extensionId: string;
  private allowedAPIs: Set<string>;

  constructor(extensionId: string) {
    this.extensionId = extensionId;
    this.allowedAPIs = new Set([
      'editor.getActiveFile',
      'editor.insertText',
      'editor.replaceSelection',
      'terminal.sendCommand',
      'workspace.getFiles',
      'window.showMessage',
      'window.showInputBox',
    ]);
  }

  canCall(api: string): boolean {
    return this.allowedAPIs.has(api);
  }

  call(api: string, args: unknown[]): Promise<unknown> {
    if (!this.canCall(api)) {
      return Promise.reject(new Error(`Extension ${this.extensionId}: API '${api}' not permitted`));
    }
    // In production this would call into the host bridge
    console.log(`[Sandbox:${this.extensionId}] ${api}(${JSON.stringify(args)})`);
    return Promise.resolve(null);
  }
}

// ─── Extension Registry ───────────────────────────────────────────────────────
class ExtensionRegistry {
  private extensions: Map<string, HypexExtension>;
  private contributions: Map<string, ExtensionContributions>;
  private commands: Map<string, CommandContribution & { handler: () => Promise<void> }>;

  constructor() {
    this.extensions = new Map();
    this.contributions = new Map();
    this.commands = new Map();
  }

  register(extension: HypexExtension): void {
    this.extensions.set(extension.id, extension);
    if (extension.contributes) {
      this.contributions.set(extension.id, extension.contributes);
      this.indexContributions(extension.id, extension.contributes);
    }
  }

  unregister(id: string): void {
    this.extensions.delete(id);
    this.contributions.delete(id);
    // Remove commands from this extension
    for (const [key, cmd] of this.commands) {
      if (key.startsWith(`${id}.`)) {
        this.commands.delete(key);
      }
    }
  }

  private indexContributions(extId: string, contributions: ExtensionContributions): void {
    for (const cmd of contributions.commands ?? []) {
      this.commands.set(cmd.command, {
        ...cmd,
        handler: async () => {
          console.log(`[ExtensionHost] Executing command: ${cmd.command}`);
        },
      });
    }
  }

  get(id: string): HypexExtension | undefined {
    return this.extensions.get(id);
  }

  getAll(): HypexExtension[] {
    return Array.from(this.extensions.values());
  }

  getEnabled(): HypexExtension[] {
    return this.getAll().filter((e) => e.isEnabled);
  }

  executeCommand(command: string): Promise<void> {
    const cmd = this.commands.get(command);
    if (!cmd) {
      return Promise.reject(new Error(`Command not found: ${command}`));
    }
    return cmd.handler();
  }

  getContributions(extId: string): ExtensionContributions | undefined {
    return this.contributions.get(extId);
  }
}

// ─── ExtensionHost ────────────────────────────────────────────────────────────
export class ExtensionHost {
  private registry: ExtensionRegistry;
  private sandboxes: Map<string, ExtensionSandbox>;
  private isInitialized: boolean;

  constructor() {
    this.registry = new ExtensionRegistry();
    this.sandboxes = new Map();
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load built-in extensions
    await this.loadBuiltInExtensions();
    this.isInitialized = true;
    console.log('[ExtensionHost] Initialized');
  }

  private async loadBuiltInExtensions(): Promise<void> {
    const builtins: HypexExtension[] = [
      {
        id: 'hypex.typescript',
        name: 'TypeScript Language Support',
        version: '1.0.0',
        description: 'TypeScript and JavaScript syntax highlighting',
        author: 'Hypex',
        publisher: 'hypex',
        categories: ['languages'],
        isInstalled: true,
        isEnabled: true,
        contributes: {
          languages: [
            { id: 'typescript', extensions: ['.ts', '.tsx'] },
            { id: 'javascript', extensions: ['.js', '.jsx'] },
          ],
        },
      },
      {
        id: 'hypex.python',
        name: 'Python Language Support',
        version: '1.0.0',
        description: 'Python syntax highlighting and snippets',
        author: 'Hypex',
        publisher: 'hypex',
        categories: ['languages'],
        isInstalled: true,
        isEnabled: true,
        contributes: {
          languages: [{ id: 'python', extensions: ['.py'] }],
        },
      },
      {
        id: 'hypex.theme-catppuccin',
        name: 'Catppuccin Themes',
        version: '1.0.0',
        description: 'Soothing pastel themes',
        author: 'Hypex',
        publisher: 'hypex',
        categories: ['themes'],
        isInstalled: true,
        isEnabled: true,
        contributes: {
          themes: [
            { label: 'Catppuccin Mocha', uiTheme: 'vs-dark', path: './themes/mocha.json' },
            { label: 'Catppuccin Latte', uiTheme: 'vs', path: './themes/latte.json' },
          ],
        },
      },
    ];

    for (const ext of builtins) {
      await this.load(ext);
    }
  }

  async load(extension: HypexExtension): Promise<void> {
    const sandbox = new ExtensionSandbox(extension.id);
    this.sandboxes.set(extension.id, sandbox);
    this.registry.register(extension);
    console.log(`[ExtensionHost] Loaded: ${extension.name} v${extension.version}`);
  }

  async unload(extensionId: string): Promise<void> {
    this.registry.unregister(extensionId);
    this.sandboxes.delete(extensionId);
    console.log(`[ExtensionHost] Unloaded: ${extensionId}`);
  }

  async install(extension: HypexExtension): Promise<void> {
    // In production: download extension bundle, verify signature
    await new Promise((r) => setTimeout(r, 1500));
    await this.load({ ...extension, isInstalled: true, isEnabled: true });
  }

  async uninstall(extensionId: string): Promise<void> {
    await this.unload(extensionId);
  }

  enable(extensionId: string): void {
    const ext = this.registry.get(extensionId);
    if (ext) {
      ext.isEnabled = true;
    }
  }

  disable(extensionId: string): void {
    const ext = this.registry.get(extensionId);
    if (ext) {
      ext.isEnabled = false;
    }
  }

  executeCommand(command: string): Promise<void> {
    return this.registry.executeCommand(command);
  }

  getInstalledExtensions(): HypexExtension[] {
    return this.registry.getAll().filter((e) => e.isInstalled);
  }

  getEnabledExtensions(): HypexExtension[] {
    return this.registry.getEnabled();
  }

  getExtension(id: string): HypexExtension | undefined {
    return this.registry.get(id);
  }

  getLanguageExtensions(): HypexExtension[] {
    return this.registry.getAll().filter((e) =>
      e.categories.includes('languages')
    );
  }

  getThemeExtensions(): HypexExtension[] {
    return this.registry.getAll().filter((e) =>
      e.categories.includes('themes')
    );
  }
}

// ─── Global extension host instance ──────────────────────────────────────────
let hostInstance: ExtensionHost | null = null;

export function getExtensionHost(): ExtensionHost {
  if (!hostInstance) {
    hostInstance = new ExtensionHost();
  }
  return hostInstance;
}

export default ExtensionHost;
