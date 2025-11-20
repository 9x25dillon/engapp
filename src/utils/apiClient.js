/**
 * @fileoverview API client for Datamuse thesaurus service
 * Handles network requests with retry logic, abort control, and error handling
 */

import { settings } from '../config/settings.js';

/**
 * Error types for API requests
 * @enum {string}
 */
export const ApiErrorType = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  PARSE: 'PARSE_ERROR',
  ABORT: 'ABORT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} type - Error type from ApiErrorType
   * @param {number} [statusCode] - HTTP status code
   * @param {*} [originalError] - Original error object
   */
  constructor(message, type, statusCode = null, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = new Date();
  }

  /**
   * Get user-friendly error message
   * @returns {string} Human-readable error message
   */
  getUserMessage() {
    switch (this.type) {
      case ApiErrorType.NETWORK:
        return 'Network connection failed. Please check your internet connection.';
      case ApiErrorType.TIMEOUT:
        return 'Request timed out. The server took too long to respond.';
      case ApiErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ApiErrorType.PARSE:
        return 'Failed to process server response.';
      case ApiErrorType.ABORT:
        return 'Request was cancelled.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Active request controller for cancellation
 * @type {AbortController|null}
 */
let currentController = null;

/**
 * Request counter for deduplication
 * @type {number}
 */
let requestToken = 0;

/**
 * Abort the current request if one is in progress
 */
export function abortCurrentRequest() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make a fetch request with timeout support
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Merge abort signals if one exists in options
    const signal = options.signal
      ? mergeAbortSignals(options.signal, controller.signal)
      : controller.signal;

    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Merge multiple abort signals
 * @param {...AbortSignal} signals - Signals to merge
 * @returns {AbortSignal} Merged signal
 */
function mergeAbortSignals(...signals) {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Make API request with retry logic
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {AbortController} controller - Abort controller
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Array>} API response data
 * @throws {ApiError} On request failure
 */
async function makeRequest(endpoint, params, controller, attempt = 0) {
  const maxRetries = settings.get('api.maxRetries');
  const retryDelays = settings.get('api.retryDelays');
  const timeout = settings.get('api.timeout');

  try {
    // Build URL with query parameters
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, value);
      }
    });

    // Make request with timeout
    const response = await fetchWithTimeout(
      url.toString(),
      { signal: controller.signal },
      timeout
    );

    // Handle rate limiting with retry
    if (response.status === 429 && attempt < maxRetries) {
      const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
      console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
      return makeRequest(endpoint, params, controller, attempt + 1);
    }

    // Handle HTTP errors
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status === 429 ? ApiErrorType.RATE_LIMIT : ApiErrorType.NETWORK,
        response.status
      );
    }

    // Parse JSON response
    try {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (parseError) {
      throw new ApiError(
        'Failed to parse API response',
        ApiErrorType.PARSE,
        response.status,
        parseError
      );
    }

  } catch (error) {
    // Handle abort
    if (error.name === 'AbortError') {
      throw new ApiError(
        'Request aborted',
        ApiErrorType.ABORT,
        null,
        error
      );
    }

    // Handle timeout
    if (error.message && error.message.includes('timeout')) {
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
        console.warn(`Timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        return makeRequest(endpoint, params, controller, attempt + 1);
      }

      throw new ApiError(
        'Request timed out',
        ApiErrorType.TIMEOUT,
        null,
        error
      );
    }

    // Retry on network errors
    if (attempt < maxRetries) {
      const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
      console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
      return makeRequest(endpoint, params, controller, attempt + 1);
    }

    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap unknown errors
    throw new ApiError(
      error.message || 'Unknown error occurred',
      ApiErrorType.UNKNOWN,
      null,
      error
    );
  }
}

/**
 * Query Datamuse API for word suggestions
 *
 * @param {Object} params - Query parameters
 * @param {string} [params.rel_syn] - Words with similar meaning (synonyms)
 * @param {string} [params.ml] - Words with similar meaning (broader)
 * @param {string} [params.sp] - Spelling/sounds like
 * @param {string} [params.rel_trg] - Related trigger words
 * @param {string} [params.rel_ant] - Antonyms
 * @param {string} [params.md] - Metadata flags (p=parts of speech, d=definitions, etc)
 * @param {number} [params.max] - Maximum results
 * @returns {Promise<Array>} Array of word objects
 * @throws {ApiError} On request failure
 */
export async function queryDatamuse(params) {
  // Abort any in-progress request
  abortCurrentRequest();

  // Create new controller
  currentController = new AbortController();
  const token = ++requestToken;

  try {
    const endpoint = settings.get('api.endpoint');
    const data = await makeRequest(endpoint, params, currentController);

    // Check if this response is still relevant
    if (token !== requestToken) {
      throw new ApiError(
        'Request superseded by newer request',
        ApiErrorType.ABORT
      );
    }

    return data;
  } finally {
    // Clean up if this was the latest request
    if (token === requestToken) {
      currentController = null;
    }
  }
}

/**
 * Get synonyms for a word
 *
 * @param {string} word - Word to find synonyms for
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of synonym objects
 */
export async function getSynonyms(word, maxResults = 50) {
  return queryDatamuse({
    rel_syn: word,
    md: 'p', // Include parts of speech
    max: maxResults
  });
}

/**
 * Get words with similar meaning (broader than synonyms)
 *
 * @param {string} word - Word to find similar words for
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of similar word objects
 */
export async function getSimilarWords(word, maxResults = 50) {
  return queryDatamuse({
    ml: word,
    md: 'p',
    max: maxResults
  });
}

/**
 * Get spelling completions for a fragment
 *
 * @param {string} fragment - Word fragment
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of completion objects
 */
export async function getCompletions(fragment, maxResults = 50) {
  return queryDatamuse({
    sp: fragment + '*',
    md: 'p',
    max: maxResults
  });
}

/**
 * Get antonyms for a word
 *
 * @param {string} word - Word to find antonyms for
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of antonym objects
 */
export async function getAntonyms(word, maxResults = 30) {
  return queryDatamuse({
    rel_ant: word,
    md: 'p',
    max: maxResults
  });
}

/**
 * Perform comprehensive word lookup
 * Combines multiple query strategies
 *
 * @param {string} query - Word or fragment to look up
 * @param {boolean} isFragment - Whether this is a partial word
 * @returns {Promise<Array>} Deduplicated and sorted results
 */
export async function lookupWord(query, isFragment = false) {
  const maxResults = settings.get('api.maxResults');
  const queries = [];

  if (isFragment) {
    // Fragment mode: completions only
    queries.push(getCompletions(query, maxResults));
  } else {
    // Full word mode: synonyms and similar words
    queries.push(getSynonyms(query, maxResults));
    queries.push(getSimilarWords(query, maxResults));
  }

  try {
    // Execute queries in parallel
    const results = await Promise.all(queries);
    const combined = results.flat();

    // Deduplicate by word (case-insensitive)
    const seen = new Set();
    const unique = combined.filter(item => {
      if (!item.word) return false;
      const lower = item.word.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    // Sort by score (descending)
    unique.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Limit results
    return unique.slice(0, maxResults);

  } catch (error) {
    // Propagate ApiError, wrap others
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Lookup failed: ' + error.message,
      ApiErrorType.UNKNOWN,
      null,
      error
    );
  }
}

/**
 * Check if API is available (ping test)
 *
 * @returns {Promise<boolean>} True if API is available
 */
export async function checkApiAvailability() {
  try {
    const controller = new AbortController();
    const response = await makeRequest(
      settings.get('api.endpoint'),
      { sp: 'test', max: 1 },
      controller
    );
    return Array.isArray(response);
  } catch (error) {
    console.error('API availability check failed:', error);
    return false;
  }
}
