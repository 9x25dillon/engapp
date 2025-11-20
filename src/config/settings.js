/**
 * @fileoverview Centralized configuration for Thesaurus Buddy
 * All configurable settings, constants, and default values are defined here.
 */

/**
 * Default application settings
 * @const {Object}
 */
export const DEFAULT_SETTINGS = {
  // Editor settings
  editor: {
    maxHistory: 100,
    autoSaveDelay: 500, // ms
    storageKey: 'tb_text',
    defaultText: "I am drafting an essay, but some parts feel very weak and kind of wordy. The live focus cursor should track my current sentence and suggest sharper words in real time."
  },

  // API settings
  api: {
    endpoint: 'https://api.datamuse.com/words',
    maxRetries: 3,
    retryDelays: [1000, 2000, 4000], // ms
    timeout: 10000, // ms
    maxResults: 80
  },

  // Lookup settings
  lookup: {
    debounceDelay: 250, // ms
    minQueryLength: 2,
    fragmentThreshold: 3
  },

  // Topic extraction settings
  topics: {
    cacheSize: 20,
    minKeywordLength: 3,
    maxKeywords: 6,
    computeDelay: 100, // ms
    idleTimeout: 1000 // ms
  },

  // UI settings
  ui: {
    presencePulseDelay: 120, // ms
    chipNavigationWrap: true,
    showScores: true,
    showPOSTags: true
  }
};

/**
 * Weak words and phrases to flag in text
 * Organized by severity and type
 * @const {Object}
 */
export const WEAK_WORDS = {
  // Single-word intensifiers and fillers
  intensifiers: [
    'very', 'really', 'quite', 'extremely', 'incredibly',
    'absolutely', 'totally', 'completely', 'utterly'
  ],

  // Vague words
  vague: [
    'stuff', 'things', 'something', 'anything', 'everything',
    'good', 'bad', 'nice', 'okay'
  ],

  // Verbal tics
  fillers: [
    'basically', 'literally', 'actually', 'honestly',
    'seriously', 'definitely', 'probably', 'maybe'
  ],

  // Weakening words
  hedges: [
    'just', 'only', 'merely', 'simply', 'rather',
    'somewhat', 'fairly', 'pretty', 'quite'
  ],

  // Multi-word phrases (as regex patterns)
  phrases: [
    /\bkind\s+of\b/giu,
    /\bsort\s+of\b/giu,
    /\ba\s+lot\b/giu,
    /\ba\s+bit\b/giu,
    /\bin\s+fact\b/giu,
    /\byou\s+know\b/giu,
    /\bi\s+mean\b/giu,
    /\bi\s+think\b/giu,
    /\bi\s+feel\b/giu,
    /\bi\s+believe\b/giu,
    /\bin\s+my\s+opinion\b/giu,
    /\bto\s+be\s+honest\b/giu,
    /\bfor\s+the\s+most\s+part\b/giu
  ]
};

/**
 * Enhanced stopwords list for topic extraction
 * Includes common English stopwords plus domain-specific ones
 * @const {Set<string>}
 */
export const STOPWORDS = new Set([
  // Articles
  'the', 'a', 'an',

  // Conjunctions
  'and', 'or', 'but', 'nor', 'yet', 'so', 'for',

  // Prepositions
  'in', 'on', 'at', 'to', 'from', 'with', 'by', 'of', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'against', 'within', 'without',

  // Pronouns
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'this', 'that', 'these', 'those',

  // Common verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'will', 'would', 'shall', 'should', 'may', 'might',
  'can', 'could', 'must',

  // Common adverbs/adjectives
  'not', 'no', 'yes', 'than', 'then', 'so', 'such',
  'more', 'most', 'less', 'least', 'very', 'too',
  'each', 'every', 'all', 'both', 'few', 'some', 'any',
  'other', 'another', 'same', 'different',

  // Contractions (expanded forms)
  "don't", "doesn't", "didn't", "won't", "wouldn't",
  "can't", "couldn't", "shouldn't", "mustn't",
  "isn't", "aren't", "wasn't", "weren't",
  "hasn't", "haven't", "hadn't",

  // Discourse markers
  'well', 'now', 'just', 'like', 'also', 'still', 'even',
  'again', 'further', 'already', 'often', 'always', 'never'
]);

/**
 * Enhanced Part-of-Speech detection rules
 * Ordered by priority (most specific first)
 * @const {Array<{pattern: RegExp, pos: string, confidence: string}>}
 */
export const POS_RULES = [
  // Adverbs
  { pattern: /ly$/i, pos: 'adverb', confidence: 'high' },
  { pattern: /ward(s)?$/i, pos: 'adverb', confidence: 'medium' },
  { pattern: /wise$/i, pos: 'adverb', confidence: 'medium' },

  // Verbs - past/present participle
  { pattern: /ing$/i, pos: 'verb (gerund)', confidence: 'high' },
  { pattern: /ed$/i, pos: 'verb (past)', confidence: 'medium' },
  { pattern: /(ize|ise|ate|fy|en)$/i, pos: 'verb', confidence: 'medium' },

  // Nouns
  { pattern: /(tion|sion|ment|ness|ity|ance|ence|ship|hood)$/i, pos: 'noun', confidence: 'high' },
  { pattern: /(er|or|ist|ian|ant|ent)$/i, pos: 'noun', confidence: 'medium' },
  { pattern: /s$/i, pos: 'noun (plural)', confidence: 'low' },

  // Adjectives
  { pattern: /(ous|ious|eous)$/i, pos: 'adjective', confidence: 'high' },
  { pattern: /(ful|less|able|ible)$/i, pos: 'adjective', confidence: 'high' },
  { pattern: /(al|ial|ic|ive|ish|y)$/i, pos: 'adjective', confidence: 'medium' },
  { pattern: /(an|ean|ian)$/i, pos: 'adjective', confidence: 'low' }
];

/**
 * Color scheme configuration
 * @const {Object}
 */
export const THEME = {
  colors: {
    bg: '#0f1220',
    panel: '#171a2c',
    ink: '#eceff6',
    muted: '#a9b1d6',
    accent: '#7aa2f7',
    accent2: '#9ece6a',
    danger: '#f7768e',
    shadow: 'rgba(0,0,0,.35)'
  },
  timing: {
    transition: '150ms',
    animationDelay: '120ms'
  }
};

/**
 * Settings manager class
 * Handles loading, saving, and updating settings
 */
export class Settings {
  constructor() {
    this.settings = this.load();
  }

  /**
   * Load settings from localStorage or use defaults
   * @returns {Object} The loaded settings
   */
  load() {
    try {
      const saved = localStorage.getItem('tb_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Deep merge with defaults to ensure all keys exist
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings, using defaults:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); // Deep clone
  }

  /**
   * Save current settings to localStorage
   * @returns {boolean} Success status
   */
  save() {
    try {
      localStorage.setItem('tb_settings', JSON.stringify(this.settings));
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  }

  /**
   * Get a setting value by dot-notation path
   * @param {string} path - Dot-notation path (e.g., 'api.maxRetries')
   * @returns {*} The setting value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
  }

  /**
   * Set a setting value by dot-notation path
   * @param {string} path - Dot-notation path (e.g., 'api.maxRetries')
   * @param {*} value - The value to set
   * @returns {boolean} Success status
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.settings);

    target[lastKey] = value;
    return this.save();
  }

  /**
   * Reset settings to defaults
   * @returns {boolean} Success status
   */
  reset() {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    return this.save();
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

/**
 * Singleton settings instance
 */
export const settings = new Settings();
