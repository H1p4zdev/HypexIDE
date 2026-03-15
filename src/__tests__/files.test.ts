import {
  detectLanguage,
  formatFileSize,
  joinPaths,
  getFileName,
  getFileExtension,
  stripExtension,
  sortFileNodes,
  flattenTree,
  findNodeById,
} from '../utils/files';
import type { FileNode } from '../types';

describe('File Utilities', () => {
  describe('detectLanguage', () => {
    it.each([
      ['app.ts', 'typescript'],
      ['app.tsx', 'tsx'],
      ['main.js', 'javascript'],
      ['main.jsx', 'jsx'],
      ['script.py', 'python'],
      ['main.rs', 'rust'],
      ['main.go', 'go'],
      ['main.c', 'c'],
      ['main.cpp', 'cpp'],
      ['Main.java', 'java'],
      ['Main.kt', 'kotlin'],
      ['App.swift', 'swift'],
      ['main.dart', 'dart'],
      ['index.html', 'html'],
      ['styles.css', 'css'],
      ['config.json', 'json'],
      ['config.yaml', 'yaml'],
      ['config.yml', 'yaml'],
      ['README.md', 'markdown'],
      ['script.sh', 'bash'],
      ['query.sql', 'sql'],
      ['unknown.xyz', 'plain'],
    ])('%s → %s', (filename, expected) => {
      expect(detectLanguage(filename)).toBe(expected);
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => expect(formatFileSize(512)).toBe('512 B'));
    it('formats KB', () => expect(formatFileSize(1536)).toBe('1.5 KB'));
    it('formats MB', () => expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB'));
    it('formats GB', () => expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB'));
    it('handles 0', () => expect(formatFileSize(0)).toBe('0 B'));
  });

  describe('Path utilities', () => {
    it('joinPaths joins correctly', () => {
      expect(joinPaths('/root', 'projects', 'app')).toBe('/root/projects/app');
    });

    it('joinPaths collapses slashes', () => {
      expect(joinPaths('/root/', '/projects')).toBe('/root/projects');
    });

    it('getFileName extracts filename', () => {
      expect(getFileName('/root/projects/App.tsx')).toBe('App.tsx');
    });

    it('getFileExtension extracts extension', () => {
      expect(getFileExtension('/src/App.tsx')).toBe('tsx');
    });

    it('getFileExtension returns empty for no extension', () => {
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('stripExtension removes extension', () => {
      expect(stripExtension('App.tsx')).toBe('App');
    });
  });

  describe('File tree utilities', () => {
    const TREE: FileNode[] = [
      {
        id: '1',
        name: 'src',
        path: '/src',
        type: 'directory',
        isOpen: true,
        children: [
          { id: '2', name: 'App.tsx', path: '/src/App.tsx', type: 'file', language: 'tsx' },
          { id: '3', name: 'index.ts', path: '/src/index.ts', type: 'file', language: 'typescript' },
        ],
      },
      { id: '4', name: 'package.json', path: '/package.json', type: 'file', language: 'json' },
    ];

    it('sortFileNodes puts directories first', () => {
      const sorted = sortFileNodes(TREE);
      expect(sorted[0].type).toBe('directory');
      expect(sorted[1].type).toBe('file');
    });

    it('flattenTree flattens open directories', () => {
      const flat = flattenTree(TREE);
      expect(flat.length).toBe(4); // src + 2 children + package.json
      expect(flat[1].depth).toBe(1);
    });

    it('flattenTree skips closed directories', () => {
      const closedTree = TREE.map((n) =>
        n.type === 'directory' ? { ...n, isOpen: false } : n
      );
      const flat = flattenTree(closedTree);
      expect(flat.length).toBe(2); // src + package.json, no children
    });

    it('findNodeById finds a node', () => {
      const found = findNodeById(TREE, '2');
      expect(found?.name).toBe('App.tsx');
    });

    it('findNodeById returns null for missing id', () => {
      const found = findNodeById(TREE, 'nonexistent');
      expect(found).toBeNull();
    });
  });
});
