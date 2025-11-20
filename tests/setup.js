/**
 * Test setup file
 * Configures global test environment
 */

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;

// Mock requestIdleCallback
global.requestIdleCallback = (callback, options) => {
  return setTimeout(callback, 0);
};

global.cancelIdleCallback = (id) => {
  clearTimeout(id);
};
