import { create } from 'zustand';
import type { AppSettings } from '../types';

interface AppState {
  isOnboardingComplete: boolean;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  completeOnboarding: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setLoading: (val: boolean) => void;
  setError: (err: string | null) => void;
}

const defaultSettings: AppSettings = {
  appearance: {
    theme: 'system',
    accentColor: '#007AFF',
    reducedMotion: false,
  },
  editor: {
    fontSize: 14,
    fontFamily: 'SpaceMono',
    tabSize: 2,
    insertSpaces: true,
    wordWrap: true,
    lineNumbers: true,
    minimap: false,
    theme: 'catppuccin-mocha',
    autoSave: true,
    formatOnSave: false,
    autoComplete: true,
    syntaxHighlighting: true,
    bracketMatching: true,
  },
  terminal: {
    fontSize: 13,
    fontFamily: 'SpaceMono',
    shell: '/bin/bash',
    scrollbackLines: 5000,
    cursorStyle: 'block',
    bellEnabled: false,
  },
  git: {
    name: '',
    email: '',
    defaultBranch: 'main',
    autoFetch: false,
    fetchInterval: 60,
  },
  storage: {
    maxProjectSize: 500 * 1024 * 1024,
    autoCleanup: false,
    containerBundle: 'standard',
  },
  privacy: {
    analytics: false,
    crashReports: true,
  },
};

export const useAppStore = create<AppState>((set) => ({
  isOnboardingComplete: false,
  settings: defaultSettings,
  isLoading: false,
  error: null,

  completeOnboarding: () => set({ isOnboardingComplete: true }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...partial,
        appearance: { ...state.settings.appearance, ...(partial.appearance ?? {}) },
        editor: { ...state.settings.editor, ...(partial.editor ?? {}) },
        terminal: { ...state.settings.terminal, ...(partial.terminal ?? {}) },
        git: { ...state.settings.git, ...(partial.git ?? {}) },
        storage: { ...state.settings.storage, ...(partial.storage ?? {}) },
        privacy: { ...state.settings.privacy, ...(partial.privacy ?? {}) },
      },
    })),

  setLoading: (val) => set({ isLoading: val }),
  setError: (err) => set({ error: err }),
}));
