/**
 * PharmaTech OS — Theme State Manager
 * Handles Light Mode (النهار), Dark Mode (الليل), and System Preference (تلقائي)
 */

const STORAGE_KEY = 'pharmatech-theme-mode';
const listeners = new Set();

let currentMode = 'auto'; // 'light' | 'dark' | 'auto'

/**
 * Resolves the effective theme based on mode and system preference
 */
function resolveTheme(mode) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Applies the theme attribute to the document element
 */
function applyTheme(mode) {
  const effectiveTheme = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.setAttribute('data-theme-mode', mode);

  // Notify listeners
  listeners.forEach(fn => fn(mode, effectiveTheme));
}

/**
 * Initializes theme state on application load
 */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && ['light', 'dark', 'auto'].includes(saved)) {
    currentMode = saved;
  } else {
    currentMode = 'auto';
  }

  applyTheme(currentMode);

  // Listen for system preference changes when in 'auto' mode
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (currentMode === 'auto') {
        applyTheme('auto');
      }
    });
  }
}

/**
 * Changes active theme mode
 */
export function setTheme(mode) {
  if (!['light', 'dark', 'auto'].includes(mode)) return;
  currentMode = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

/**
 * Gets current theme mode
 */
export function getTheme() {
  return currentMode;
}

/**
 * Subscribes to theme changes
 */
export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
