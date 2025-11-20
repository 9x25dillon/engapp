/**
 * @fileoverview Editor controller
 * Manages editor state, history, and text manipulation
 */

import {
  getSentenceBounds,
  getWordFragment,
  getCaretPosition,
  setCaretPosition,
  replaceWordGlobally,
  preserveCase
} from '../utils/textProcessing.js';
import { settings } from '../config/settings.js';

/**
 * Editor state change event
 * @typedef {Object} EditorStateChange
 * @property {string} type - Type of change
 * @property {*} [data] - Additional data
 */

/**
 * EditorController class
 * Manages all editor interactions and state
 */
export class EditorController {
  /**
   * @param {HTMLTextAreaElement} editorElement - Textarea element
   */
  constructor(editorElement) {
    this.editor = editorElement;
    this.history = [];
    this.maxHistory = settings.get('editor.maxHistory');
    this.listeners = new Map();
    this.composing = false;

    this.setupEventListeners();
    this.loadContent();
  }

  /**
   * Setup event listeners on editor
   */
  setupEventListeners() {
    // Composition events (for IME input)
    this.editor.addEventListener('compositionstart', () => {
      this.composing = true;
    });

    this.editor.addEventListener('compositionend', () => {
      this.composing = false;
      this.emit('change', { source: 'composition' });
    });

    // Input events
    this.editor.addEventListener('input', () => {
      if (!this.composing) {
        this.emit('change', { source: 'input' });
        this.scheduleAutoSave();
      }
    });

    // Caret movement events
    this.editor.addEventListener('keyup', () => {
      this.emit('caret-move', { position: this.getCaretPosition() });
    });

    this.editor.addEventListener('mouseup', () => {
      this.emit('caret-move', { position: this.getCaretPosition() });
    });

    // Selection change
    this.editor.addEventListener('select', () => {
      this.emit('selection-change', {
        start: this.editor.selectionStart,
        end: this.editor.selectionEnd
      });
    });

    // Scroll events
    this.editor.addEventListener('scroll', () => {
      this.emit('scroll', {
        scrollTop: this.editor.scrollTop,
        scrollLeft: this.editor.scrollLeft
      });
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }

  /**
   * Get current editor content
   * @returns {string} Editor text
   */
  getContent() {
    return this.editor.value;
  }

  /**
   * Set editor content
   * @param {string} text - New text
   * @param {boolean} addToHistory - Whether to add to history
   */
  setContent(text, addToHistory = true) {
    if (addToHistory) {
      this.addToHistory(this.editor.value);
    }
    this.editor.value = text;
    this.emit('change', { source: 'set-content' });
  }

  /**
   * Get caret position
   * @returns {number} Caret position
   */
  getCaretPosition() {
    return getCaretPosition(this.editor);
  }

  /**
   * Set caret position
   * @param {number} position - Position to set
   */
  setCaretPosition(position) {
    setCaretPosition(this.editor, position);
  }

  /**
   * Get current sentence bounds
   * @returns {{sentStart: number, sentEnd: number}} Sentence boundaries
   */
  getCurrentSentenceBounds() {
    const text = this.getContent();
    const position = this.getCaretPosition();
    return getSentenceBounds(text, position);
  }

  /**
   * Get current sentence text
   * @returns {string} Current sentence
   */
  getCurrentSentence() {
    const text = this.getContent();
    const { sentStart, sentEnd } = this.getCurrentSentenceBounds();
    return text.slice(sentStart, sentEnd);
  }

  /**
   * Get current word fragment
   * @returns {{word: string, start: number, end: number}} Word fragment
   */
  getCurrentFragment() {
    const text = this.getContent();
    const position = this.getCaretPosition();
    return getWordFragment(text, position);
  }

  /**
   * Replace word in editor
   * @param {string} target - Word to replace
   * @param {string} replacement - Replacement word
   * @param {boolean} global - Replace all occurrences
   */
  replaceWord(target, replacement, global = false) {
    this.addToHistory(this.editor.value);

    const text = this.getContent();
    const position = this.getCaretPosition();

    if (global) {
      // Global replacement with case preservation
      const newText = replaceWordGlobally(text, target, replacement);
      this.setContent(newText, false);
    } else {
      // Local replacement at cursor
      const { word, start, end } = this.getCurrentFragment();

      if (word && word.toLowerCase() === target.toLowerCase()) {
        const before = text.slice(0, start);
        const after = text.slice(end);
        const casedReplacement = preserveCase(word, replacement);

        this.editor.value = before + casedReplacement + after;
        this.setCaretPosition(start + casedReplacement.length);
      } else {
        // No word at cursor, do global replace
        const newText = replaceWordGlobally(text, target, replacement);
        this.setContent(newText, false);
      }
    }

    this.emit('change', { source: 'replace-word' });
  }

  /**
   * Add current state to history
   * @param {string} state - State to add
   */
  addToHistory(state) {
    this.history.push(state);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.emit('history-change', { canUndo: this.canUndo() });
  }

  /**
   * Undo last change
   * @returns {boolean} Success status
   */
  undo() {
    if (!this.canUndo()) return false;

    const previousState = this.history.pop();
    this.editor.value = previousState;
    this.emit('change', { source: 'undo' });
    this.emit('history-change', { canUndo: this.canUndo() });

    return true;
  }

  /**
   * Check if undo is available
   * @returns {boolean} True if can undo
   */
  canUndo() {
    return this.history.length > 0;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    this.emit('history-change', { canUndo: false });
  }

  /**
   * Load content from localStorage
   */
  loadContent() {
    try {
      const storageKey = settings.get('editor.storageKey');
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        this.editor.value = saved;
        console.log('📝 Restored draft from localStorage');
      } else {
        this.editor.value = settings.get('editor.defaultText');
      }

      this.emit('change', { source: 'load' });
    } catch (error) {
      console.error('Failed to load content:', error);
      this.editor.value = settings.get('editor.defaultText');
    }
  }

  /**
   * Save content to localStorage
   */
  saveContent() {
    try {
      const storageKey = settings.get('editor.storageKey');
      localStorage.setItem(storageKey, this.editor.value);
      this.emit('save', { success: true });
    } catch (error) {
      console.error('Failed to save content:', error);
      this.emit('save', { success: false, error });
    }
  }

  /**
   * Schedule auto-save (debounced)
   */
  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    const delay = settings.get('editor.autoSaveDelay');
    this.autoSaveTimeout = setTimeout(() => {
      this.saveContent();
    }, delay);
  }

