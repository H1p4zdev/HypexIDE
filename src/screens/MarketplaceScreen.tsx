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
import { Badge, ProgressBar } from '../components/common';
import { FadeIn, SlideUp, SkeletonLoader } from '../components/animations';
import type { HypexExtension, ExtensionCategory } from '../types';

// ─── Mock extensions ──────────────────────────────────────────────────────────
const MOCK_EXTENSIONS: HypexExtension[] = [
  {
    id: 'rust-analyzer',
    name: 'rust-analyzer',
    version: '0.3.1820',
    description: 'Rust language support with IDE features',
    author: 'rust-lang',
    publisher: 'rust-lang',
    categories: ['languages'],
    rating: 4.9,
    downloads: 85000,
    isInstalled: false,
    isFeatured: true,
    icon: '🦀',
  },
  {
    id: 'prettier',
    name: 'Prettier - Code formatter',
    version: '10.4.0',
    description: 'Code formatter using prettier',
    author: 'Prettier',
    publisher: 'esbenp',
    categories: ['formatters'],
    rating: 4.8,
    downloads: 120000,
    isInstalled: true,
    isFeatured: true,
    icon: '✨',
  },
  {
    id: 'eslint',
    name: 'ESLint',
    version: '2.4.4',
    description: 'Integrates ESLint into Hypex',
    author: 'Microsoft',
    publisher: 'dbaeumer',
    categories: ['linters'],
    rating: 4.7,
    downloads: 95000,
    isInstalled: false,
    isFeatured: true,
    icon: '🔍',
  },
  {
    id: 'dracula-theme',
    name: 'Dracula Official',
    version: '3.1.0',
    description: 'Official Dracula Theme',
    author: 'Dracula Theme',
    publisher: 'dracula-theme',
    categories: ['themes'],
    rating: 4.8,
    downloads: 78000,
    isInstalled: false,
    icon: '🧛',
  },
  {
    id: 'vim-keybindings',
    name: 'Vim Keybindings',
    version: '1.25.2',
    description: 'Vim-style keybindings for Hypex',
    author: 'Community',
    publisher: 'vscodevim',
    categories: ['keymaps'],
    rating: 4.6,
    downloads: 55000,
    isInstalled: false,
    icon: '⌨️',
  },
  {
    id: 'python-extension',
    name: 'Python',
    version: '2023.22.1',
    description: 'Python language support, linting, formatting',
    author: 'Microsoft',
    publisher: 'ms-python',
    categories: ['languages'],
    rating: 4.8,
    downloads: 110000,
    isInstalled: true,
    icon: '🐍',
  },
];

const CATEGORIES: Array<{ id: ExtensionCategory | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'languages', label: 'Languages', icon: '📝' },
  { id: 'themes', label: 'Themes', icon: '🎨' },
  { id: 'linters', label: 'Linters', icon: '🔍' },
  { id: 'formatters', label: 'Formatters', icon: '✨' },
  { id: 'snippets', label: 'Snippets', icon: '📋' },
  { id: 'keymaps', label: 'Keymaps', icon: '⌨️' },
];

// ─── ExtensionCard ────────────────────────────────────────────────────────────
function ExtensionCard({
  extension,
  onInstall,
  installing,
}: {
  extension: HypexExtension;
  onInstall: (ext: HypexExtension) => void;
  installing: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.extCard, { backgroundColor: theme.bg.card }, Shadow.sm]}>
      <View style={styles.extCardHeader}>
        <Text style={styles.extIcon}>{extension.icon ?? '🧩'}</Text>
        <View style={styles.extInfo}>
          <Text style={[styles.extName, { color: theme.text.primary }]} numberOfLines={1}>
            {extension.name}
          </Text>
          <Text style={[styles.extPublisher, { color: theme.text.tertiary }]}>
            {extension.publisher} · v{extension.version}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.installBtn,
            {
              backgroundColor: extension.isInstalled
                ? Colors.success + '22'
                : Colors.primary,
            },
          ]}
          onPress={() => {
            if (!extension.isInstalled) {
              HapticPatterns.medium();
              onInstall(extension);
            }
          }}
          disabled={extension.isInstalled || installing}
        >
          {installing ? (
            <Text style={styles.installBtnText}>...</Text>
          ) : (
            <Text
              style={[
                styles.installBtnText,
                { color: extension.isInstalled ? Colors.success : '#FFF' },
              ]}
            >
              {extension.isInstalled ? '✓' : '↓'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.extDesc, { color: theme.text.secondary }]} numberOfLines={2}>
        {extension.description}
      </Text>

      <View style={styles.extFooter}>
        <Text style={[styles.extStat, { color: theme.text.tertiary }]}>
          ⭐ {extension.rating?.toFixed(1)}
        </Text>
        <Text style={[styles.extStat, { color: theme.text.tertiary }]}>
          ↓ {(extension.downloads ?? 0).toLocaleString()}
        </Text>
        {extension.categories.map((cat) => (
          <Badge key={cat} label={cat} size="sm" />
        ))}
      </View>

      {installing && (
        <ProgressBar progress={0.6} style={{ marginTop: 8 }} />
      )}
    </View>
  );
}

