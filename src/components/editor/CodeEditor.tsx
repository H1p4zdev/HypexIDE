import React, { memo, useCallback } from 'react';
import { View, TextInput, StyleSheet, Platform, ScrollView, Text } from 'react-native';
import { Colors, Typography } from '../../theme/tokens';
import { PERFORMANCE } from '../../constants';

interface CodeEditorProps {
  content: string;
  language: string;
  lineNumbers?: boolean;
  fontSize?: number;
  readOnly?: boolean;
  onContentChange?: (text: string) => void;
  onCursorChange?: (line: number, column: number) => void;
}

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const CodeEditor = memo(function CodeEditor({
  content,
  language,
  lineNumbers = true,
  fontSize = 13,
  readOnly = false,
  onContentChange,
  onCursorChange,
}: CodeEditorProps) {
  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleChange = useCallback(
    (text: string) => {
      onContentChange?.(text);
    },
    [onContentChange]
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator
      horizontal={false}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.editorInner}>
          {/* Line numbers gutter */}
          {lineNumbers && (
            <View style={styles.gutter}>
              {lines.map((_, i) => (
                <Text
                  key={i}
                  style={[styles.lineNumber, { fontSize, lineHeight: fontSize * 1.6 }]}
                >
                  {i + 1}
                </Text>
              ))}
            </View>
          )}

          {/* Code area */}
          <TextInput
            style={[
              styles.codeInput,
              { fontSize, lineHeight: fontSize * 1.6, fontFamily: MONO_FONT },
            ]}
            multiline
            value={content}
            onChangeText={handleChange}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            editable={!readOnly}
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.editorBg,
  },
  editorInner: {
    flexDirection: 'row',
    minWidth: '100%',
  },
  gutter: {
    backgroundColor: Colors.editorGutter,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.editorLine,
    minWidth: 48,
  },
  lineNumber: {
    color: Colors.syntaxComment,
    textAlign: 'right',
    fontFamily: MONO_FONT,
    userSelect: 'none',
  },
  codeInput: {
    flex: 1,
    color: Colors.syntaxVariable,
    padding: 8,
    paddingLeft: 12,
    backgroundColor: Colors.editorBg,
  },
});

export default CodeEditor;
