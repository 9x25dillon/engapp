/**
 * @fileoverview Part-of-Speech (POS) detection utilities
 * Provides heuristic-based POS tagging for English words
 */

import { POS_RULES } from '../config/settings.js';

/**
 * Common irregular verbs in their base, past, and past participle forms
 * @const {Set<string>}
 */
const IRREGULAR_VERBS = new Set([
  'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'done', 'doing',
  'go', 'goes', 'went', 'gone', 'going',
  'get', 'gets', 'got', 'gotten', 'getting',
  'make', 'makes', 'made', 'making',
  'take', 'takes', 'took', 'taken', 'taking',
  'see', 'sees', 'saw', 'seen', 'seeing',
  'come', 'comes', 'came', 'coming',
  'know', 'knows', 'knew', 'known', 'knowing',
  'think', 'thinks', 'thought', 'thinking',
  'give', 'gives', 'gave', 'given', 'giving',
  'find', 'finds', 'found', 'finding',
  'tell', 'tells', 'told', 'telling',
  'become', 'becomes', 'became', 'becoming',
  'leave', 'leaves', 'left', 'leaving',
  'feel', 'feels', 'felt', 'feeling',
  'bring', 'brings', 'brought', 'bringing',
  'begin', 'begins', 'began', 'begun', 'beginning',
  'keep', 'keeps', 'kept', 'keeping',
  'hold', 'holds', 'held', 'holding',
  'write', 'writes', 'wrote', 'written', 'writing',
  'stand', 'stands', 'stood', 'standing',
  'hear', 'hears', 'heard', 'hearing',
  'let', 'lets', 'letting',
  'mean', 'means', 'meant', 'meaning',
  'set', 'sets', 'setting',
  'meet', 'meets', 'met', 'meeting',
  'run', 'runs', 'ran', 'running',
  'pay', 'pays', 'paid', 'paying',
  'sit', 'sits', 'sat', 'sitting',
  'speak', 'speaks', 'spoke', 'spoken', 'speaking',
  'lie', 'lies', 'lay', 'lain', 'lying',
  'lead', 'leads', 'led', 'leading',
  'read', 'reads', 'reading', // past is also 'read'
  'grow', 'grows', 'grew', 'grown', 'growing',
  'lose', 'loses', 'lost', 'losing',
  'fall', 'falls', 'fell', 'fallen', 'falling',
  'send', 'sends', 'sent', 'sending',
  'build', 'builds', 'built', 'building',
  'understand', 'understands', 'understood', 'understanding',
  'draw', 'draws', 'drew', 'drawn', 'drawing',
  'break', 'breaks', 'broke', 'broken', 'breaking',
  'spend', 'spends', 'spent', 'spending',
  'cut', 'cuts', 'cutting',
  'rise', 'rises', 'rose', 'risen', 'rising',
  'drive', 'drives', 'drove', 'driven', 'driving',
  'buy', 'buys', 'bought', 'buying',
  'wear', 'wears', 'wore', 'worn', 'wearing',
  'choose', 'chooses', 'chose', 'chosen', 'choosing',
  'seek', 'seeks', 'sought', 'seeking',
  'throw', 'throws', 'threw', 'thrown', 'throwing',
  'catch', 'catches', 'caught', 'catching',
  'deal', 'deals', 'dealt', 'dealing',
  'win', 'wins', 'won', 'winning',
  'forget', 'forgets', 'forgot', 'forgotten', 'forgetting',
  'sell', 'sells', 'sold', 'selling',
  'fight', 'fights', 'fought', 'fighting',
  'bear', 'bears', 'bore', 'born', 'borne', 'bearing',
  'teach', 'teaches', 'taught', 'teaching',
  'eat', 'eats', 'ate', 'eaten', 'eating',
  'fly', 'flies', 'flew', 'flown', 'flying',
  'sing', 'sings', 'sang', 'sung', 'singing',
  'swim', 'swims', 'swam', 'swum', 'swimming'
]);

/**
 * Common modal verbs
 * @const {Set<string>}
 */
const MODAL_VERBS = new Set([
  'can', 'could', 'may', 'might', 'must',
  'shall', 'should', 'will', 'would',
  'ought', 'need', 'dare'
]);

