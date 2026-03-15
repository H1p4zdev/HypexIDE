import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow, Animation } from '../theme/tokens';
import { useEditorStore } from '../store/editorStore';
import { useTheme } from '../hooks/useTheme';
import { HapticPatterns } from '../utils/haptics';
import { IconButton } from '../components/common';
import { FadeIn } from '../components/animations';
import type { EditorTab, FileNode } from '../types';
import { detectLanguage } from '../utils/files';

// ─── Syntax Highlighting (simple regex-based) ─────────────────────────────────
function tokenize(code: string, language: string): Array<{ text: string; type: string }> {
  const tokens: Array<{ text: string; type: string }> = [];
  const patterns = getSyntaxPatterns(language);
  let remaining = code;

  while (remaining.length > 0) {
    let matched = false;
    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match && match.index === 0) {
        tokens.push({ text: match[0], type });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ text: remaining[0], type: 'plain' });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

function getSyntaxPatterns(language: string) {
  const basePatterns = [
    { regex: /^(\/\/.*|#.*|\/\*[\s\S]*?\*\/)/, type: 'comment' },
    { regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/, type: 'string' },
    { regex: /^0x[0-9a-fA-F]+|^\d+\.?\d*/, type: 'number' },
  ];

  const keywords: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'return', 'import', 'export', 'from', 'if', 'else', 'for', 'while', 'async', 'await', 'extends', 'implements', 'new', 'this', 'super', 'void', 'boolean', 'string', 'number'],
    javascript: ['const', 'let', 'var', 'function', 'class', 'return', 'import', 'export', 'if', 'else', 'for', 'while', 'async', 'await', 'new', 'this'],
    python: ['def', 'class', 'return', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'with', 'as', 'try', 'except', 'finally', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False'],
    rust: ['fn', 'let', 'mut', 'pub', 'use', 'mod', 'impl', 'struct', 'enum', 'trait', 'match', 'if', 'else', 'for', 'while', 'return', 'self', 'Self', 'super'],
    go: ['func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'defer', 'go', 'chan', 'map', 'nil'],
  };

  const kws = keywords[language] ?? keywords.typescript;
  const kwPattern = {
    regex: new RegExp(`^\\b(${kws.join('|')})\\b`),
    type: 'keyword',
  };

  return [
    ...basePatterns,
    kwPattern,
    { regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*(?=\()/, type: 'function' },
    { regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/, type: 'variable' },
    { regex: /^[^\S\n]+/, type: 'whitespace' },
    { regex: /^\n/, type: 'newline' },
    { regex: /^[^\w\s]/, type: 'operator' },
  ];
}

const SYNTAX_COLORS: Record<string, string> = {
  keyword: Colors.syntaxKeyword,
  string: Colors.syntaxString,
  number: Colors.syntaxNumber,
  comment: Colors.syntaxComment,
  function: Colors.syntaxFunction,
  variable: Colors.syntaxVariable,
  operator: Colors.syntaxOperator,
  plain: Colors.syntaxVariable,
  whitespace: 'transparent',
  newline: 'transparent',
};

// ─── Syntax-highlighted code view ─────────────────────────────────────────────
function SyntaxHighlightedCode({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  return (
    <View>
      {lines.map((line, lineIdx) => {
        const tokens = tokenize(line, language);
        return (
          <View key={lineIdx} style={styles.codeLine}>
            {/* Line number */}
            <Text style={styles.lineNumber}>{lineIdx + 1}</Text>
            {/* Tokens */}
            <View style={styles.lineContent}>
              {tokens.map((tok, tokIdx) => (
                <Text
                  key={tokIdx}
                  style={[
                    styles.codeToken,
                    { color: SYNTAX_COLORS[tok.type] ?? Colors.syntaxVariable },
                  ]}
                >
                  {tok.text}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Editor Tab Bar ───────────────────────────────────────────────────────────
function EditorTabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
}: {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabBar}
      contentContainerStyle={styles.tabBarContent}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => {
              HapticPatterns.tabSwitch();
              onSelect(tab.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabName, isActive && styles.tabNameActive]} numberOfLines={1}>
              {tab.isDirty ? '● ' : ''}{tab.fileName}
            </Text>
            <TouchableOpacity
              onPress={() => {
                HapticPatterns.light();
                onClose(tab.id);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.tabClose}
            >
              <Text style={styles.tabCloseText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── File Tree Item ───────────────────────────────────────────────────────────
function FileTreeItem({
  node,
  depth,
  onPress,
  isActive,
}: {
  node: FileNode;
  depth: number;
  onPress: (node: FileNode) => void;
  isActive: boolean;
}) {
  const isDir = node.type === 'directory';
  return (
    <TouchableOpacity
      style={[
        styles.fileItem,
        { paddingLeft: Spacing.sm + depth * 16 },
        isActive && styles.fileItemActive,
      ]}
      onPress={() => onPress(node)}
      activeOpacity={0.7}
    >
      <Text style={styles.fileIcon}>
        {isDir ? (node.isOpen ? '📂' : '📁') : '📄'}
      </Text>
      <Text
        style={[
          styles.fileName,
          isActive && styles.fileNameActive,
        ]}
        numberOfLines={1}
      >
        {node.name}
      </Text>
      {node.isDirty && <View style={styles.dirtyDot} />}
    </TouchableOpacity>
  );
}

// ─── Bottom Panel (Terminal placeholder) ──────────────────────────────────────
function BottomPanel({ height, onResize }: { height: number; onResize: (h: number) => void }) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems'>('terminal');

  return (
    <View style={[styles.bottomPanel, { height }]}>
      {/* Panel header */}
      <View style={styles.panelHeader}>
        {(['terminal', 'problems'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.panelTab, activeTab === tab && styles.panelTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.panelTabText, activeTab === tab && styles.panelTabTextActive]}>
              {tab === 'terminal' ? '🖥️ Terminal' : '⚠️ Problems'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <IconButton icon="✕" onPress={() => onResize(0)} size={14} />
      </View>

      {/* Panel content */}
      <View style={styles.panelContent}>
        {activeTab === 'terminal' ? (
          <View style={styles.terminalInline}>
            <Text style={styles.terminalPrompt}>
              <Text style={styles.terminalUser}>root@hypex</Text>
              <Text style={styles.terminalAt}>:</Text>
              <Text style={styles.terminalPath}>~/project</Text>
              <Text style={styles.terminalDollar}> $</Text>
            </Text>
            <Text style={styles.terminalCursor}>█</Text>
          </View>
        ) : (
          <View style={styles.problemsEmpty}>
            <Text style={styles.problemsEmptyText}>✓ No problems detected</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── EditorScreen ─────────────────────────────────────────────────────────────
export default function EditorScreen({ navigation, route }: any) {
  const theme = useTheme();
  const {
    tabs, activeTabId, isSidebarOpen, isTerminalOpen, terminalHeight,
    fileTree,
    setActiveTab, closeTab, toggleSidebar, toggleTerminal,
    setTerminalHeight, updateTabContent, saveTab,
  } = useEditorStore();

  const [isEditing, setIsEditing] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(isSidebarOpen ? 260 : 0)).current;

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleToggleSidebar = () => {
    HapticPatterns.light();
    toggleSidebar();
    Animated.spring(sidebarAnim, {
      toValue: isSidebarOpen ? 0 : 260,
      ...Animation.springSnappy,
      useNativeDriver: false,
    }).start();
  };

  const handleSave = () => {
    if (activeTabId) {
      saveTab(activeTabId);
      HapticPatterns.fileSave();
    }
  };

  const handleRun = () => {
    HapticPatterns.medium();
    if (!isTerminalOpen) toggleTerminal();
  };

  const handleShare = () => {
    HapticPatterns.light();
  };

  return (
    <SafeAreaView
      style={[styles.editorContainer, { backgroundColor: Colors.editorBg }]}
      edges={['top']}
    >
      {/* Top Bar */}
      <FadeIn style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topBarBtn}
        >
          <Text style={styles.topBarIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToggleSidebar} style={styles.topBarBtn}>
          <Text style={styles.topBarIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.topBarTitle}>
          {activeTab && (
            <>
              <Text style={styles.topBarFileName} numberOfLines={1}>
                {activeTab.fileName}
              </Text>
              {activeTab.isDirty && (
                <View style={styles.dirtyIndicator} />
              )}
            </>
          )}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.topBarBtn}>
          <Text style={styles.topBarIcon}>💾</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRun} style={styles.topBarBtn}>
          <Text style={styles.topBarIcon}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.topBarBtn}>
          <Text style={styles.topBarIcon}>↑</Text>
        </TouchableOpacity>
      </FadeIn>

      {/* Tab Bar */}
      {tabs.length > 0 && (
        <EditorTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTab}
          onClose={closeTab}
        />
      )}

      {/* Main area */}
      <View style={styles.mainArea}>
        {/* Sidebar */}
        <Animated.View style={[styles.sidebar, { width: sidebarAnim }]}>
          <ScrollView style={styles.fileTree} showsVerticalScrollIndicator={false}>
            <Text style={styles.sidebarTitle}>EXPLORER</Text>
            {fileTree.length === 0 ? (
              <View style={styles.sidebarEmpty}>
                <Text style={styles.sidebarEmptyText}>📂 No folder open</Text>
              </View>
            ) : (
              fileTree.map((node) => (
                <FileTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  isActive={activeTab?.fileId === node.id}
                  onPress={(n) => {
                    HapticPatterns.light();
                  }}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>

        {/* Code Editor Area */}
        <KeyboardAvoidingView
          style={styles.codeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={160}
        >
          {activeTab ? (
            <ScrollView
              style={styles.codeScroll}
              horizontal={false}
              showsVerticalScrollIndicator={true}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {isEditing ? (
                  <TextInput
                    style={styles.codeInput}
                    multiline
                    value={activeTab.content}
                    onChangeText={(text) => updateTabContent(activeTab.id, text)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    keyboardType="default"
                    onBlur={() => setIsEditing(false)}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    activeOpacity={1}
                  >
                    <SyntaxHighlightedCode
                      code={activeTab.content || '// Start coding here\n'}
                      language={activeTab.language}
                    />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={styles.noFileOpen}>
              <Text style={styles.noFileIcon}>📝</Text>
              <Text style={styles.noFileTitle}>No file open</Text>
              <Text style={styles.noFileSubtitle}>
                Open a file from the sidebar or create a new one
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>

      {/* Terminal panel */}
      {isTerminalOpen && (
        <BottomPanel
          height={terminalHeight}
          onResize={(h) => {
            if (h === 0) toggleTerminal();
            else setTerminalHeight(h);
          }}
        />
      )}

      {/* Bottom toolbar */}
      <View style={styles.statusBar}>
        <TouchableOpacity onPress={handleToggleSidebar} style={styles.statusBarItem}>
          <Text style={styles.statusBarText}>
            {activeTab?.language ?? 'Plain Text'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleTerminal()}
          style={[styles.statusBarItem, styles.statusBarRight]}
        >
          <Text style={styles.statusBarText}>🖥️ Terminal</Text>
        </TouchableOpacity>

        {activeTab && (
          <Text style={styles.statusBarText}>
            Ln {activeTab.cursorPosition.line}, Col {activeTab.cursorPosition.column}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  editorContainer: {
    flex: 1,
    backgroundColor: Colors.editorBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.editorGutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.editorLine,
    paddingHorizontal: 4,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarIcon: {
    fontSize: 20,
    color: Colors.textDarkPrimary,
  },
  topBarTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  topBarFileName: {
    fontSize: Typography.sm,
    color: Colors.textDarkPrimary,
    fontWeight: Typography.medium,
  },
  dirtyIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  tabBar: {
    backgroundColor: Colors.editorGutter,
    borderBottomWidth: 1,
    borderBottomColor: Colors.editorLine,
    maxHeight: 40,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.editorLine,
    maxWidth: 160,
    gap: 8,
  },
  tabActive: {
    backgroundColor: Colors.editorBg,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
  },
  tabName: {
    fontSize: Typography.xs,
    color: Colors.textDarkTertiary,
    flex: 1,
  },
  tabNameActive: {
    color: Colors.textDarkPrimary,
  },
  tabClose: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCloseText: {
    fontSize: 10,
    color: Colors.textDarkTertiary,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sidebar: {
    backgroundColor: Colors.editorGutter,
    borderRightWidth: 1,
    borderRightColor: Colors.editorLine,
    overflow: 'hidden',
  },
  fileTree: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 10,
    color: Colors.textDarkTertiary,
    fontWeight: Typography.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidebarEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  sidebarEmptyText: {
    fontSize: Typography.sm,
    color: Colors.textDarkTertiary,
    textAlign: 'center',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    gap: 6,
  },
  fileItemActive: {
    backgroundColor: Colors.editorSelection,
  },
  fileIcon: { fontSize: 14 },
  fileName: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textDarkSecondary,
  },
  fileNameActive: {
    color: Colors.textDarkPrimary,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  codeArea: {
    flex: 1,
    backgroundColor: Colors.editorBg,
  },
  codeScroll: {
    flex: 1,
    padding: Spacing.sm,
  },
  codeLine: {
    flexDirection: 'row',
    minHeight: 20,
  },
  lineNumber: {
    width: 40,
    fontSize: 13,
    color: Colors.syntaxComment,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    textAlign: 'right',
    paddingRight: 12,
    lineHeight: 20,
    userSelect: 'none',
  },
  lineContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  codeToken: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    lineHeight: 20,
  },
  codeInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.syntaxVariable,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    lineHeight: 20,
    padding: 0,
    textAlignVertical: 'top',
    minWidth: '100%',
  },
  noFileOpen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noFileIcon: { fontSize: 48 },
  noFileTitle: {
    fontSize: Typography.md,
    color: Colors.textDarkPrimary,
    fontWeight: Typography.semibold,
  },
  noFileSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textDarkTertiary,
    textAlign: 'center',
    maxWidth: 240,
  },
  bottomPanel: {
    backgroundColor: Colors.editorGutter,
    borderTopWidth: 1,
    borderTopColor: Colors.editorLine,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.editorLine,
    gap: 4,
  },
  panelTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  panelTabActive: {
    backgroundColor: Colors.editorBg,
  },
  panelTabText: {
    fontSize: Typography.xs,
    color: Colors.textDarkTertiary,
    fontWeight: Typography.medium,
  },
  panelTabTextActive: {
    color: Colors.textDarkPrimary,
  },
  panelContent: {
    flex: 1,
    padding: Spacing.sm,
  },
  terminalInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  terminalPrompt: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 13,
  },
  terminalUser: { color: '#A6E3A1' },
  terminalAt: { color: Colors.textDarkPrimary },
  terminalPath: { color: '#89B4FA' },
  terminalDollar: { color: Colors.textDarkPrimary },
  terminalCursor: {
    color: Colors.textDarkPrimary,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  problemsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemsEmptyText: {
    fontSize: Typography.sm,
    color: Colors.syntaxComment,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  statusBar: {
    height: 28,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  statusBarItem: {
    height: '100%',
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  statusBarRight: {
    marginLeft: 'auto',
  },
  statusBarText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: Typography.medium,
  },
});
