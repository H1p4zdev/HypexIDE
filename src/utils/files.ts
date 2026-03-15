import { FileLanguage, FileNode } from '../types';

// ── Language detection ────────────────────────────────────────────────────────
const EXTENSION_MAP: Record<string, FileLanguage> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', go: 'go',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
  java: 'java', kt: 'kotlin', kts: 'kotlin',
  swift: 'swift', dart: 'dart',
  html: 'html', htm: 'html', css: 'css', scss: 'scss',
  json: 'json', yaml: 'yaml', yml: 'yaml',
  md: 'markdown', mdx: 'markdown',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  sql: 'sql', sqlite: 'sql',
};

export function detectLanguage(filename: string): FileLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MAP[ext] ?? 'plain';
}

// ── File icon mapping ─────────────────────────────────────────────────────────
export function getFileIcon(node: FileNode): string {
  if (node.type === 'directory') {
    return node.isOpen ? '📂' : '📁';
  }
  const lang = node.language ?? detectLanguage(node.name);
  const icons: Record<string, string> = {
    typescript: '⚡', tsx: '⚛️', javascript: '🟨', jsx: '⚛️',
    python: '🐍', rust: '🦀', go: '🐹',
    c: '©️', cpp: '🔷', java: '☕', kotlin: '🎯',
    swift: '🐦', dart: '🎯',
    html: '🌐', css: '🎨', scss: '🎨',
    json: '📋', yaml: '📄', markdown: '📝',
    bash: '🖥️', sql: '🗄️', plain: '📄',
  };
  return icons[lang] ?? '📄';
}

// ── Path utilities ────────────────────────────────────────────────────────────
export function joinPaths(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

export function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

export function getFileExtension(path: string): string {
  const name = getFileName(path);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1) : '';
}

export function stripExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
}

// ── Size formatting ───────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Tree utilities ────────────────────────────────────────────────────────────
export function flattenTree(nodes: FileNode[], depth = 0): Array<FileNode & { depth: number }> {
  const result: Array<FileNode & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.type === 'directory' && node.isOpen && node.children) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

export function sortFileNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

export function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ── Template generators ───────────────────────────────────────────────────────
export const FILE_TEMPLATES: Record<string, string> = {
  typescript: `// TypeScript file
export {};
`,
  tsx: `import React from 'react';
import { View, Text } from 'react-native';

interface Props {}

export default function Component({}: Props) {
  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
}
`,
  python: `#!/usr/bin/env python3
"""Module docstring."""


def main() -> None:
    """Entry point."""
    print("Hello, World!")


if __name__ == "__main__":
    main()
`,
  rust: `fn main() {
    println!("Hello, World!");
}
`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
};

export function getTemplate(language: FileLanguage): string {
  return FILE_TEMPLATES[language] ?? '';
}
