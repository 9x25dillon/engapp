/**
 * @fileoverview Weak word detection and analysis
 * Identifies and flags weak words and phrases that reduce writing impact
 */

import { WEAK_WORDS } from '../config/settings.js';
import { WORD_BOUNDARY, escapeRegExp, hasUnicodeSupport } from './textProcessing.js';

/**
 * Weak word detection result
 * @typedef {Object} WeakWordMatch
 * @property {string} word - The weak word or phrase
 * @property {number} start - Start index in text
 * @property {number} end - End index in text
 * @property {string} category - Category of weak word
 * @property {string} [suggestion] - Optional replacement suggestion
 */

/**
 * Compile weak word patterns
 * @returns {Array<{pattern: RegExp, category: string}>}
 */
function compileWeakWordPatterns() {
  const patterns = [];
  const flags = hasUnicodeSupport ? 'giu' : 'gi';

  // Single-word patterns for each category
  // Use word boundary or lookahead to avoid consuming characters
  for (const [category, words] of Object.entries(WEAK_WORDS)) {
    if (category === 'phrases') continue; // Handle separately

    if (Array.isArray(words) && words.length > 0) {
      const wordList = words.map(escapeRegExp).join('|');
      // Use lookbehind and lookahead to avoid consuming boundaries
      const pattern = hasUnicodeSupport
        ? new RegExp(`(?<=^|${WORD_BOUNDARY})(${wordList})(?=$|${WORD_BOUNDARY})`, flags)
        : new RegExp(`\\b(${wordList})\\b`, flags);
      patterns.push({ pattern, category });
    }
  }

  // Multi-word phrase patterns
  for (const phrasePattern of WEAK_WORDS.phrases) {
    patterns.push({
      pattern: phrasePattern,
      category: 'phrases'
    });
  }

  return patterns;
}

/**
 * Cached weak word patterns
 * @type {Array<{pattern: RegExp, category: string}>}
 */
let weakWordPatterns = null;

/**
 * Get compiled weak word patterns (cached)
 * @returns {Array<{pattern: RegExp, category: string}>}
 */
function getWeakWordPatterns() {
  if (!weakWordPatterns) {
    weakWordPatterns = compileWeakWordPatterns();
  }
  return weakWordPatterns;
}

/**
 * Detect all weak words in text
 *
 * @param {string} text - Text to analyze
 * @returns {WeakWordMatch[]} Array of weak word matches
 */
