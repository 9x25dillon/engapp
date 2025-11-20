/**
 * @fileoverview Tests for weak word detection
 */

import { describe, it, expect } from 'vitest';
import {
  detectWeakWords,
  flagWeakWords,
  countWeakWordsByCategory,
  calculateWeakWordDensity,
  getWritingStrength
} from '../src/utils/weakWordDetector.js';

describe('Weak Word Detection', () => {
  describe('detectWeakWords', () => {
    it('should detect single weak words', () => {
      const text = 'This is very good stuff';
      const matches = detectWeakWords(text);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.word === 'very')).toBe(true);
      expect(matches.some(m => m.word === 'stuff')).toBe(true);
    });

    it('should detect weak phrases', () => {
      const text = 'It is kind of interesting';
      const matches = detectWeakWords(text);
      expect(matches.some(m => m.word.toLowerCase().includes('kind of'))).toBe(true);
    });

    it('should categorize weak words correctly', () => {
      const text = 'very really basically stuff';
      const matches = detectWeakWords(text);
      const categories = new Set(matches.map(m => m.category));
      expect(categories.size).toBeGreaterThan(0);
    });
  });

  describe('flagWeakWords', () => {
    it('should flag weak words with markers', () => {
      const text = 'This is very good';
      const flagged = flagWeakWords(text);
      expect(flagged).toContain('«very»');
    });

    it('should preserve non-weak words', () => {
      const text = 'This excellent work';
      const flagged = flagWeakWords(text);
      expect(flagged).toBe(text);
    });
  });

  describe('countWeakWordsByCategory', () => {
    it('should count weak words by category', () => {
      const text = 'very really stuff things';
      const counts = countWeakWordsByCategory(text);
      expect(Object.keys(counts).length).toBeGreaterThan(0);
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(4);
    });
  });

  describe('calculateWeakWordDensity', () => {
    it('should calculate density correctly', () => {
      const text = 'very good and really nice';
      const density = calculateWeakWordDensity(text);
      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThan(100);
    });

    it('should return 0 for empty text', () => {
      expect(calculateWeakWordDensity('')).toBe(0);
    });
  });

  describe('getWritingStrength', () => {
    it('should return score and grade', () => {
      const text = 'Excellent prose demonstrates sophisticated vocabulary';
      const result = getWritingStrength(text);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('grade');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should penalize weak words', () => {
      const goodText = 'Excellent prose demonstrates vocabulary';
      const weakText = 'very really good stuff basically demonstrates things';

      const goodResult = getWritingStrength(goodText);
      const weakResult = getWritingStrength(weakText);

      expect(goodResult.score).toBeGreaterThan(weakResult.score);
    });
  });
});
