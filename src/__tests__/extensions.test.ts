import { ExtensionHost } from '../extensions/ExtensionHost';
import type { HypexExtension } from '../types';

describe('ExtensionHost', () => {
  let host: ExtensionHost;

  beforeEach(() => {
    host = new ExtensionHost();
  });

  describe('Initialization', () => {
    it('initializes without errors', async () => {
      await expect(host.initialize()).resolves.toBeUndefined();
    });

    it('loads built-in extensions', async () => {
      await host.initialize();
      const installed = host.getInstalledExtensions();
      expect(installed.length).toBeGreaterThan(0);
    });

    it('includes TypeScript language extension', async () => {
      await host.initialize();
      const ext = host.getExtension('hypex.typescript');
      expect(ext).toBeDefined();
      expect(ext!.isEnabled).toBe(true);
    });
  });

  describe('Extension lifecycle', () => {
    const TEST_EXT: HypexExtension = {
      id: 'test.extension',
      name: 'Test Extension',
      version: '1.0.0',
      description: 'A test extension',
      author: 'Test',
      publisher: 'test',
      categories: ['other'],
      isInstalled: false,
      isEnabled: false,
    };

    beforeEach(() => host.initialize());

    it('loads an extension', async () => {
      await host.load(TEST_EXT);
      const ext = host.getExtension('test.extension');
      expect(ext).toBeDefined();
    });

    it('unloads an extension', async () => {
      await host.load(TEST_EXT);
      await host.unload('test.extension');
      expect(host.getExtension('test.extension')).toBeUndefined();
    });

    it('enables and disables extensions', async () => {
      await host.load({ ...TEST_EXT, isInstalled: true, isEnabled: false });
      host.enable('test.extension');
      expect(host.getExtension('test.extension')!.isEnabled).toBe(true);
      host.disable('test.extension');
      expect(host.getExtension('test.extension')!.isEnabled).toBe(false);
    });

    it('installs an extension', async () => {
      await host.install(TEST_EXT);
      const ext = host.getExtension('test.extension');
      expect(ext!.isInstalled).toBe(true);
      expect(ext!.isEnabled).toBe(true);
    });
  });

  describe('Language extensions', () => {
    beforeEach(() => host.initialize());

    it('returns language extensions', async () => {
      const langs = host.getLanguageExtensions();
      expect(langs.length).toBeGreaterThan(0);
      expect(langs.every((e) => e.categories.includes('languages'))).toBe(true);
    });
  });

  describe('Theme extensions', () => {
    beforeEach(() => host.initialize());

    it('returns theme extensions', async () => {
      const themes = host.getThemeExtensions();
      expect(themes.length).toBeGreaterThan(0);
    });
  });
});