/**
 * Common determiners
 * @const {Set<string>}
 */
const DETERMINERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'some', 'any', 'no', 'every', 'each', 'either', 'neither',
  'much', 'many', 'more', 'most', 'few', 'little', 'several',
  'all', 'both', 'half', 'another', 'other'
]);

/**
 * Common prepositions
 * @const {Set<string>}
 */
const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by',
  'about', 'as', 'into', 'like', 'through', 'after', 'over',
  'between', 'out', 'against', 'during', 'without', 'before',
  'under', 'around', 'among', 'of', 'up', 'down', 'off',
  'above', 'near', 'below', 'across', 'beyond', 'plus',
  'except', 'but', 'since', 'until', 'within', 'along',
  'past', 'toward', 'towards', 'upon', 'next', 'despite',
  'underneath', 'alongside', 'via', 'per', 'beside',
  'besides', 'throughout', 'concerning', 'regarding'
]);

/**
 * Common conjunctions
 * @const {Set<string>}
 */
const CONJUNCTIONS = new Set([
  'and', 'or', 'but', 'nor', 'so', 'for', 'yet',
  'although', 'because', 'since', 'unless', 'while',
  'where', 'if', 'than', 'that', 'whether', 'though',
  'even', 'when', 'whenever', 'wherever', 'whereas',
  'after', 'before', 'until', 'once', 'as'
]);

/**
 * Common pronouns
 * @const {Set<string>}
 */
const PRONOUNS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them',
  'my', 'mine', 'your', 'yours', 'his', 'hers', 'its', 'our', 'ours', 'their', 'theirs',
  'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  'this', 'that', 'these', 'those',
  'who', 'whom', 'whose', 'which', 'what',
  'whoever', 'whomever', 'whichever', 'whatever',
  'anybody', 'anyone', 'anything', 'everybody', 'everyone', 'everything',
  'nobody', 'no one', 'nothing', 'somebody', 'someone', 'something'
]);

/**
 * Common adverbs (not ending in -ly)
 * @const {Set<string>}
 */
const COMMON_ADVERBS = new Set([
  'very', 'quite', 'too', 'enough', 'rather', 'fairly', 'pretty',
  'almost', 'nearly', 'just', 'only', 'even', 'still', 'also',
  'yet', 'already', 'soon', 'now', 'then', 'here', 'there',
  'everywhere', 'nowhere', 'somewhere', 'anywhere',
  'always', 'never', 'often', 'sometimes', 'rarely', 'seldom',
  'usually', 'frequently', 'occasionally',
  'well', 'badly', 'hard', 'fast', 'slow', 'high', 'low',
  'early', 'late', 'far', 'near', 'straight', 'right', 'wrong',
  'together', 'apart', 'away', 'back', 'forward', 'backward',
  'up', 'down', 'in', 'out', 'off', 'on', 'over', 'under',
  'indeed', 'perhaps', 'maybe', 'probably', 'possibly',
  'certainly', 'definitely', 'surely', 'really', 'truly'
]);

/**
 * Result object for POS detection
 * @typedef {Object} POSResult
 * @property {string} pos - Part of speech label
 * @property {string} confidence - Confidence level: 'high', 'medium', 'low'
 * @property {string} [detail] - Additional details about the detection
 */

/**
 * Detect part of speech for a word using heuristics
 * Uses multiple strategies in priority order:
 * 1. Lookup in known word lists (highest confidence)
 * 2. Suffix-based pattern matching (medium-high confidence)
 * 3. Contextual clues if provided (medium confidence)
 *
 * @param {string} word - Word to analyze
 * @param {string} [context] - Surrounding text for context (optional)
 * @returns {POSResult} Part of speech with confidence level
 *
 * @example
 * detectPOS('quickly') // { pos: 'adverb', confidence: 'high' }
 * detectPOS('running') // { pos: 'verb (gerund)', confidence: 'high' }
 * detectPOS('beautiful') // { pos: 'adjective', confidence: 'high' }
 */
