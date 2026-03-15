import { create } from 'zustand';
import type { TerminalSession, TerminalEntry } from '../types';

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  isRunning: boolean;

  // Actions
  createSession: (cwd?: string) => string;
  closeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  appendEntry: (sessionId: string, entry: Omit<TerminalEntry, 'id'>) => void;
  clearSession: (sessionId: string) => void;
  setRunning: (val: boolean) => void;
  renameSession: (sessionId: string, title: string) => void;
}

let sessionIdCounter = 0;
let entryIdCounter = 0;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isRunning: false,

  createSession: (cwd = '/root') => {
    const id = `session-${++sessionIdCounter}`;
    const session: TerminalSession = {
      id,
      title: `Terminal ${sessionIdCounter}`,
      cwd,
      isActive: true,
      history: [],
      createdAt: new Date(),
    };

    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: id,
    }));

    return id;
  },

  closeSession: (sessionId) => {
    const { sessions, activeSessionId } = get();
    const newSessions = sessions.filter((s) => s.id !== sessionId);
    let newActiveId = activeSessionId;

    if (activeSessionId === sessionId) {
      newActiveId = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
    }

    set({ sessions: newSessions, activeSessionId: newActiveId });
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  appendEntry: (sessionId, entry) => {
    const id = `entry-${++entryIdCounter}`;
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              history: [
                ...s.history.slice(-9999), // cap at 10k
                { ...entry, id },
              ],
            }
          : s
      ),
    }));
  },

  clearSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, history: [] } : s
      ),
    })),

  setRunning: (val) => set({ isRunning: val }),

  renameSession: (sessionId, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    })),
}));
