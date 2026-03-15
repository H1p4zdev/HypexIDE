import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme/tokens';
import { HapticPatterns } from '../../utils/haptics';

// ─── HypexButton ──────────────────────────────────────────────────────────────
interface HypexButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: string;
  iconRight?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function HypexButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
  onPress,
  disabled,
  ...rest
}: HypexButtonProps) {
  const sizeStyles = {
    sm: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm },
    md: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.md },
    lg: { paddingHorizontal: 28, paddingVertical: 16, borderRadius: Radius.lg },
  }[size];

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: Colors.primary },
    secondary: { backgroundColor: Colors.bgTertiary },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.borderLight },
    danger: { backgroundColor: Colors.danger },
  };

  const textColors: Record<string, string> = {
    primary: '#FFFFFF',
    secondary: Colors.textPrimary,
    ghost: Colors.textSecondary,
    danger: '#FFFFFF',
  };

  const textSizes: Record<string, number> = {
    sm: Typography.sm,
    md: Typography.base,
    lg: Typography.md,
  };

  const handlePress = () => {
    if (!loading && !disabled) {
      HapticPatterns.medium();
      onPress?.(null as any);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Text style={[{ fontSize: textSizes[size], marginRight: 6 }]}>{icon}</Text>
          )}
          <Text
            style={[
              styles.buttonText,
              { color: textColors[variant], fontSize: textSizes[size] },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight && (
            <Text style={[{ fontSize: textSizes[size], marginLeft: 6 }]}>{iconRight}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── HypexCard ────────────────────────────────────────────────────────────────
interface HypexCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  onPress?: () => void;
}

export function HypexCard({ children, style, elevated = false, onPress }: HypexCardProps) {
  const content = (
    <View style={[styles.card, elevated && Shadow.md, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = Colors.primary, size = 'sm' }: BadgeProps) {
  const isSmall = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + '22',
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color, fontSize: isSmall ? Typography.xs : Typography.sm },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
interface DividerProps {
  style?: ViewStyle;
  color?: string;
}

export function Divider({ style, color = Colors.borderLight }: DividerProps) {
  return <View style={[styles.divider, { backgroundColor: color }, style]} />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && (
        <HypexButton
          title={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="sm"
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={Colors.primary} />
        {message && <Text style={styles.loadingText}>{message}</Text>}
      </View>
    </View>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = Colors.textSecondary,
  style,
  disabled,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.iconButton, style]}
      onPress={() => {
        HapticPatterns.light();
        onPress();
      }}
      disabled={disabled}
      activeOpacity={0.6}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontSize: size, color }}>{icon}</Text>
    </TouchableOpacity>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
interface TagProps {
  label: string;
  onRemove?: () => void;
}

export function Tag({ label, onRemove }: TagProps) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={{ marginLeft: 4 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  progress: number; // 0..1
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 4,
  style,
}: ProgressBarProps) {
  return (
    <View style={[styles.progressTrack, { height }, style]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: Typography.semibold,
    letterSpacing: Typography.letterSpacingNormal,
  },
  disabled: {
    opacity: 0.4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacingTight,
  },
  sectionAction: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  badge: {
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: Typography.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.sm * Typography.lineHeightNormal,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.lg,
  },
  loadingText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  progressTrack: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: Radius.full,
  },
});
