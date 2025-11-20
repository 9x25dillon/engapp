/**
 * @fileoverview Tests for POS detection
 */

import { describe, it, expect } from 'vitest';
import { detectPOS, getSimplePOS, getFormattedPOS } from '../src/utils/posDetection.js';

describe('POS Detection', () => {
  describe('detectPOS', () => {
    it('should detect adverbs ending in -ly', () => {
      const result = detectPOS('quickly');
      expect(result.pos).toBe('adverb');
      expect(result.confidence).toBe('high');
    });

    it('should detect gerunds ending in -ing', () => {
      const result = detectPOS('running');
      expect(result.pos).toBe('verb (gerund)');
      expect(result.confidence).toBe('high');
    });

    it('should detect adjectives ending in -ful', () => {
      const result = detectPOS('beautiful');
      expect(result.pos).toBe('adjective');
      expect(result.confidence).toBe('high');
    });

    it('should detect nouns ending in -tion', () => {
      const result = detectPOS('creation');
      expect(result.pos).toBe('noun');
      expect(result.confidence).toBe('high');
    });

    it('should detect modal verbs', () => {
      const result = detectPOS('should');
      expect(result.pos).toBe('modal verb');
      expect(result.confidence).toBe('high');
    });

    it('should detect prepositions', () => {
      const result = detectPOS('through');
      expect(result.pos).toBe('preposition');
      expect(result.confidence).toBe('high');
    });

    it('should return unknown for unrecognized words', () => {
      const result = detectPOS('xyzabc');
      expect(result.pos).toBe('unknown');
      expect(result.confidence).toBe('none');
    });
  });

  describe('getSimplePOS', () => {
    it('should return simple POS tags', () => {
      expect(getSimplePOS('quickly')).toBe('adv');
      expect(getSimplePOS('beautiful')).toBe('adj');
      expect(getSimplePOS('running')).toBe('v-ing');
    });

    it('should return empty string for unknown', () => {
      expect(getSimplePOS('xyzabc')).toBe('');
    });
  });

  describe('getFormattedPOS', () => {
    it('should format POS with confidence markers', () => {
      const formatted = getFormattedPOS('quickly', true);
      expect(formatted).toContain('adv');
    });

    it('should return dash for unknown words', () => {
      expect(getFormattedPOS('xyzabc')).toBe('—');
    });
  });
});
