/**
 * @fileoverview Topic extraction and keyword analysis
 * Implements TF-IDF (Term Frequency-Inverse Document Frequency) algorithm
 * for intelligent keyword extraction
 */

import { STOPWORDS } from '../config/settings.js';
import { KEYWORD_RE } from './textProcessing.js';

/**
 * Document term frequency cache
 * Maps document hash to term frequencies
 * @type {Map<string, Map<string, number>>}
 */
const termFrequencyCache = new Map();

/**
 * Document frequency tracker (for IDF calculation)
 * Maps term to number of documents containing it
 * @type {Map<string, number>}
 */
const documentFrequency = new Map();

/**
 * Total number of documents processed (for IDF calculation)
 * @type {number}
 */
let totalDocuments = 0;

/**
 * Maximum cache size to prevent memory issues
 * @const {number}
 */
const MAX_CACHE_SIZE = 100;

/**
 * Calculate term frequency for a single document
 * Uses normalized frequency (count / total terms)
 *
 * @param {string} text - Document text
 * @param {number} minLength - Minimum word length to consider
 * @returns {Map<string, number>} Map of term to frequency
 */
export function calculateTermFrequency(text, minLength = 3) {
  const terms = new Map();
  const words = text.toLowerCase().match(KEYWORD_RE) || [];
  let totalValidTerms = 0;

  for (const word of words) {
    // Skip stopwords and short words
    if (STOPWORDS.has(word) || word.length < minLength) {
      continue;
    }

    terms.set(word, (terms.get(word) || 0) + 1);
    totalValidTerms++;
  }

  // Normalize frequencies
  if (totalValidTerms > 0) {
    for (const [term, count] of terms.entries()) {
      terms.set(term, count / totalValidTerms);
    }
  }

  return terms;
}

/**
 * Calculate inverse document frequency for a term
 * IDF = log(total documents / documents containing term)
 *
 * @param {string} term - Term to calculate IDF for
 * @returns {number} IDF score
 */
export function calculateIDF(term) {
  const docsWithTerm = documentFrequency.get(term) || 0;

  if (docsWithTerm === 0 || totalDocuments === 0) {
    return 0;
  }

  // Add 1 to avoid division by zero and smooth the calculation
  return Math.log((totalDocuments + 1) / (docsWithTerm + 1));
}

/**
 * Calculate TF-IDF scores for all terms in a document
 *
 * @param {string} text - Document text
 * @param {number} minLength - Minimum word length
 * @returns {Map<string, number>} Map of term to TF-IDF score
 */
export function calculateTFIDF(text, minLength = 3) {
  const tf = calculateTermFrequency(text, minLength);
  const tfidf = new Map();

  for (const [term, frequency] of tf.entries()) {
    const idf = calculateIDF(term);
    tfidf.set(term, frequency * idf);
  }

  return tfidf;
}

/**
 * Update document frequency statistics
 * Call this when processing a new document
 *
 * @param {string} text - Document text
 */
export function updateDocumentFrequency(text) {
  const terms = calculateTermFrequency(text);
  const uniqueTerms = new Set(terms.keys());

  for (const term of uniqueTerms) {
    documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
  }

  totalDocuments++;

  // Prevent unbounded growth
  if (documentFrequency.size > MAX_CACHE_SIZE * 10) {
    // Keep only the most common terms
    const sortedTerms = [...documentFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CACHE_SIZE * 5);

    documentFrequency.clear();
    for (const [term, freq] of sortedTerms) {
      documentFrequency.set(term, freq);
    }
  }
}

/**
 * Extract top keywords using simple frequency counting
 * Faster but less sophisticated than TF-IDF
 *
 * @param {string} text - Text to analyze
 * @param {number} n - Number of keywords to return
 * @param {number} minLength - Minimum word length
 * @returns {Array<{term: string, score: number}>} Top keywords with scores
 */
