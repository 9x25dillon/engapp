/**
 * @fileoverview Main application module
 * Coordinates all components and handles application logic
 */

import { EditorController } from './modules/EditorController.js';
import { UIManager } from './modules/UIManager.js';
import { lookupWord, ApiError } from './utils/apiClient.js';
import { getFormattedPOS } from './utils/posDetection.js';
import { getCachedTopics } from './utils/topicExtraction.js';
import { flagWeakWords } from './utils/weakWordDetector.js';
import { countWords } from './utils/textProcessing.js';
import { settings } from './config/settings.js';

/**
 * Main application class
 */
export class ThesaurusBuddy {
  /**
   * Initialize the application
   */
  constructor() {
    this.initialized = false;
    this.lookupTimeout = null;
    this.topicTimeout = null;
    this.currentQuery = '';
  }

  /**
   * Initialize application with DOM elements
   */
  async init() {
    if (this.initialized) return;

    try {
      // Get DOM elements
      const elements = {
        editor: document.getElementById('editor'),
        overlay: document.getElementById('overlay'),
        wordInput: document.getElementById('word'),
        results: document.getElementById('results'),
        preview: document.getElementById('preview'),
        topics: document.getElementById('topics'),
        kFrag: document.getElementById('kFrag'),
        kPOS: document.getElementById('kPOS'),
        kLen: document.getElementById('kLen'),
        presenceDot: document.getElementById('presenceDot'),
        btnLookup: document.getElementById('lookup'),
        btnApply: document.getElementById('apply'),
        btnWeak: document.getElementById('btnWeak'),
        btnUndo: document.getElementById('btnUndo')
      };

      // Validate elements
      for (const [key, element] of Object.entries(elements)) {
        if (!element) {
          throw new Error(`Required element not found: ${key}`);
        }
      }

      // Initialize controllers
      this.editor = new EditorController(elements.editor);
      this.ui = new UIManager(elements);

      // Setup event listeners
      this.setupEventListeners(elements);

      // Initial render
      this.handleEditorChange();

      // Focus editor
      this.editor.focus();

      this.initialized = true;
      console.log('✅ Thesaurus Buddy initialized successfully');

    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Setup all event listeners
   * @param {Object} elements - DOM elements
   */
  setupEventListeners(elements) {
    // Editor events
    this.editor.on('change', () => this.handleEditorChange());
    this.editor.on('caret-move', () => this.handleCaretMove());
    this.editor.on('scroll', (data) => this.ui.syncScroll(data.scrollTop, data.scrollLeft));
    this.editor.on('history-change', (data) => this.ui.updateUndoButton(data.canUndo));

    // Lookup button
    elements.btnLookup.addEventListener('click', () => this.handleManualLookup());

    // Apply button
    elements.btnApply.addEventListener('click', () => this.handleApply());

    // Weak words button
    elements.btnWeak.addEventListener('click', () => this.handleFlagWeakWords());

    // Undo button
    elements.btnUndo.addEventListener('click', () => {
      this.editor.undo();
      this.handleEditorChange();
    });

    // Word input keyboard shortcuts
    elements.wordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleManualLookup();
      } else if (e.key === 'Escape') {
        this.ui.clearWordInput();
        this.ui.showEmpty();
      }
    });

