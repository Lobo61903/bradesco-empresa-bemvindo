/**
 * Anti-debugging & anti-DevTools protection (relaxed for mobile compatibility)
 * Blocks: F12, Ctrl+Shift+I/J/C, right-click, console access
 * Does NOT redirect to blank or destroy the page — prevents false positives on mobile
 */

export function initAntiDebug() {
  if (import.meta.env.DEV) return;

  // 1. Block keyboard shortcuts for DevTools
  document.addEventListener("keydown", (e) => {
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
    if (e.ctrlKey && e.key.toUpperCase() === "U") { e.preventDefault(); return; }
  }, true);

  // 2. Block right-click context menu
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); }, true);

  // 3. Override console methods to prevent logging
  const noop = () => {};
  const consoleMethods = ["log", "debug", "info", "warn", "error", "table", "trace", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "assert", "profile", "profileEnd", "count"] as const;
  consoleMethods.forEach((method) => {
    try {
      (console as any)[method] = noop;
    } catch {
      // some environments may restrict this
    }
  });

  // 4. Prevent text selection
  document.addEventListener("selectstart", (e) => { e.preventDefault(); }, true);

  // 5. Prevent drag
  document.addEventListener("dragstart", (e) => { e.preventDefault(); }, true);
}