export function detectWeakWords(text) {
  const patterns = getWeakWordPatterns();
  const matches = [];

  for (const { pattern, category } of patterns) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const actualWord = match[1] || match[0]; // Get captured group or full match
      const wordStart = match.index;
      const wordEnd = wordStart + actualWord.length;

      matches.push({
        word: actualWord,
        start: wordStart,
        end: wordEnd,
        category,
        suggestion: getSuggestion(actualWord, category)
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  return matches;
}

/**
 * Get replacement suggestion for a weak word
 *
 * @param {string} word - Weak word
 * @param {string} category - Category of weak word
 * @returns {string|null} Suggested replacement or null
 */
function getSuggestion(word, category) {
  const suggestions = {
    // Intensifiers - usually can be removed
    'very': null, // Remove
    'really': null,
    'quite': null,
    'extremely': null,
    'incredibly': null,
    'absolutely': null,
    'totally': null,
    'completely': null,

    // Vague words - need specific alternatives
    'stuff': 'items/materials/things',
    'things': 'items/elements/aspects',
    'something': '[be specific]',
    'good': 'excellent/effective/beneficial',
    'bad': 'poor/ineffective/harmful',
    'nice': 'pleasant/agreeable/satisfactory',

    // Fillers - can be removed
    'basically': null,
    'literally': null,
    'actually': null,
    'honestly': null,
    'seriously': null,

    // Hedges - weaken statements
    'just': null,
    'only': null,
    'merely': null,
    'simply': null,
    'rather': 'somewhat/moderately',
    'somewhat': null,
    'fairly': null,
    'pretty': null,

    // Phrases
    'kind of': null,
    'sort of': null,
    'a lot': 'many/much/frequently',
    'a bit': 'slightly/somewhat',
    'in fact': null,
    'you know': null,
    'i mean': null,
    'i think': null,
    'i feel': null,
    'i believe': null,
    'in my opinion': null,
    'to be honest': null,
    'for the most part': 'mostly/generally'
  };

  return suggestions[word.toLowerCase()] || null;
}

/**
 * Get category information
 *
 * @param {string} category - Category name
 * @returns {Object} Category metadata
 */
export function getCategoryInfo(category) {
  const info = {
    intensifiers: {
      name: 'Intensifiers',
      description: 'Words that attempt to strengthen meaning but often weaken impact',
      severity: 'medium',
      advice: 'Remove or use stronger base words'
    },
    vague: {
      name: 'Vague Words',
      description: 'Imprecise words that lack specificity',
      severity: 'high',
      advice: 'Replace with specific, concrete terms'
    },
    fillers: {
      name: 'Filler Words',
      description: 'Verbal tics that add no meaning',
      severity: 'low',
      advice: 'Remove completely'
    },
    hedges: {
      name: 'Hedging Words',
      description: 'Words that weaken statements and reduce confidence',
      severity: 'medium',
      advice: 'Remove to strengthen your message'
    },
    phrases: {
      name: 'Weak Phrases',
      description: 'Multi-word phrases that dilute meaning',
      severity: 'medium',
      advice: 'Simplify or remove'
    }
  };

  return info[category] || {
    name: category,
    description: 'Unknown category',
    severity: 'low',
    advice: 'Consider revising'
  };
}

/**
 * Flag weak words in text by wrapping them with markers
 *
 * @param {string} text - Text to process
 * @param {string} leftMarker - Left marker (default: '«')
 * @param {string} rightMarker - Right marker (default: '»')
 * @returns {string} Text with weak words marked
 */
export function flagWeakWords(text, leftMarker = '«', rightMarker = '»') {
  const matches = detectWeakWords(text);

  // Sort in reverse order to maintain indices
  matches.sort((a, b) => b.start - a.start);

  let result = text;
  for (const match of matches) {
    result =
      result.slice(0, match.start) +
      leftMarker +
      result.slice(match.start, match.end) +
      rightMarker +
      result.slice(match.end);
  }

  return result;
}

/**
 * Count weak words by category
 *
 * @param {string} text - Text to analyze
 * @returns {Object} Map of category to count
 */
export function countWeakWordsByCategory(text) {
  const matches = detectWeakWords(text);
  const counts = {};

  for (const match of matches) {
    counts[match.category] = (counts[match.category] || 0) + 1;
  }

  return counts;
}

/**
 * Calculate weak word density (weak words per 100 words)
 *
 * @param {string} text - Text to analyze
 * @returns {number} Weak word density
 */
export function calculateWeakWordDensity(text) {
  const matches = detectWeakWords(text);
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return 0;

  return (matches.length / words.length) * 100;
}

/**
 * Get writing strength score (0-100, higher is better)
 *
 * @param {string} text - Text to analyze
 * @returns {Object} Score and analysis
 */
export function getWritingStrength(text) {
  const density = calculateWeakWordDensity(text);
  const counts = countWeakWordsByCategory(text);

  // Calculate score (100 - density, clamped to 0-100)
  let score = Math.max(0, Math.min(100, 100 - density * 2));

  // Penalties for high-severity categories
  const vagueCount = counts.vague || 0;
  if (vagueCount > 0) {
    score -= vagueCount * 2; // -2 points per vague word
  }

  // Ensure score stays in range
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade;
  if (score >= 90) grade = 'Excellent';
  else if (score >= 75) grade = 'Good';
  else if (score >= 60) grade = 'Fair';
  else if (score >= 40) grade = 'Weak';
  else grade = 'Very Weak';

  return {
    score: Math.round(score),
    grade,
    density: Math.round(density * 10) / 10,
    categoryCounts: counts,
    totalWeakWords: Object.values(counts).reduce((a, b) => a + b, 0)
  };
}

/**
 * Generate suggestions for improving text
 *
 * @param {string} text - Text to analyze
 * @param {number} maxSuggestions - Maximum suggestions to return
 * @returns {Array<Object>} Array of suggestion objects
 */
export function generateSuggestions(text, maxSuggestions = 10) {
  const matches = detectWeakWords(text);
  const suggestions = [];

  for (const match of matches) {
    const categoryInfo = getCategoryInfo(match.category);

    suggestions.push({
      position: match.start,
      word: match.word,
      category: match.category,
      categoryName: categoryInfo.name,
      severity: categoryInfo.severity,
      suggestion: match.suggestion,
      advice: categoryInfo.advice,
      context: extractContext(text, match.start, match.end)
    });
  }

  // Sort by severity (high first), then position
  const severityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    return severityDiff !== 0 ? severityDiff : a.position - b.position;
  });

  return suggestions.slice(0, maxSuggestions);
}

/**
 * Extract context around a word
 *
 * @param {string} text - Full text
 * @param {number} start - Start position
 * @param {number} end - End position
 * @param {number} contextLength - Characters of context on each side
 * @returns {string} Context string
 */
function extractContext(text, start, end, contextLength = 30) {
  const contextStart = Math.max(0, start - contextLength);
  const contextEnd = Math.min(text.length, end + contextLength);

  let context = text.slice(contextStart, contextEnd);

  if (contextStart > 0) context = '...' + context;
  if (contextEnd < text.length) context = context + '...';

  return context;
}

/**
 * Reset cached patterns (call if WEAK_WORDS config changes)
 */
export function resetWeakWordPatterns() {
  weakWordPatterns = null;
}
