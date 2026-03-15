import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Colors, Typography } from '../../theme/tokens';

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineOld?: number;
  lineNew?: number;
}

interface GitDiffProps {
  filePath: string;
  lines: DiffLine[];
}

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const DIFF_BG: Record<string, string> = {
  add: Colors.success + '22',
  remove: Colors.danger + '22',
  context: 'transparent',
};

const DIFF_COLOR: Record<string, string> = {
  add: Colors.success,
  remove: Colors.danger,
  context: Colors.textDarkSecondary,
};

const DIFF_PREFIX: Record<string, string> = {
  add: '+',
  remove: '-',
  context: ' ',
};

export function GitDiff({ filePath, lines }: GitDiffProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.filePath} numberOfLines={1}>{filePath}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {lines.map((line, i) => (
            <View key={i} style={[styles.line, { backgroundColor: DIFF_BG[line.type] }]}>
              <Text style={[styles.prefix, { color: DIFF_COLOR[line.type] }]}>
                {DIFF_PREFIX[line.type]}
              </Text>
              <Text style={[styles.content, { color: DIFF_COLOR[line.type] }]}>
                {line.content}
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.editorBg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.editorGutter,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.editorLine,
  },
  filePath: {
    fontSize: Typography.xs,
    color: Colors.textDarkSecondary,
    fontFamily: MONO_FONT,
  },
  line: {
    flexDirection: 'row',
    minHeight: 20,
  },
  prefix: {
    width: 16,
    fontSize: 13,
    fontFamily: MONO_FONT,
    lineHeight: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    fontSize: 13,
    fontFamily: MONO_FONT,
    lineHeight: 20,
  },
});

export default GitDiff;
