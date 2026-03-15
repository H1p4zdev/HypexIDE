import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme/tokens';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { HapticPatterns } from '../utils/haptics';
import { FadeIn, SlideUp } from '../components/animations';
import { APP_VERSION } from '../constants';

// ─── SettingsRow ──────────────────────────────────────────────────────────────
interface SettingsRowProps {
  icon: string;
  title: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingsRow({
  icon, title, value, toggle, toggleValue,
  onToggle, onPress, destructive, showChevron = true,
}: SettingsRowProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.bg.card }]}
      onPress={() => {
        if (onPress) {
          HapticPatterns.light();
          onPress();
        }
      }}
      disabled={!onPress && !toggle}
      activeOpacity={0.7}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text
        style={[
          styles.rowTitle,
          { color: destructive ? Colors.danger : theme.text.primary },
        ]}
      >
        {title}
      </Text>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, { color: theme.text.tertiary }]}>
            {value}
          </Text>
        )}
        {toggle && (
          <Switch
            value={toggleValue}
            onValueChange={(val) => {
              HapticPatterns.selection();
              onToggle?.(val);
            }}
            thumbColor={Colors.bgPrimary}
            trackColor={{ false: Colors.borderMedium, true: Colors.primary }}
          />
        )}
        {onPress && showChevron && !toggle && (
          <Text style={[styles.chevron, { color: theme.text.tertiary }]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── SettingsSection ──────────────────────────────────────────────────────────
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>{title}</Text>
      <View style={[styles.sectionRows, { borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const { settings, updateSettings } = useAppStore();
  const [editorFontSize, setEditorFontSize] = useState(settings.editor.fontSize);

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    HapticPatterns.selection();
    updateSettings({ appearance: { ...settings.appearance, theme: value } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.secondary }]}>
      {/* Header */}
      <FadeIn style={[styles.header, { backgroundColor: theme.bg.primary, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={[styles.headerIcon, { color: theme.text.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Settings</Text>
        <View style={styles.headerBtn} />
      </FadeIn>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Profile */}
        <SlideUp delay={60}>
          <View style={[styles.profileCard, { backgroundColor: theme.bg.primary }, Shadow.md]}>
            <View style={[styles.avatar, { backgroundColor: Colors.primary + '22' }]}>
              <Text style={styles.avatarEmoji}>⚡</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.profileName, { color: theme.text.primary }]}>
                {settings.git.name || 'Developer'}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.text.secondary }]}>
                {settings.git.email || 'Set up your Git identity →'}
              </Text>
            </View>
            <Text style={{ color: theme.text.tertiary, fontSize: 16 }}>›</Text>
          </View>
        </SlideUp>

        {/* Appearance */}
        <SlideUp delay={80}>
          <SettingsSection title="APPEARANCE">
            <SettingsRow
              icon="🌙"
              title="Theme"
              value={settings.appearance.theme}
              onPress={() => {
                const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
                const cur = themes.indexOf(settings.appearance.theme);
                handleThemeChange(themes[(cur + 1) % themes.length]);
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🎨"
              title="Accent Color"
              value="Blue"
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🔆"
              title="Reduce Motion"
              toggle
              toggleValue={settings.appearance.reducedMotion}
              onToggle={(val) => updateSettings({ appearance: { ...settings.appearance, reducedMotion: val } })}
            />
          </SettingsSection>
        </SlideUp>

        {/* Editor */}
        <SlideUp delay={100}>
          <SettingsSection title="EDITOR">
            <SettingsRow
              icon="🔤"
              title="Font Size"
              value={`${editorFontSize}px`}
              onPress={() => {
                const next = editorFontSize >= 20 ? 12 : editorFontSize + 1;
                setEditorFontSize(next);
                updateSettings({ editor: { ...settings.editor, fontSize: next } });
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="⌨️"
              title="Tab Size"
              value={`${settings.editor.tabSize} spaces`}
              onPress={() => {
                const next = settings.editor.tabSize === 4 ? 2 : 4;
                updateSettings({ editor: { ...settings.editor, tabSize: next } });
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="💾"
              title="Auto Save"
              toggle
              toggleValue={settings.editor.autoSave}
              onToggle={(val) => updateSettings({ editor: { ...settings.editor, autoSave: val } })}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🔢"
              title="Line Numbers"
              toggle
              toggleValue={settings.editor.lineNumbers}
              onToggle={(val) => updateSettings({ editor: { ...settings.editor, lineNumbers: val } })}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="✏️"
              title="Word Wrap"
              toggle
              toggleValue={settings.editor.wordWrap}
              onToggle={(val) => updateSettings({ editor: { ...settings.editor, wordWrap: val } })}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🎨"
              title="Editor Theme"
              value={settings.editor.theme}
              onPress={() => {}}
            />
          </SettingsSection>
        </SlideUp>

        {/* Terminal */}
        <SlideUp delay={120}>
          <SettingsSection title="TERMINAL">
            <SettingsRow
              icon="📏"
              title="Font Size"
              value={`${settings.terminal.fontSize}px`}
              onPress={() => {
                const next = settings.terminal.fontSize >= 18 ? 11 : settings.terminal.fontSize + 1;
                updateSettings({ terminal: { ...settings.terminal, fontSize: next } });
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🐚"
              title="Shell"
              value={settings.terminal.shell}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="📜"
              title="Scrollback Lines"
              value={settings.terminal.scrollbackLines.toLocaleString()}
              onPress={() => {}}
            />
          </SettingsSection>
        </SlideUp>

        {/* Git */}
        <SlideUp delay={140}>
          <SettingsSection title="GIT">
            <SettingsRow
              icon="👤"
              title="User Name"
              value={settings.git.name || 'Not set'}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="📧"
              title="Email"
              value={settings.git.email || 'Not set'}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🌿"
              title="Default Branch"
              value={settings.git.defaultBranch}
              onPress={() => {}}
            />
          </SettingsSection>
        </SlideUp>

        {/* Container */}
        <SlideUp delay={160}>
          <SettingsSection title="CONTAINER">
            <SettingsRow
              icon="📦"
              title="RootFS Bundle"
              value={settings.storage.containerBundle}
              onPress={() => {}}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🔄"
              title="Reinstall Container"
              onPress={() => {}}
              destructive
              showChevron={false}
            />
          </SettingsSection>
        </SlideUp>

        {/* Extensions */}
        <SlideUp delay={180}>
          <SettingsSection title="EXTENSIONS">
            <SettingsRow
              icon="🧩"
              title="Marketplace"
              onPress={() => navigation.navigate('Marketplace')}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="⬆️"
              title="Check for Updates"
              onPress={() => HapticPatterns.medium()}
            />
          </SettingsSection>
        </SlideUp>

        {/* Privacy */}
        <SlideUp delay={200}>
          <SettingsSection title="PRIVACY">
            <SettingsRow
              icon="📊"
              title="Analytics"
              toggle
              toggleValue={settings.privacy.analytics}
              onToggle={(val) => updateSettings({ privacy: { ...settings.privacy, analytics: val } })}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="🐛"
              title="Crash Reports"
              toggle
              toggleValue={settings.privacy.crashReports}
              onToggle={(val) => updateSettings({ privacy: { ...settings.privacy, crashReports: val } })}
            />
          </SettingsSection>
        </SlideUp>

        {/* About */}
        <SlideUp delay={220}>
          <SettingsSection title="ABOUT">
            <SettingsRow
              icon="⚡"
              title="Hypex IDE"
              value={`v${APP_VERSION}`}
              showChevron={false}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="📝" title="Changelog" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="🔒" title="Privacy Policy" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="⭐" title="Rate the App" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow icon="💬" title="Send Feedback" onPress={() => {}} />
          </SettingsSection>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  profileName: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  profileEmail: { fontSize: Typography.sm },
  section: { gap: 6 },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    letterSpacing: 1,
    marginLeft: 4,
  },
  sectionRows: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowTitle: { flex: 1, fontSize: Typography.base },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: { fontSize: Typography.sm },
  chevron: { fontSize: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
});