export function extractKeywordsByFrequency(text, n = 6, minLength = 3) {
  const counts = new Map();
  const words = text.toLowerCase().match(KEYWORD_RE) || [];

  for (const word of words) {
    if (STOPWORDS.has(word) || word.length < minLength) {
      continue;
    }
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, score: count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Extract top keywords using TF-IDF algorithm
 * More sophisticated, considers document corpus statistics
 *
 * @param {string} text - Text to analyze
 * @param {number} n - Number of keywords to return
 * @param {number} minLength - Minimum word length
 * @param {boolean} updateStats - Whether to update document frequency stats
 * @returns {Array<{term: string, score: number}>} Top keywords with TF-IDF scores
 */
export function extractKeywordsByTFIDF(text, n = 6, minLength = 3, updateStats = true) {
  // Update document frequency if requested
  if (updateStats && totalDocuments < MAX_CACHE_SIZE) {
    updateDocumentFrequency(text);
  }

  // Calculate TF-IDF scores
  const tfidf = calculateTFIDF(text, minLength);

  // Sort by score and return top N
  return [...tfidf.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Extract keywords with configurable algorithm
 *
 * @param {string} text - Text to analyze
 * @param {Object} options - Extraction options
 * @param {number} options.count - Number of keywords to extract
 * @param {number} options.minLength - Minimum word length
 * @param {'frequency'|'tfidf'} options.algorithm - Algorithm to use
 * @param {boolean} options.updateStats - Update TF-IDF statistics
 * @returns {Array<{term: string, score: number}>} Extracted keywords
 */
export function extractKeywords(text, options = {}) {
  const {
    count = 6,
    minLength = 3,
    algorithm = 'frequency',
    updateStats = true
  } = options;

  if (algorithm === 'tfidf' && totalDocuments > 0) {
    return extractKeywordsByTFIDF(text, count, minLength, updateStats);
  }

  return extractKeywordsByFrequency(text, count, minLength);
}

/**
 * Get simple keyword list (just the terms)
 *
 * @param {string} text - Text to analyze
 * @param {number} n - Number of keywords
 * @param {string} algorithm - Algorithm to use
 * @returns {string[]} Array of keyword strings
 */
export function getTopKeywords(text, n = 6, algorithm = 'frequency') {
  const keywords = extractKeywords(text, { count: n, algorithm });
  return keywords.map(k => k.term);
}

/**
 * Analyze document topics and return structured data
 *
 * @param {string} text - Text to analyze
 * @returns {Object} Topic analysis results
 */
export function analyzeTopics(text) {
  const frequencyKeywords = extractKeywordsByFrequency(text, 10);
  const tfidfKeywords = totalDocuments > 0
    ? extractKeywordsByTFIDF(text, 10, 3, false)
    : [];

  // Calculate basic statistics
  const words = text.toLowerCase().match(KEYWORD_RE) || [];
  const uniqueWords = new Set(
    words.filter(w => !STOPWORDS.has(w) && w.length >= 3)
  );

  return {
    keywords: {
      byFrequency: frequencyKeywords,
      byTFIDF: tfidfKeywords,
      recommended: tfidfKeywords.length > 0 ? tfidfKeywords : frequencyKeywords
    },
    statistics: {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      lexicalDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
      documentsInCorpus: totalDocuments
    }
  };
}

/**
 * Create a hash for caching purposes
 *
 * @param {string} text - Text to hash
 * @param {number} maxLength - Maximum length to consider
 * @returns {string} Hash string
 */
export function createTextHash(text, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...' + text.length;
}

/**
 * Cached topic extraction with LRU eviction
 *
 * @param {string} text - Text to analyze
 * @param {number} n - Number of topics
 * @param {string} algorithm - Algorithm to use
 * @returns {string[]} Array of topic keywords
 */
export function getCachedTopics(text, n = 6, algorithm = 'frequency') {
  const hash = createTextHash(text);

  if (termFrequencyCache.has(hash)) {
    const cached = termFrequencyCache.get(hash);
    // Move to end (LRU)
    termFrequencyCache.delete(hash);
    termFrequencyCache.set(hash, cached);
    return cached;
  }

  const topics = getTopKeywords(text, n, algorithm);

  // Add to cache
  termFrequencyCache.set(hash, topics);

  // LRU eviction
  if (termFrequencyCache.size > MAX_CACHE_SIZE) {
    const firstKey = termFrequencyCache.keys().next().value;
    termFrequencyCache.delete(firstKey);
  }

  return topics;
}

/**
 * Clear all caches and reset statistics
 */
export function resetTopicExtraction() {
  termFrequencyCache.clear();
  documentFrequency.clear();
  totalDocuments = 0;
}

/**
 * Get corpus statistics
 *
 * @returns {Object} Statistics about the document corpus
 */
export function getCorpusStats() {
  return {
    totalDocuments,
    uniqueTerms: documentFrequency.size,
    cacheSize: termFrequencyCache.size,
    mostCommonTerms: [...documentFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, freq]) => ({ term, frequency: freq }))
  };
}
