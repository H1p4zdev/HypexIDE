import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme/tokens';
import { useTheme } from '../hooks/useTheme';
import { HapticPatterns } from '../utils/haptics';
import { HypexButton, Badge, Divider, EmptyState } from '../components/common';
import { FadeIn, SlideUp } from '../components/animations';
import type { GitFile, GitBranch } from '../types';

// ─── Mock git data ────────────────────────────────────────────────────────────
const MOCK_BRANCHES: GitBranch[] = [
  { name: 'main', isRemote: false, isCurrent: true },
  { name: 'feature/editor-tabs', isRemote: false, isCurrent: false },
  { name: 'origin/main', isRemote: true, isCurrent: false },
];

const MOCK_STAGED: GitFile[] = [
  { path: 'src/screens/EditorScreen.tsx', status: 'M' },
  { path: 'src/components/common/index.tsx', status: 'A' },
];

const MOCK_UNSTAGED: GitFile[] = [
  { path: 'src/store/editorStore.ts', status: 'M' },
  { path: 'package.json', status: 'M' },
  { path: 'src/utils/haptics.ts', status: '?' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  M: { label: 'M', color: Colors.warning },
  A: { label: 'A', color: Colors.success },
  D: { label: 'D', color: Colors.danger },
  R: { label: 'R', color: Colors.info },
  '?': { label: 'U', color: Colors.textTertiary },
};

// ─── GitFileRow ───────────────────────────────────────────────────────────────
function GitFileRow({
  file,
  isStaged,
  onToggle,
}: {
  file: GitFile;
  isStaged: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const status = STATUS_LABELS[file.status] ?? { label: file.status, color: Colors.textTertiary };
  const parts = file.path.split('/');
  const filename = parts.pop()!;
  const dir = parts.join('/');

  return (
    <TouchableOpacity
      style={[styles.fileRow, { backgroundColor: theme.bg.card }]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.fileStatusBadge,
          { backgroundColor: status.color + '22' },
        ]}
      >
        <Text style={[styles.fileStatusText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: theme.text.primary }]}>{filename}</Text>
        {dir.length > 0 && (
          <Text style={[styles.fileDir, { color: theme.text.tertiary }]}>{dir}/</Text>
        )}
      </View>
      <Text style={{ color: isStaged ? Colors.success : Colors.textTertiary, fontSize: 16 }}>
        {isStaged ? '✓' : '+'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── GitScreen ────────────────────────────────────────────────────────────────
export default function GitScreen({ navigation }: any) {
  const theme = useTheme();
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [staged, setStaged] = useState<GitFile[]>(MOCK_STAGED);
  const [unstaged, setUnstaged] = useState<GitFile[]>(MOCK_UNSTAGED);
  const [showBranches, setShowBranches] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleStageFile = (file: GitFile) => {
    HapticPatterns.light();
    setUnstaged((u) => u.filter((f) => f.path !== file.path));
    setStaged((s) => [...s, file]);
  };

  const handleUnstageFile = (file: GitFile) => {
    HapticPatterns.light();
    setStaged((s) => s.filter((f) => f.path !== file.path));
    setUnstaged((u) => [...u, file]);
  };

  const handleStageAll = () => {
    HapticPatterns.medium();
    setStaged((s) => [...s, ...unstaged]);
    setUnstaged([]);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || staged.length === 0) return;
    HapticPatterns.gitCommit();
    setIsCommitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsCommitting(false);
    setStaged([]);
    setCommitMessage('');
  };

  const canCommit = staged.length > 0 && commitMessage.trim().length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg.secondary }]}
    >
      {/* Header */}
      <FadeIn style={[styles.header, { backgroundColor: theme.bg.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerIcon, { color: theme.text.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Source Control</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Text style={[styles.headerIcon, { color: theme.text.secondary }]}>↻</Text>
        </TouchableOpacity>
      </FadeIn>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Branch selector */}
        <SlideUp delay={60}>
          <TouchableOpacity
            style={[styles.branchSelector, { backgroundColor: theme.bg.primary }, Shadow.sm]}
            onPress={() => {
              HapticPatterns.medium();
              setShowBranches(!showBranches);
            }}
          >
            <Text style={styles.branchIcon}>🌿</Text>
            <Text style={[styles.branchName, { color: theme.text.primary }]}>
              {currentBranch}
            </Text>
            <Badge label="0 ahead · 0 behind" color={Colors.textSecondary} />
            <Text style={{ color: theme.text.tertiary, fontSize: 16, marginLeft: 'auto' }}>
              {showBranches ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showBranches && (
            <View style={[styles.branchList, { backgroundColor: theme.bg.primary }]}>
              {MOCK_BRANCHES.map((branch) => (
                <TouchableOpacity
                  key={branch.name}
                  style={[
                    styles.branchItem,
                    branch.name === currentBranch && styles.branchItemActive,
                  ]}
                  onPress={() => {
                    HapticPatterns.light();
                    setCurrentBranch(branch.name);
                    setShowBranches(false);
                  }}
                >
                  <Text style={{ fontSize: 14, color: branch.isRemote ? Colors.info : Colors.success }}>
                    {branch.isRemote ? '🔀' : '🌿'}
                  </Text>
                  <Text style={[styles.branchItemName, { color: theme.text.primary }]}>
                    {branch.name}
                  </Text>
                  {branch.isCurrent && (
                    <Text style={{ color: Colors.success, fontSize: 14 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SlideUp>

        {/* Commit box */}
        <SlideUp delay={100}>
          <View style={[styles.commitBox, { backgroundColor: theme.bg.primary }, Shadow.sm]}>
            <TextInput
              style={[styles.commitInput, { color: theme.text.primary, borderColor: theme.border }]}
              placeholder="Commit message..."
              placeholderTextColor={theme.text.tertiary}
              value={commitMessage}
              onChangeText={setCommitMessage}
              multiline
              maxLength={72}
              returnKeyType="done"
            />
            <View style={styles.commitFooter}>
              <Text style={[styles.commitCharCount, {
                color: commitMessage.length > 60 ? Colors.warning : theme.text.tertiary
              }]}>
                {commitMessage.length}/72
              </Text>
              <HypexButton
                title={isCommitting ? 'Committing...' : `Commit (${staged.length})`}
                onPress={handleCommit}
                disabled={!canCommit}
                loading={isCommitting}
                size="sm"
              />
            </View>
          </View>
        </SlideUp>

        {/* Staged changes */}
        <SlideUp delay={140}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Staged Changes ({staged.length})
              </Text>
              {staged.length > 0 && (
                <TouchableOpacity onPress={() => {
                  HapticPatterns.light();
                  setUnstaged((u) => [...u, ...staged]);
                  setStaged([]);
                }}>
                  <Text style={styles.sectionAction}>Unstage all</Text>
                </TouchableOpacity>
              )}
            </View>
            {staged.length === 0 ? (
              <Text style={[styles.emptySection, { color: theme.text.tertiary }]}>
                No staged files
              </Text>
            ) : (
              <View style={styles.fileList}>
                {staged.map((file) => (
                  <GitFileRow
                    key={file.path}
                    file={file}
                    isStaged
                    onToggle={() => handleUnstageFile(file)}
                  />
                ))}
              </View>
            )}
          </View>
        </SlideUp>

        {/* Unstaged changes */}
        <SlideUp delay={180}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Changes ({unstaged.length})
              </Text>
              {unstaged.length > 0 && (
                <TouchableOpacity onPress={handleStageAll}>
                  <Text style={styles.sectionAction}>Stage all</Text>
                </TouchableOpacity>
              )}
            </View>
            {unstaged.length === 0 ? (
              <EmptyState
                icon="✅"
                title="No changes"
                subtitle="Working tree is clean"
              />
            ) : (
              <View style={styles.fileList}>
                {unstaged.map((file) => (
                  <GitFileRow
                    key={file.path}
                    file={file}
                    isStaged={false}
                    onToggle={() => handleStageFile(file)}
                  />
                ))}
              </View>
            )}
          </View>
        </SlideUp>

        {/* Push/Pull actions */}
        <SlideUp delay={220}>
          <View style={styles.syncActions}>
            <HypexButton
              title="↓ Pull"
              variant="secondary"
              style={styles.syncBtn}
              onPress={() => HapticPatterns.medium()}
            />
            <HypexButton
              title="↑ Push"
              style={styles.syncBtn}
              onPress={() => HapticPatterns.medium()}
            />
          </View>
        </SlideUp>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 24 },
  headerTitle: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  branchIcon: { fontSize: 20 },
  branchName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  branchList: {
    borderRadius: Radius.lg,
    marginTop: 4,
    overflow: 'hidden',
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  branchItemActive: {
    backgroundColor: Colors.primary + '11',
  },
  branchItemName: {
    flex: 1,
    fontSize: Typography.base,
  },
  commitBox: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  commitInput: {
    fontSize: Typography.base,
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    textAlignVertical: 'top',
  },
  commitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commitCharCount: {
    fontSize: Typography.xs,
  },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionAction: {
    fontSize: Typography.sm,
    color: Colors.primary,
  },
  emptySection: {
    fontSize: Typography.sm,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  fileList: { gap: 4 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  fileStatusBadge: {
    width: 22,
    height: 22,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileStatusText: {
    fontSize: 11,
    fontWeight: Typography.bold,
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },
  fileDir: {
    fontSize: Typography.xs,
  },
  syncActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  syncBtn: {
    flex: 1,
  },
});