// ─── MarketplaceScreen ────────────────────────────────────────────────────────
export default function MarketplaceScreen({ navigation }: any) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [installing, setInstalling] = useState<string | null>(null);
  const [extensions, setExtensions] = useState(MOCK_EXTENSIONS);

  const filtered = extensions.filter((ext) => {
    const matchesSearch =
      search.length === 0 ||
      ext.name.toLowerCase().includes(search.toLowerCase()) ||
      ext.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      activeCategory === 'all' || ext.categories.includes(activeCategory as ExtensionCategory);
    return matchesSearch && matchesCat;
  });

  const featured = filtered.filter((e) => e.isFeatured);
  const rest = filtered.filter((e) => !e.isFeatured);

  const handleInstall = async (ext: HypexExtension) => {
    setInstalling(ext.id);
    await new Promise((r) => setTimeout(r, 2000));
    setExtensions((prev) =>
      prev.map((e) => (e.id === ext.id ? { ...e, isInstalled: true } : e))
    );
    setInstalling(null);
    HapticPatterns.success();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
      {/* Header */}
      <FadeIn style={[styles.header, { backgroundColor: theme.bg.primary, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerIcon, { color: theme.text.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Marketplace</Text>
        <View style={styles.headerBtn} />
      </FadeIn>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.bg.primary }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.bg.secondary }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search extensions..."
            placeholderTextColor={theme.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categories, { backgroundColor: theme.bg.primary }]}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              activeCategory === cat.id && styles.categoryChipActive,
              { borderColor: activeCategory === cat.id ? Colors.primary : theme.border },
            ]}
            onPress={() => {
              HapticPatterns.selection();
              setActiveCategory(cat.id);
            }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                { color: activeCategory === cat.id ? Colors.primary : theme.text.secondary },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Extension list */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {featured.length > 0 && (
          <SlideUp delay={60}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              FEATURED
            </Text>
            {featured.map((ext) => (
              <ExtensionCard
                key={ext.id}
                extension={ext}
                onInstall={handleInstall}
                installing={installing === ext.id}
              />
            ))}
          </SlideUp>
        )}

        {rest.length > 0 && (
          <SlideUp delay={120}>
            <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {activeCategory === 'all' ? 'ALL EXTENSIONS' : activeCategory.toUpperCase()}
            </Text>
            {rest.map((ext) => (
              <ExtensionCard
                key={ext.id}
                extension={ext}
                onInstall={handleInstall}
                installing={installing === ext.id}
              />
            ))}
          </SlideUp>
        )}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No extensions found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
              Try a different search or category
            </Text>
          </View>
        )}
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
  searchContainer: {
    padding: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    padding: 0,
  },
  categories: {
    maxHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  categoriesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary + '11',
  },
  categoryIcon: { fontSize: 13 },
  categoryLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
  },
  extCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  extCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  extIcon: { fontSize: 32, width: 40 },
  extInfo: { flex: 1 },
  extName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  extPublisher: { fontSize: Typography.xs, marginTop: 1 },
  installBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installBtnText: {
    fontSize: 16,
    fontWeight: Typography.bold,
  },
  extDesc: {
    fontSize: Typography.sm,
    lineHeight: Typography.sm * 1.5,
  },
  extFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  extStat: { fontSize: Typography.xs },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  emptySubtitle: { fontSize: Typography.sm },
});
