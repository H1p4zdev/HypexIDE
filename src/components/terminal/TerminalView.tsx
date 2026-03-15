import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Typography } from '../../theme/tokens';
import type { TerminalEntry } from '../../types';

interface TerminalViewProps {
  entries: TerminalEntry[];
  prompt: string;
  maxLines?: number;
}

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const ENTRY_COLORS: Record<string, string> = {
  input: Colors.textDarkPrimary,
  output: Colors.textDarkSecondary,
  error: Colors.danger,
  system: Colors.info,
};

export function TerminalView({ entries, prompt, maxLines = 10000 }: TerminalViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const visibleEntries = entries.slice(-maxLines);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
    >
      {visibleEntries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          {entry.type === 'input' && (
            <Text style={[styles.prompt, { fontFamily: MONO_FONT }]}>{prompt}</Text>
          )}
          <Text
            style={[
              styles.text,
              { color: ENTRY_COLORS[entry.type] ?? Colors.textDarkPrimary, fontFamily: MONO_FONT },
            ]}
            selectable
          >
            {entry.content}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.editorBg,
  },
  content: {
    padding: 8,
    paddingBottom: 16,
  },
  entry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 1,
  },
  prompt: {
    color: Colors.syntaxString,
    fontSize: 13,
    fontWeight: Typography.bold,
    lineHeight: 20,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
  },
});

export default TerminalView;
