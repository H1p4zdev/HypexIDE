import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Radius } from '../../theme/tokens';
import type { HypexExtension } from '../../types';

interface ExtensionBadgeProps {
  extension: HypexExtension;
  onPress?: () => void;
  showVersion?: boolean;
}

export function ExtensionBadge({ extension, onPress, showVersion }: ExtensionBadgeProps) {
  const content = (
    <View style={styles.container}>
      <Text style={styles.icon}>{extension.icon ?? '🧩'}</Text>
      <Text style={styles.name} numberOfLines={1}>{extension.name}</Text>
      {showVersion && (
        <Text style={styles.version}>v{extension.version}</Text>
      )}
      {extension.isEnabled && (
        <View style={styles.activeDot} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  icon: { fontSize: 12 },
  name: {
    fontSize: Typography.xs,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    maxWidth: 100,
  },
  version: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
});

export default ExtensionBadge;
