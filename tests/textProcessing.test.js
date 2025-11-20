/**
 * @fileoverview Tests for text processing utilities
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHTML,
  escapeRegExp,
  getSentenceBounds,
  getWordFragment,
  preserveCase,
  replaceWordGlobally,
  countWords,
  truncate
} from '../src/utils/textProcessing.js';

describe('Text Processing Utilities', () => {
  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHTML('<div>Test & "quotes"</div>')).toBe(
        '&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;/div&gt;'
      );
    });

    it('should handle empty string', () => {
      expect(escapeHTML('')).toBe('');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegExp('test.regex*')).toBe('test\\.regex\\*');
      expect(escapeRegExp('[a-z]+')).toBe('\\[a-z\\]\\+');
    });
  });

  describe('getSentenceBounds', () => {
    it('should find sentence boundaries with periods', () => {
      const text = 'First sentence. Second sentence. Third.';
      const { sentStart, sentEnd } = getSentenceBounds(text, 20);
      expect(text.slice(sentStart, sentEnd)).toBe(' Second sentence.');
    });

    it('should handle sentence at start', () => {
      const text = 'First sentence. Second.';
      const { sentStart, sentEnd } = getSentenceBounds(text, 5);
      expect(sentStart).toBe(0);
    });

    it('should handle newlines as boundaries', () => {
      const text = 'Line one\nLine two\nLine three';
      const { sentStart, sentEnd } = getSentenceBounds(text, 15);
      expect(text.slice(sentStart, sentEnd)).toBe('Line two\n');
    });
  });

  describe('getWordFragment', () => {
    it('should extract word at cursor position', () => {
      const text = 'The quick brown fox';
      const { word, start, end } = getWordFragment(text, 6);
      expect(word).toBe('quick');
      expect(start).toBe(4);
      expect(end).toBe(9);
    });

    it('should handle cursor at word boundary', () => {
      const text = 'hello world';
      const { word } = getWordFragment(text, 5);
      expect(word).toBe('hello');
    });

    it('should handle hyphenated words', () => {
      const text = 'well-known phrase';
      const { word } = getWordFragment(text, 8);
      expect(word).toBe('well-known');
    });
  });

  describe('preserveCase', () => {
    it('should preserve UPPERCASE', () => {
      expect(preserveCase('HELLO', 'world')).toBe('WORLD');
    });

    it('should preserve Title Case', () => {
      expect(preserveCase('Hello', 'world')).toBe('World');
    });

    it('should preserve lowercase', () => {
      expect(preserveCase('hello', 'WORLD')).toBe('world');
    });

    it('should handle multi-word replacements', () => {
      expect(preserveCase('Hello', 'good morning')).toBe('Good Morning');
    });
  });

  describe('replaceWordGlobally', () => {
    it('should replace all occurrences', () => {
      const text = 'The cat sat. The cat ran.';
      const result = replaceWordGlobally(text, 'cat', 'dog');
      expect(result).toBe('The dog sat. The dog ran.');
    });

    it('should preserve case in replacements', () => {
      const text = 'Good morning. GOOD afternoon.';
      const result = replaceWordGlobally(text, 'good', 'great');
      expect(result).toBe('Great morning. GREAT afternoon.');
    });

    it('should respect word boundaries', () => {
      const text = 'The cat catches cats';
      const result = replaceWordGlobally(text, 'cat', 'dog');
      expect(result).toBe('The dog catches cats');
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('The quick brown fox')).toBe(4);
      expect(countWords('  spaces   between  ')).toBe(2);
    });

    it('should handle empty string', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs truncating';
      const result = truncate(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should not truncate short text', () => {
      const text = 'Short';
      expect(truncate(text, 20)).toBe('Short');
    });
  });
});