export function detectPOS(word, context = '') {
  if (!word || typeof word !== 'string') {
    return { pos: 'unknown', confidence: 'none' };
  }

  const lowerWord = word.toLowerCase();

  // Strategy 1: Check suffixes first for -ing and -ly (high confidence patterns)
  // This takes precedence over irregular verb forms
  if (/ly$/i.test(word)) {
    return { pos: 'adverb', confidence: 'high', detail: 'suffix pattern' };
  }

  if (/ing$/i.test(word)) {
    return { pos: 'verb (gerund)', confidence: 'high', detail: 'suffix pattern' };
  }

  // Strategy 2: Known word lists (highest confidence for non-suffix words)
  if (MODAL_VERBS.has(lowerWord)) {
    return { pos: 'modal verb', confidence: 'high', detail: 'from known list' };
  }

  if (IRREGULAR_VERBS.has(lowerWord)) {
    return { pos: 'verb', confidence: 'high', detail: 'irregular verb' };
  }

  if (PRONOUNS.has(lowerWord)) {
    return { pos: 'pronoun', confidence: 'high', detail: 'from known list' };
  }

  if (DETERMINERS.has(lowerWord)) {
    return { pos: 'determiner', confidence: 'high', detail: 'from known list' };
  }

  if (PREPOSITIONS.has(lowerWord)) {
    return { pos: 'preposition', confidence: 'high', detail: 'from known list' };
  }

  if (CONJUNCTIONS.has(lowerWord)) {
    return { pos: 'conjunction', confidence: 'high', detail: 'from known list' };
  }

  if (COMMON_ADVERBS.has(lowerWord)) {
    return { pos: 'adverb', confidence: 'high', detail: 'from known list' };
  }

  // Strategy 3: Other suffix-based pattern matching
  for (const rule of POS_RULES) {
    // Skip -ly and -ing since we already checked them
    if (rule.pattern.source.includes('ly$') || rule.pattern.source.includes('ing$')) {
      continue;
    }
    if (rule.pattern.test(word)) {
      return {
        pos: rule.pos,
        confidence: rule.confidence,
        detail: 'suffix pattern'
      };
    }
  }

  // Strategy 3: Capitalization hints
  if (word[0] === word[0].toUpperCase() && word.length > 1) {
    // Could be proper noun or sentence start
    const isAllCaps = word === word.toUpperCase();
    if (!isAllCaps && word.length > 2) {
      return {
        pos: 'proper noun',
        confidence: 'low',
        detail: 'capitalization'
      };
    }
  }

  // Strategy 4: Length-based heuristics
  if (word.length <= 3) {
    return {
      pos: 'function word',
      confidence: 'low',
      detail: 'short word'
    };
  }

  // Default: unknown
  return {
    pos: 'unknown',
    confidence: 'none',
    detail: 'no pattern matched'
  };
}

/**
 * Get a simplified POS tag for display
 * @param {string} word - Word to analyze
 * @returns {string} Simple POS tag or empty string
 */
export function getSimplePOS(word) {
  const result = detectPOS(word);

  if (result.confidence === 'none') {
    return '';
  }

  // Map detailed POS to simple tags
  const posMapping = {
    'verb': 'v',
    'verb (gerund)': 'v-ing',
    'verb (past)': 'v-ed',
    'modal verb': 'modal',
    'noun': 'n',
    'noun (plural)': 'n-pl',
    'proper noun': 'n-prop',
    'adjective': 'adj',
    'adverb': 'adv',
    'pronoun': 'pron',
    'preposition': 'prep',
    'conjunction': 'conj',
    'determiner': 'det',
    'function word': 'func'
  };

  return posMapping[result.pos] || result.pos;
}

/**
 * Get formatted POS display with confidence indicator
 * @param {string} word - Word to analyze
 * @param {boolean} showConfidence - Whether to show confidence level
 * @returns {string} Formatted POS string
 */
export function getFormattedPOS(word, showConfidence = false) {
  const result = detectPOS(word);

  if (result.confidence === 'none') {
    return '—';
  }

  const simple = getSimplePOS(word);
  const confidenceMarker = showConfidence ? {
    'high': '',
    'medium': '?',
    'low': '??'
  }[result.confidence] : '';

  return `${simple}${confidenceMarker}`;
}

/**
 * Batch POS detection for multiple words
 * @param {string[]} words - Array of words to analyze
 * @returns {POSResult[]} Array of POS results
 */
export function detectPOSBatch(words) {
  return words.map(word => detectPOS(word));
}