  /**
   * Focus the editor
   */
  focus() {
    this.editor.focus();
  }

  /**
   * Get selection
   * @returns {{start: number, end: number, text: string}} Selection info
   */
  getSelection() {
    return {
      start: this.editor.selectionStart,
      end: this.editor.selectionEnd,
      text: this.editor.value.slice(this.editor.selectionStart, this.editor.selectionEnd)
    };
  }

  /**
   * Set selection
   * @param {number} start - Start position
   * @param {number} end - End position
   */
  setSelection(start, end) {
    this.editor.focus();
    this.editor.setSelectionRange(start, end);
  }

  /**
   * Insert text at cursor
   * @param {string} text - Text to insert
   */
  insertText(text) {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    const before = this.editor.value.slice(0, start);
    const after = this.editor.value.slice(end);

    this.addToHistory(this.editor.value);
    this.editor.value = before + text + after;
    this.setCaretPosition(start + text.length);

    this.emit('change', { source: 'insert' });
  }

  /**
   * Check if currently composing (IME active)
   * @returns {boolean} True if composing
   */
  isComposing() {
    return this.composing;
  }

  /**
   * Get editor statistics
   * @returns {Object} Editor stats
   */
  getStats() {
    const text = this.getContent();
    const words = text.trim().split(/\s+/).filter(Boolean);
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const lines = text.split('\n').length;

    return {
      characters: chars,
      charactersNoSpaces: charsNoSpaces,
      words: words.length,
      lines,
      historySize: this.history.length
    };
  }

  /**
   * Destroy controller and clean up
   */
  destroy() {
    // Save before destroying
    this.saveContent();

    // Clear timeouts
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Clear listeners
    this.listeners.clear();

    // Clear history
    this.history = [];
  }
}
