/**
 * Anti-debugging & anti-DevTools protection
 * Prevents: F12, Ctrl+Shift+I/J/C, right-click, console access, debugger detection
 */

export function initAntiDebug() {
  if (import.meta.env.DEV) return; // Skip in development

  // 1. Block keyboard shortcuts for DevTools
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") { e.preventDefault(); return; }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
    if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key.toUpperCase() === "U") { e.preventDefault(); return; }
  }, true);

  // 2. Block right-click context menu
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); }, true);

  // 3. Override console methods to prevent logging

  // 5. Override console methods to prevent logging
  const noop = () => {};
  const consoleMethods = ["log", "debug", "info", "warn", "error", "table", "trace", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "assert", "profile", "profileEnd", "count"] as const;
  consoleMethods.forEach((method) => {
    try {
      (console as any)[method] = noop;
    } catch {
      // some environments may restrict this
    }
  });

  // 6. Prevent text selection (makes it harder to copy code from elements panel)
  document.addEventListener("selectstart", (e) => { e.preventDefault(); }, true);

  // 7. Prevent drag (prevents dragging elements to inspect)
  document.addEventListener("dragstart", (e) => { e.preventDefault(); }, true);
}
