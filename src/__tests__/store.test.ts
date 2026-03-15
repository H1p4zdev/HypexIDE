// Store tests (Zustand)
import { useEditorStore } from '../store/editorStore';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore } from '../store/appStore';
import type { FileNode } from '../types';

const MOCK_FILE: FileNode = {
  id: 'file-1',
  name: 'App.tsx',
  path: '/root/project/App.tsx',
  type: 'file',
  language: 'tsx',
  content: 'import React from "react";\nexport default function App() {}',
};

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      openFiles: [],
      currentProject: null,
      recentProjects: [],
      fileTree: [],
      isSidebarOpen: true,
      isTerminalOpen: false,
      terminalHeight: 280,
      sidebarWidth: 260,
    });
  });

  it('opens a new tab', () => {
    useEditorStore.getState().openTab(MOCK_FILE);
    const { tabs, activeTabId } = useEditorStore.getState();
    expect(tabs.length).toBe(1);
    expect(activeTabId).toBe(tabs[0].id);
    expect(tabs[0].fileName).toBe('App.tsx');
  });

  it('does not open duplicate tabs', () => {
    useEditorStore.getState().openTab(MOCK_FILE);
    useEditorStore.getState().openTab(MOCK_FILE);
    expect(useEditorStore.getState().tabs.length).toBe(1);
  });

  it('closes a tab and updates active tab', () => {
    useEditorStore.getState().openTab(MOCK_FILE);
    const { tabs } = useEditorStore.getState();
    useEditorStore.getState().closeTab(tabs[0].id);
    expect(useEditorStore.getState().tabs.length).toBe(0);
    expect(useEditorStore.getState().activeTabId).toBeNull();
  });

  it('marks tab as dirty on content update', () => {
    useEditorStore.getState().openTab(MOCK_FILE);
    const { tabs } = useEditorStore.getState();
    useEditorStore.getState().updateTabContent(tabs[0].id, 'new content');
    expect(useEditorStore.getState().tabs[0].isDirty).toBe(true);
  });

  it('marks tab as clean on save', () => {
    useEditorStore.getState().openTab(MOCK_FILE);
    const { tabs } = useEditorStore.getState();
    useEditorStore.getState().updateTabContent(tabs[0].id, 'new content');
    useEditorStore.getState().saveTab(tabs[0].id);
    expect(useEditorStore.getState().tabs[0].isDirty).toBe(false);
  });

  it('toggles sidebar', () => {
    const initial = useEditorStore.getState().isSidebarOpen;
    useEditorStore.getState().toggleSidebar();
    expect(useEditorStore.getState().isSidebarOpen).toBe(!initial);
  });

  it('adds recent projects with max 10', () => {
    for (let i = 0; i < 12; i++) {
      useEditorStore.getState().addRecentProject({
        id: `project-${i}`,
        name: `Project ${i}`,
        path: `/root/project-${i}`,
        language: 'typescript',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    expect(useEditorStore.getState().recentProjects.length).toBe(10);
  });
});

describe('TerminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
      isRunning: false,
    });
  });

  it('creates a session', () => {
    const id = useTerminalStore.getState().createSession();
    expect(useTerminalStore.getState().sessions.length).toBe(1);
    expect(useTerminalStore.getState().activeSessionId).toBe(id);
  });

  it('closes a session', () => {
    const id = useTerminalStore.getState().createSession();
    useTerminalStore.getState().closeSession(id);
    expect(useTerminalStore.getState().sessions.length).toBe(0);
    expect(useTerminalStore.getState().activeSessionId).toBeNull();
  });

  it('appends entries to a session', () => {
    const id = useTerminalStore.getState().createSession();
    useTerminalStore.getState().appendEntry(id, {
      type: 'output',
      content: 'Hello World',
      timestamp: new Date(),
    });
    const session = useTerminalStore.getState().sessions[0];
    expect(session.history.length).toBe(1);
    expect(session.history[0].content).toBe('Hello World');
  });

  it('clears session history', () => {
    const id = useTerminalStore.getState().createSession();
    useTerminalStore.getState().appendEntry(id, {
      type: 'output',
      content: 'test',
      timestamp: new Date(),
    });
    useTerminalStore.getState().clearSession(id);
    expect(useTerminalStore.getState().sessions[0].history.length).toBe(0);
  });
});

describe('AppStore', () => {
  it('starts onboarding as incomplete', () => {
    const fresh = useAppStore.getState();
    expect(fresh.isOnboardingComplete).toBe(false);
  });

  it('completes onboarding', () => {
    useAppStore.getState().completeOnboarding();
    expect(useAppStore.getState().isOnboardingComplete).toBe(true);
  });

  it('updates settings', () => {
    useAppStore.getState().updateSettings({ editor: { ...useAppStore.getState().settings.editor, fontSize: 16 } });
    expect(useAppStore.getState().settings.editor.fontSize).toBe(16);
  });
});
