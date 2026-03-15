import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme/tokens';
import { useEditorStore } from '../store/editorStore';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../hooks/useTheme';
import {
  HypexButton,
  SectionHeader,
  EmptyState,
  Badge,
  ProgressBar,
} from '../components/common';
import { FadeIn, SlideUp, ScaleIn, SkeletonLoader } from '../components/animations';
import { HapticPatterns } from '../utils/haptics';
import { QUICK_ACTIONS, PROJECT_TEMPLATES } from '../constants';
import { formatFileSize } from '../utils/files';
import type { Project } from '../types';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { recentProjects, currentProject } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading] = useState(false);

  const greeting = getGreeting();

  const filteredProjects = recentProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    HapticPatterns.light();
    await new Promise((r) => setTimeout(r, 1200));
    setIsRefreshing(false);
  };

  const handleQuickAction = (action: string) => {
    HapticPatterns.medium();
    switch (action) {
      case 'CREATE_PROJECT':
        // Show template bottom sheet
        break;
      case 'OPEN_FOLDER':
        // Open document picker
        break;
      case 'OPEN_TERMINAL':
        navigation.navigate('Terminal');
        break;
      case 'GIT_CLONE':
        // Show git clone modal
        break;
    }
  };

  const handleOpenProject = (project: Project) => {
    HapticPatterns.medium();
    navigation.navigate('Editor', { fileId: project.id, filePath: project.path });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg.secondary }]}
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <FadeIn style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text.secondary }]}>
              {greeting}
            </Text>
            <Text style={[styles.headline, { color: theme.text.primary }]}>
              Hypex IDE
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: Colors.primary + '22' }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.avatarText}>⚡</Text>
          </TouchableOpacity>
        </FadeIn>

        {/* Search */}
        <SlideUp delay={80} style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.bg.primary }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search projects..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </SlideUp>

        {/* Quick Actions */}
        <SlideUp delay={120}>
          <SectionHeader title="Quick Actions" style={styles.sectionHeader} />
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  { backgroundColor: theme.bg.primary },
                  Shadow.sm,
                ]}
                onPress={() => handleQuickAction(action.action)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={[styles.quickActionLabel, { color: theme.text.primary }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SlideUp>

        {/* Recent Projects */}
        <SlideUp delay={160}>
          <SectionHeader
            title="Recent Projects"
            action={
              recentProjects.length > 0
                ? { label: 'See All', onPress: () => {} }
                : undefined
            }
            style={styles.sectionHeader}
          />

          {isLoading ? (
            <View style={styles.projectList}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.projectCard, { backgroundColor: theme.bg.primary }]}
                >
                  <SkeletonLoader width={48} height={48} borderRadius={Radius.md} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <SkeletonLoader width="60%" height={14} />
                    <SkeletonLoader width="80%" height={11} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon="📂"
              title="No projects yet"
              subtitle="Create a new project or open an existing folder to get started."
              action={{ label: 'New Project', onPress: () => handleQuickAction('CREATE_PROJECT') }}
            />
          ) : (
            <View style={styles.projectList}>
              {filteredProjects.map((project, i) => (
                <ScaleIn key={project.id} delay={i * 40}>
                  <ProjectCard project={project} onPress={() => handleOpenProject(project)} theme={theme} />
                </ScaleIn>
              ))}
            </View>
          )}
        </SlideUp>

        {/* Templates */}
        <SlideUp delay={200}>
          <SectionHeader title="Templates" style={styles.sectionHeader} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesScroll}
          >
            {PROJECT_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[styles.templateCard, { backgroundColor: theme.bg.primary }, Shadow.sm]}
                onPress={() => {
                  HapticPatterns.medium();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.templateIcon}>{template.icon}</Text>
                <Text style={[styles.templateName, { color: theme.text.primary }]}>
                  {template.name}
                </Text>
                <Text style={[styles.templateDesc, { color: theme.text.secondary }]}>
                  {template.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SlideUp>

        {/* Storage Indicator */}
        <SlideUp delay={240}>
          <View style={[styles.storageCard, { backgroundColor: theme.bg.primary }, Shadow.sm]}>
            <View style={styles.storageHeader}>
              <Text style={styles.storageIcon}>💾</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.storageTitle, { color: theme.text.primary }]}>
                  Storage
                </Text>
                <Text style={[styles.storageSubtitle, { color: theme.text.secondary }]}>
                  {formatFileSize(128 * 1024 * 1024)} used of{' '}
                  {formatFileSize(512 * 1024 * 1024)}
                </Text>
              </View>
              <Text style={[styles.storagePercent, { color: Colors.primary }]}>25%</Text>
            </View>
            <ProgressBar progress={0.25} style={{ marginTop: 12 }} />
          </View>
        </SlideUp>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onPress, theme }: {
  project: Project;
  onPress: () => void;
  theme: any;
}) {
  const languageColors: Record<string, string> = {
    typescript: Colors.info,
    javascript: Colors.warning,
    python: Colors.success,
    rust: Colors.warning,
    go: Colors.info,
    default: Colors.textTertiary,
  };

  const color = languageColors[project.language] ?? languageColors.default;
  const timeAgo = formatTimeAgo(project.lastOpenedAt ?? project.updatedAt);

  return (
    <TouchableOpacity
      style={[styles.projectCard, { backgroundColor: theme.bg.primary }, Shadow.sm]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.projectIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.projectIconEmoji}>
          {getLanguageEmoji(project.language)}
        </Text>
      </View>
      <View style={styles.projectInfo}>
        <Text style={[styles.projectName, { color: theme.text.primary }]} numberOfLines={1}>
          {project.name}
        </Text>
        <Text style={[styles.projectMeta, { color: theme.text.secondary }]} numberOfLines={1}>
          {project.description ?? project.path}
        </Text>
        <View style={styles.projectTags}>
          <Badge label={project.language} color={color} size="sm" />
          <Text style={[styles.timeAgo, { color: theme.text.tertiary }]}>{timeAgo}</Text>
        </View>
      </View>
      <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getLanguageEmoji(lang: string): string {
  const map: Record<string, string> = {
    typescript: '⚡', javascript: '🟨', python: '🐍',
    rust: '🦀', go: '🐹', c: '©️', cpp: '🔷',
    java: '☕', kotlin: '🎯', swift: '🐦',
  };
  return map[lang] ?? '📁';
}

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    letterSpacing: Typography.letterSpacingWide,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    letterSpacing: Typography.letterSpacingTight,
    marginTop: 2,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22 },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    padding: 0,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickActionCard: {
    width: '47%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionIcon: { fontSize: 28, marginBottom: 4 },
  quickActionLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  projectList: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconEmoji: { fontSize: 24 },
  projectInfo: { flex: 1, gap: 3 },
  projectName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  projectMeta: {
    fontSize: Typography.xs,
  },
  projectTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  timeAgo: { fontSize: Typography.xs },
  templatesScroll: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  templateCard: {
    width: 140,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  templateIcon: { fontSize: 32, marginBottom: 4 },
  templateName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  templateDesc: { fontSize: Typography.xs },
  storageCard: {
    marginHorizontal: Spacing.base,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageIcon: { fontSize: 28 },
  storageTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  storageSubtitle: { fontSize: Typography.xs, marginTop: 2 },
  storagePercent: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
});
