import { create } from 'zustand';
import type { EditorTab, FileNode, Project } from '../types';
import { detectLanguage } from '../utils/files';

interface EditorState {
  activeTabId: string | null;
  tabs: EditorTab[];
  openFiles: FileNode[];
  currentProject: Project | null;
  recentProjects: Project[];
  fileTree: FileNode[];
  isSidebarOpen: boolean;
  isTerminalOpen: boolean;
  terminalHeight: number;
  sidebarWidth: number;

  // Actions
  openTab: (file: FileNode) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  setCurrentProject: (project: Project | null) => void;
  addRecentProject: (project: Project) => void;
  setFileTree: (nodes: FileNode[]) => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;
  setSidebarWidth: (width: number) => void;
  closeAllTabs: () => void;
  saveTab: (tabId: string) => void;
}

let tabIdCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  activeTabId: null,
  tabs: [],
  openFiles: [],
  currentProject: null,
  recentProjects: [],
  fileTree: [],
  isSidebarOpen: true,
  isTerminalOpen: false,
  terminalHeight: 280,
  sidebarWidth: 260,

  openTab: (file) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.filePath === file.path);

    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    const newTab: EditorTab = {
      id: `tab-${++tabIdCounter}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      language: file.language ?? detectLanguage(file.name),
      content: file.content ?? '',
      isDirty: false,
      cursorPosition: { line: 1, column: 1 },
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);

    let newActiveId = activeTabId;
    if (activeTabId === tabId) {
      // Activate adjacent tab
      if (newTabs.length > 0) {
        const nextIdx = Math.min(idx, newTabs.length - 1);
        newActiveId = newTabs[nextIdx].id;
      } else {
        newActiveId = null;
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveId });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      ),
    })),

  markTabDirty: (tabId, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isDirty } : t
      ),
    })),

  setCurrentProject: (project) => set({ currentProject: project }),

  addRecentProject: (project) =>
    set((state) => {
      const filtered = state.recentProjects.filter((p) => p.id !== project.id);
      return {
        recentProjects: [project, ...filtered].slice(0, 10),
      };
    }),

  setFileTree: (nodes) => set({ fileTree: nodes }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  toggleTerminal: () =>
    set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

  setTerminalHeight: (height) => set({ terminalHeight: height }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  closeAllTabs: () => set({ tabs: [], activeTabId: null }),

  saveTab: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t
      ),
    })),
}));
