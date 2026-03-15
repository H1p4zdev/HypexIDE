import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../theme/tokens';
import { useTerminalStore } from '../store/terminalStore';
import { HapticPatterns } from '../utils/haptics';

// ─── Simple command interpreter ───────────────────────────────────────────────
class SimpleInterpreter {
  private cwd: string = '/root';
  private env: Record<string, string> = {
    HOME: '/root',
    USER: 'root',
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    TERM: 'xterm-256color',
    LANG: 'en_US.UTF-8',
    PS1: '\\u@hypex:\\w$ ',
  };

  private virtualFS: Record<string, string | string[]> = {
    '/root': ['projects', '.bashrc', '.profile'],
    '/root/projects': [],
    '/etc': ['passwd', 'hostname', 'os-release'],
    '/etc/hostname': 'hypex-container',
    '/etc/os-release': 'NAME="Alpine Linux"\nVERSION="3.19"',
    '/proc/version': 'Linux version 5.15.0-hypex (root@hypex)',
  };

  execute(input: string): string {
    const [cmd, ...args] = input.trim().split(/\s+/);

    switch (cmd) {
      case '': return '';
      case 'echo': return args.join(' ');
      case 'pwd': return this.cwd;
      case 'whoami': return 'root';
      case 'hostname': return 'hypex-container';
      case 'uname': return args[0] === '-a'
        ? 'Linux hypex-container 5.15.0-hypex #1 SMP Mon Jan 1 00:00:00 UTC 2024 aarch64 Linux'
        : 'Linux';
      case 'date': return new Date().toString();
      case 'clear': return '\x1B[2J\x1B[H';

      case 'ls':
      case 'dir': {
        const target = args[0] ?? this.cwd;
        const path = target.startsWith('/') ? target : `${this.cwd}/${target}`;
        const contents = this.virtualFS[path];
        if (!contents) return `ls: ${target}: No such file or directory`;
        if (Array.isArray(contents)) return contents.join('  ') || '';
        return contents;
      }

      case 'cat': {
        if (!args[0]) return 'cat: no file specified';
        const path = args[0].startsWith('/') ? args[0] : `${this.cwd}/${args[0]}`;
        const content = this.virtualFS[path];
        if (!content) return `cat: ${args[0]}: No such file or directory`;
        if (Array.isArray(content)) return `cat: ${args[0]}: Is a directory`;
        return content;
      }

      case 'cd': {
        const target = args[0] ?? '/root';
        const newPath = target === '~' ? '/root'
          : target.startsWith('/') ? target
          : `${this.cwd}/${target}`;
        if (this.virtualFS[newPath] !== undefined || newPath === '/root') {
          this.cwd = newPath;
          return '';
        }
        return `cd: ${target}: No such file or directory`;
      }

      case 'mkdir': {
        if (!args[0]) return 'mkdir: missing operand';
        const path = args[0].startsWith('/') ? args[0] : `${this.cwd}/${args[0]}`;
        this.virtualFS[path] = [];
        return '';
      }

      case 'env':
        return Object.entries(this.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n');

      case 'export': {
        const [key, val] = (args[0] ?? '').split('=');
        if (key) this.env[key] = val ?? '';
        return '';
      }

      case 'python3':
      case 'python':
        return args[0] === '--version' || args[0] === '-V'
          ? 'Python 3.11.6'
          : 'python3: interactive mode not available (use a script file)';

      case 'node':
        return args[0] === '--version' || args[0] === '-v'
          ? 'v20.10.0'
          : 'node: interactive mode not available';

      case 'git':
        return this.handleGit(args);

      case 'help':
        return [
          'Available commands:',
          '  echo, pwd, ls, cat, cd, mkdir, env, export',
          '  uname, whoami, hostname, date, clear',
          '  python3 --version, node --version',
          '  git (init, status, add, commit)',
          '',
          'Note: This is a simulated shell. Use the PRoot container for full Linux.',
        ].join('\n');

      default:
        return `${cmd}: command not found (type 'help' for available commands)`;
    }
  }

  private handleGit(args: string[]): string {
    const sub = args[0];
    switch (sub) {
      case 'init': return 'Initialized empty Git repository in .git/';
      case 'status': return 'On branch main\nNothing to commit, working tree clean';
      case 'add': return '';
      case 'commit': {
        const mIdx = args.indexOf('-m');
        const msg = mIdx >= 0 ? args[mIdx + 1] : 'Update';
        return `[main abc1234] ${msg}\n 0 files changed`;
      }
      case '--version': return 'git version 2.43.0';
      default: return `git: '${sub}' is not a git command`;
    }
  }

  getCwd(): string { return this.cwd; }
  getPrompt(): string {
    return `root@hypex:${this.cwd.replace('/root', '~')}$ `;
  }
}

// ─── TerminalLine ─────────────────────────────────────────────────────────────
interface TerminalLineProps {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  prompt?: string;
}

function TerminalLine({ type, content, prompt }: TerminalLineProps) {
  const lineColor = {
    input: Colors.textDarkPrimary,
    output: Colors.textDarkSecondary,
    error: Colors.danger,
    system: Colors.info,
  }[type];

  return (
    <View style={styles.terminalLine}>
      {type === 'input' && (
        <Text style={styles.terminalPromptText}>{prompt}</Text>
      )}
      <Text style={[styles.terminalLineText, { color: lineColor }]} selectable>
        {content}
      </Text>
    </View>
  );
}

// ─── TerminalScreen ───────────────────────────────────────────────────────────
export default function TerminalScreen({ navigation }: any) {
  const { sessions, activeSessionId, createSession, appendEntry } = useTerminalStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const interpreter = useRef(new SimpleInterpreter()).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Ensure at least one session
  useEffect(() => {
    if (sessions.length === 0) {
      const id = createSession('/root');
      appendEntry(id, {
        type: 'system',
        content: 'Hypex IDE Terminal v1.0.0\nType \'help\' for available commands.\n',
        timestamp: new Date(),
      });
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const handleSubmit = () => {
    if (!input.trim() || !activeSession) return;

    HapticPatterns.light();
    const cmd = input.trim();

    // Add to history
    setHistory((h) => [cmd, ...h.slice(0, 49)]);
    setHistoryIndex(-1);

    // Log input
    appendEntry(activeSession.id, {
      type: 'input',
      content: cmd,
      timestamp: new Date(),
    });

    // Execute
    const output = interpreter.execute(cmd);
    if (output) {
      appendEntry(activeSession.id, {
        type: output.startsWith('\x1B') ? 'system'
          : output.includes('command not found') || output.includes('No such file')
            ? 'error'
            : 'output',
        content: output,
        timestamp: new Date(),
      });
    }

    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleNewSession = () => {
    const id = createSession('/root');
    HapticPatterns.medium();
    appendEntry(id, {
      type: 'system',
      content: 'New terminal session\n',
      timestamp: new Date(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terminal</Text>
        <TouchableOpacity onPress={handleNewSession} style={styles.headerBtn}>
          <Text style={styles.headerIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Session tabs */}
      {sessions.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sessionTabs}
          contentContainerStyle={styles.sessionTabsContent}
        >
          {sessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.sessionTab,
                s.id === activeSessionId && styles.sessionTabActive,
              ]}
              onPress={() => {}}
            >
              <Text style={styles.sessionTabText}>{s.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Terminal output */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.outputArea}
          contentContainerStyle={styles.outputContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {activeSession?.history.map((entry) => (
            <TerminalLine
              key={entry.id}
              type={entry.type}
              content={entry.content}
              prompt={interpreter.getPrompt()}
            />
          ))}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <Text style={styles.promptLabel}>{interpreter.getPrompt()}</Text>
          <TextInput
            ref={inputRef}
            style={styles.terminalInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            returnKeyType="send"
            blurOnSubmit={false}
            selectionColor={Colors.primary}
          />
          <TouchableOpacity onPress={handleSubmit} style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>↵</Text>
          </TouchableOpacity>
        </View>

        {/* Quick commands */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickCmds}
          contentContainerStyle={styles.quickCmdsContent}
        >
          {['ls', 'pwd', 'help', 'clear', 'git status'].map((cmd) => (
            <TouchableOpacity
              key={cmd}
              style={styles.quickCmd}
              onPress={() => {
                setInput(cmd);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <Text style={styles.quickCmdText}>{cmd}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.editorBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.editorGutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.editorLine,
    paddingHorizontal: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 24,
    color: Colors.textDarkPrimary,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textDarkPrimary,
    textAlign: 'center',
  },
  sessionTabs: {
    backgroundColor: Colors.editorGutter,
    maxHeight: 36,
  },
  sessionTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  sessionTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  sessionTabActive: {
    backgroundColor: Colors.editorBg,
  },
  sessionTabText: {
    fontSize: Typography.xs,
    color: Colors.textDarkSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  outputArea: {
    flex: 1,
    padding: Spacing.sm,
  },
  outputContent: {
    paddingBottom: 8,
    gap: 2,
  },
  terminalLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  terminalPromptText: {
    fontSize: 13,
    color: Colors.syntaxString,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: Typography.bold,
  },
  terminalLineText: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    flex: 1,
    flexWrap: 'wrap',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.editorGutter,
    borderTopWidth: 1,
    borderTopColor: Colors.editorLine,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
  promptLabel: {
    fontSize: 13,
    color: Colors.syntaxString,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: Typography.bold,
  },
  terminalInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textDarkPrimary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    padding: 0,
    minHeight: 24,
  },
  sendBtn: {
    width: 32,
    height: 32,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: Typography.bold,
  },
  quickCmds: {
    backgroundColor: Colors.editorGutter,
    borderTopWidth: 1,
    borderTopColor: Colors.editorLine,
    maxHeight: 44,
  },
  quickCmdsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  quickCmd: {
    backgroundColor: Colors.editorLine,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickCmdText: {
    fontSize: 12,
    color: Colors.textDarkSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