    // Preview keyboard shortcuts
    elements.preview.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleApply();
      } else if (e.key === 'Escape') {
        this.ui.clearPreview();
      }
    });

    // Prevent overlay from intercepting clicks
    elements.overlay.style.pointerEvents = 'none';
  }

  /**
   * Handle editor content change
   */
  handleEditorChange() {
    const text = this.editor.getContent();
    const position = this.editor.getCaretPosition();
    const sentenceBounds = this.editor.getCurrentSentenceBounds();
    const fragment = this.editor.getCurrentFragment();

    // Render overlay
    this.ui.renderOverlay(text, sentenceBounds, fragment);

    // Update KPIs
    const sentence = this.editor.getCurrentSentence();
    this.ui.updateKPIs({
      fragment: fragment.word,
      pos: getFormattedPOS(fragment.word),
      sentenceLength: countWords(sentence)
    });

    // Pulse presence
    this.ui.pulsePresence();

    // Schedule auto-lookup
    this.scheduleAutoLookup();

    // Schedule topic extraction
    this.scheduleTopicExtraction(text);
  }

  /**
   * Handle caret movement
   */
  handleCaretMove() {
    this.handleEditorChange();
  }

  /**
   * Schedule auto-lookup (debounced)
   */
  scheduleAutoLookup() {
    if (this.editor.isComposing()) return;

    if (this.lookupTimeout) {
      clearTimeout(this.lookupTimeout);
    }

    const delay = settings.get('lookup.debounceDelay');
    this.lookupTimeout = setTimeout(() => {
      this.performAutoLookup();
    }, delay);
  }

  /**
   * Perform auto-lookup based on current fragment
   */
  async performAutoLookup() {
    const fragment = this.editor.getCurrentFragment();
    const word = fragment.word?.trim();
    const minLength = settings.get('lookup.minQueryLength');

    this.ui.setWordInput(word || '');

    if (!word || word.length < minLength) {
      this.ui.showEmpty();
      return;
    }

    // Don't repeat same query
    if (word === this.currentQuery) {
      return;
    }

    this.currentQuery = word;
    await this.performLookup(word, true);
  }

  /**
   * Handle manual lookup from search box
   */
  async handleManualLookup() {
    const query = this.ui.getWordInput();
    const minLength = settings.get('lookup.minQueryLength');

    if (!query || query.length < minLength) {
      this.ui.showEmpty('Enter a word to search');
      return;
    }

    const fragmentThreshold = settings.get('lookup.fragmentThreshold');
    const isFragment = query.length < fragmentThreshold;

    this.currentQuery = query;
    await this.performLookup(query, isFragment);
  }

  /**
   * Perform API lookup
   * @param {string} query - Query string
   * @param {boolean} isFragment - Whether this is a fragment
   */
  async performLookup(query, isFragment) {
    this.ui.showLoading();

    try {
      const results = await lookupWord(query, isFragment);

      this.ui.renderResults(results, (word) => {
        this.ui.setPreview(word);
        this.handleApply();
      });

    } catch (error) {
      if (error instanceof ApiError && error.type === 'ABORT_ERROR') {
        // Silently ignore aborted requests
        return;
      }

      console.error('Lookup error:', error);
      const message = error instanceof ApiError
        ? error.getUserMessage()
        : 'Failed to fetch suggestions. Please try again.';

      this.ui.showError(message);
    }
  }

  /**
   * Handle apply replacement
   */
  handleApply() {
    const target = this.ui.getWordInput();
    const replacement = this.ui.getPreview();

    if (!target || !replacement) {
      this.ui.showNotification('Enter both a target word and replacement', 'error');
      return;
    }

    // Check if target matches current word
    const fragment = this.editor.getCurrentFragment();
    const isLocalReplace = fragment.word?.toLowerCase() === target.toLowerCase();

    this.editor.replaceWord(target, replacement, !isLocalReplace);
    this.ui.showNotification(`Replaced "${target}" with "${replacement}"`, 'success');

    // Update UI
    this.handleEditorChange();
  }

  /**
   * Handle flag weak words
   */
  handleFlagWeakWords() {
    const text = this.editor.getContent();
    const flagged = flagWeakWords(text);

    this.editor.setContent(flagged);
    this.ui.showNotification('Weak words flagged with « »', 'info');
    this.handleEditorChange();
  }

  /**
   * Schedule topic extraction (debounced)
   * @param {string} text - Text to analyze
   */
  scheduleTopicExtraction(text) {
    if (this.topicTimeout) {
      clearTimeout(this.topicTimeout);
    }

    const delay = settings.get('topics.computeDelay');
    this.topicTimeout = setTimeout(() => {
      this.extractTopics(text);
    }, delay);
  }

  /**
   * Extract and render topics
   * @param {string} text - Text to analyze
   */
  extractTopics(text) {
    const count = settings.get('topics.maxKeywords');

    // Use idle callback if available
    const compute = () => {
      const topics = getCachedTopics(text, count, 'frequency');
      this.ui.renderTopics(topics);
    };

    if (window.requestIdleCallback) {
      const timeout = settings.get('topics.idleTimeout');
      requestIdleCallback(compute, { timeout });
    } else {
      compute();
    }
  }

  /**
   * Destroy application and clean up
   */
  destroy() {
    // Clear timeouts
    if (this.lookupTimeout) clearTimeout(this.lookupTimeout);
    if (this.topicTimeout) clearTimeout(this.topicTimeout);

    // Destroy controllers
    if (this.editor) this.editor.destroy();

    this.initialized = false;
  }
}

/**
 * Initialize application when DOM is ready
 */
export function initApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const app = new ThesaurusBuddy();
      app.init().catch(error => {
        console.error('Failed to start application:', error);
        alert('Failed to start Thesaurus Buddy. Please refresh the page.');
      });

      // Expose app globally for debugging
      window.thesaurusBuddy = app;
    });
  } else {
    const app = new ThesaurusBuddy();
    app.init().catch(error => {
      console.error('Failed to start application:', error);
      alert('Failed to start Thesaurus Buddy. Please refresh the page.');
    });

    window.thesaurusBuddy = app;
  }
}
