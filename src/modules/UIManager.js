/**
 * @fileoverview UI Manager
 * Handles all DOM manipulation and UI updates
 */

import { escapeHTML } from '../utils/textProcessing.js';
import { getFormattedPOS } from '../utils/posDetection.js';
import { settings } from '../config/settings.js';

/**
 * UIManager class
 * Manages all user interface updates and interactions
 */
export class UIManager {
  /**
   * @param {Object} elements - DOM elements
   */
  constructor(elements) {
    this.elements = elements;
    this.resultHandlers = new Map();
  }

  /**
   * Render overlay with sentence and word highlighting
   * @param {string} text - Full text
   * @param {Object} sentenceBounds - Sentence boundaries
   * @param {Object} fragment - Word fragment
   */
  renderOverlay(text, sentenceBounds, fragment) {
    const { sentStart, sentEnd } = sentenceBounds;

    const beforeText = text.slice(0, sentStart);
    const focusText = text.slice(sentStart, sentEnd);
    const afterText = text.slice(sentEnd);

    let focusHTML = '';

    if (fragment.word) {
      const relStart = Math.max(0, Math.min(fragment.start - sentStart, focusText.length));
      const relEnd = Math.max(0, Math.min(fragment.end - sentStart, focusText.length));

      focusHTML =
        escapeHTML(focusText.slice(0, relStart)) +
        '<span class="focus-word">' + escapeHTML(focusText.slice(relStart, relEnd)) + '</span>' +
        escapeHTML(focusText.slice(relEnd));
    } else {
      focusHTML = escapeHTML(focusText);
    }

    this.elements.overlay.innerHTML =
      escapeHTML(beforeText) +
      '<span class="focus-sent">' + focusHTML + '</span>' +
      escapeHTML(afterText);
  }

  /**
   * Update KPI displays
   * @param {Object} data - KPI data
   */
  updateKPIs(data) {
    const { fragment, pos, sentenceLength } = data;

    this.elements.kFrag.textContent = fragment || '—';
    this.elements.kPOS.textContent = pos || '—';
    this.elements.kLen.textContent = sentenceLength || 0;
  }

  /**
   * Show loading state in results
   */
  showLoading() {
    this.elements.results.setAttribute('aria-busy', 'true');
    this.elements.results.textContent = 'Searching…';
  }

  /**
   * Show error in results
   * @param {string} message - Error message
   */
  showError(message) {
    this.elements.results.setAttribute('aria-busy', 'false');
    this.elements.results.innerHTML = `<div class="empty error">${escapeHTML(message)}</div>`;
  }

  /**
   * Show empty state in results
   * @param {string} message - Message to display
   */
  showEmpty(message = 'Type to search…') {
    this.elements.results.setAttribute('aria-busy', 'false');
    this.elements.results.innerHTML = `<div class="empty">${escapeHTML(message)}</div>`;
  }

  /**
   * Render results chips
   * @param {Array} items - Result items
   * @param {Function} onSelect - Selection callback
   */
  renderResults(items, onSelect) {
    this.elements.results.setAttribute('aria-busy', 'false');
    this.elements.results.innerHTML = '';
    this.resultHandlers.clear();

    if (!items || items.length === 0) {
      this.showEmpty('No ideas found.');
      return;
    }

    for (const item of items) {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.tabIndex = 0;
      chip.setAttribute('role', 'listitem');

      // Extract POS from tags
      const pos = (item.tags || []).find(t => ['n', 'v', 'adj', 'adv'].includes(t)) || '';
      const showScores = settings.get('ui.showScores');
      const showPOS = settings.get('ui.showPOSTags');

      chip.innerHTML = `
        <span>${escapeHTML(item.word)}</span>
        ${showScores && item.score ? `<span class="meta">${item.score}</span>` : ''}
        ${showPOS && pos ? `<span class="pos">${escapeHTML(pos)}</span>` : ''}
      `;

      // Click handler
      const handler = () => onSelect(item.word);
      chip.addEventListener('click', handler);
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });

      this.resultHandlers.set(chip, handler);
      this.elements.results.appendChild(chip);
    }

    // Setup keyboard navigation
    this.setupChipNavigation();
  }

  /**
   * Setup keyboard navigation for result chips
   */
  setupChipNavigation() {
    this.elements.results.addEventListener('keydown', (e) => {
      const chips = [...this.elements.results.querySelectorAll('.chip')];
      const currentIndex = chips.indexOf(document.activeElement);

      if (currentIndex >= 0 && chips.length > 0) {
        let nextIndex = -1;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextIndex = (currentIndex + 1) % chips.length;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nextIndex = (currentIndex - 1 + chips.length) % chips.length;
        }

        if (nextIndex >= 0) {
          chips[nextIndex].focus();
        }
      }
    });
  }

  /**
   * Render topic tags
   * @param {Array<string>} topics - Topic keywords
   */
  renderTopics(topics) {
    if (!topics || topics.length === 0) {
      this.elements.topics.innerHTML = '<span class="empty">Computing topics...</span>';
      return;
    }

    let html = '';
    for (const topic of topics) {
      html += `<span class="chip">#${escapeHTML(topic)}</span>`;
    }
    this.elements.topics.innerHTML = html;
  }

  /**
   * Pulse presence indicator
   */
  pulsePresence() {
    const dot = this.elements.presenceDot;
    const delay = settings.get('ui.presencePulseDelay');

    dot.style.boxShadow = '0 0 14px 3px rgba(122,162,247,.65)';
    setTimeout(() => {
      dot.style.boxShadow = '0 0 10px 2px rgba(122,162,247,.45)';
    }, delay);
  }

  /**
   * Sync overlay scroll with editor
   * @param {number} scrollTop - Vertical scroll
   * @param {number} scrollLeft - Horizontal scroll
   */
  syncScroll(scrollTop, scrollLeft) {
    this.elements.overlay.scrollTop = scrollTop;
    this.elements.overlay.scrollLeft = scrollLeft;
  }

  /**
   * Update undo button state
   * @param {boolean} canUndo - Whether undo is available
   */
  updateUndoButton(canUndo) {
    this.elements.btnUndo.disabled = !canUndo;
  }

  /**
   * Set preview value
   * @param {string} value - Preview text
   */
  setPreview(value) {
    this.elements.preview.value = value;
  }

  /**
   * Get preview value
   * @returns {string} Preview text
   */
  getPreview() {
    return this.elements.preview.value.trim();
  }

  /**
   * Set word input value
   * @param {string} value - Word text
   */
  setWordInput(value) {
    this.elements.wordInput.value = value;
  }

  /**
   * Get word input value
   * @returns {string} Word text
   */
  getWordInput() {
    return this.elements.wordInput.value.trim();
  }

  /**
   * Clear word input
   */
  clearWordInput() {
    this.elements.wordInput.value = '';
  }

  /**
   * Clear preview
   */
  clearPreview() {
    this.elements.preview.value = '';
  }

  /**
   * Show notification toast
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, error)
   */
  showNotification(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('toast-show');
    }, 3000);
  }
}
