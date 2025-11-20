/**
 * @fileoverview Text processing utilities
 * Handles word boundaries, sentence detection, case preservation,
 * and text manipulation with full Unicode support.
 */

/**
 * Detect Unicode property escapes support
 * @returns {boolean} True if Unicode property escapes are supported
 */
export const hasUnicodeSupport = (() => {
  try {
    return /\p{L}/u.test('a');
  } catch {
    return false;
  }
})();

/**
 * Unified word character class for regex
 * Supports letters, numbers, apostrophes, and various dashes
 * @const {string}
 */
export const WORD_CLASS = hasUnicodeSupport
  ? "\\p{L}\\p{N}'\\u2019\\u2010\\u2011\\u2012\\u2013\\u2014-"
  : "a-zA-Z0-9'\\u2019\\u2010\\u2011\\u2012\\u2013\\u2014-";

/**
 * Word boundary class (negation of WORD_CLASS)
 * @const {string}
 */
export const WORD_BOUNDARY = `[^${WORD_CLASS}]`;

/**
 * Regex for testing if character is part of a word
 * @const {RegExp}
 */
export const WORD_RE = new RegExp(`[${WORD_CLASS}]`, hasUnicodeSupport ? 'u' : '');

/**
 * Regex for extracting keywords
 * @const {RegExp}
 */
export const KEYWORD_RE = new RegExp(`[${WORD_CLASS}]+`, hasUnicodeSupport ? 'gu' : 'g');

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for use in regex
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} HTML-safe string
 */
export function escapeHTML(str) {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };
  return str.replace(/[&<>"'`]/g, char => htmlEscapes[char]);
}

/**
 * Get caret position safely (handles unfocused elements)
 * @param {HTMLTextAreaElement} element - Textarea element
 * @returns {number} Caret position
 */
export function getCaretPosition(element) {
  return element.selectionStart == null
    ? (element.value || '').length
    : element.selectionStart;
}

/**
 * Set caret position and focus element
 * @param {HTMLTextAreaElement} element - Textarea element
 * @param {number} position - Position to set caret
 */
export function setCaretPosition(element, position) {
  element.focus();
  element.setSelectionRange(position, position);
}

/**
 * Find sentence boundaries around a given position
 * Considers periods, exclamation marks, question marks, and newlines
 *
 * @param {string} text - Full text to analyze
 * @param {number} index - Current cursor position
 * @returns {{sentStart: number, sentEnd: number}} Sentence boundaries
 */
export function getSentenceBounds(text, index) {
  const left = text.slice(0, index);
  const right = text.slice(index);

  // Find the latest sentence terminator before cursor
  const lastPeriod = left.lastIndexOf('.');
  const lastExclaim = left.lastIndexOf('!');
  const lastQuestion = left.lastIndexOf('?');
  const lastNewline = left.lastIndexOf('\n');

  const sentStart = Math.max(0, lastPeriod + 1, lastExclaim + 1, lastQuestion + 1, lastNewline + 1);

  // Find the next sentence terminator after cursor
  let endOffset = right.search(/[.!?\n]/);
  const sentEnd = endOffset === -1 ? text.length : index + endOffset + 1;

  return { sentStart, sentEnd };
}

/**
 * Extract the word fragment at a given position
 * Handles Unicode characters, apostrophes, and hyphens
 *
 * @param {string} text - Full text to analyze
 * @param {number} index - Current cursor position
 * @returns {{word: string, start: number, end: number}} Word fragment info
 */
export function getWordFragment(text, index) {
  let start = index;
  let end = index;

  // Expand left
  while (start > 0 && WORD_RE.test(text[start - 1])) {
    start--;
  }

  // Expand right
  while (end < text.length && WORD_RE.test(text[end])) {
    end++;
  }

  const word = text.slice(start, end);
  return { word, start, end };
}

/**
 * Preserve the case pattern of the original word when replacing
 * Handles: UPPERCASE, Title Case, lowercase
 *
 * @param {string} original - Original word with case pattern
 * @param {string} replacement - New word to apply case to
 * @returns {string} Replacement with preserved case
 *
 * @example
 * preserveCase('HELLO', 'world') // 'WORLD'
 * preserveCase('Hello', 'world') // 'World'
 * preserveCase('hello', 'WORLD') // 'world'
 */
export function preserveCase(original, replacement) {
  if (!original) return replacement;

  // All uppercase
  if (original === original.toUpperCase() && original !== original.toLowerCase()) {
    return replacement.toUpperCase();
  }

  // Title case (first letter uppercase)
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    // Handle multi-word replacements
    const words = replacement.split(/\s+/);
    return words
      .map(w => /^[A-Za-z]/.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
      .join(' ');
  }

  // Default to lowercase
  return replacement.toLowerCase();
}

/**
 * Replace a word globally in text with boundary awareness
 *
 * @param {string} text - Text to search in
 * @param {string} target - Word to replace
 * @param {string} replacement - Replacement word
 * @returns {string} Text with replacements
 */
export function replaceWordGlobally(text, target, replacement) {
  const flags = hasUnicodeSupport ? 'giu' : 'gi';
  const pattern = new RegExp(
    `(^|${WORD_BOUNDARY})(${escapeRegExp(target)})($|${WORD_BOUNDARY})`,
    flags
  );

  return text.replace(pattern, (match, before, word, after) => {
    return before + preserveCase(word, replacement) + after;
  });
}

/**
 * Count words in text
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Get text statistics
 * @param {string} text - Text to analyze
 * @returns {Object} Statistics including word count, character count, etc.
 */
export function getTextStats(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    averageWordLength: words.length > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / words.length
      : 0,
    averageSentenceLength: sentences.length > 0
      ? words.length / sentences.length
      : 0
  };
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} ellipsis - Ellipsis string (default: '...')
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength, ellipsis = '...') {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Normalize whitespace in text
 * @param {string} text - Text to normalize
 * @returns {string} Text with normalized whitespace
 */
export function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '  ') // Convert tabs to spaces
    .replace(/ +/g, ' ') // Collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n'); // Collapse multiple newlines
}
