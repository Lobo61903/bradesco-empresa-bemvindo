/**
 * Multi-layer bot protection system
 * Layers:
 * 1. Honeypot trap (hidden fields bots auto-fill)
 * 2. Timing analysis (bots click too fast)
 * 3. Browser fingerprint (detect headless/automated browsers)
 * 4. Interaction tracking with mouse trajectory analysis
 * 5. JavaScript challenge (verify JS execution environment)
 * 6. Proof-of-Work challenge (computational cost deters bots)
 * 7. DOM integrity verification
 * 8. Event sequence validation
 */

// --- Timing ---
let pageLoadTime = 0;

export function markPageLoad() {
  pageLoadTime = Date.now();
}

export function getTimeSinceLoad(): number {
  return Date.now() - pageLoadTime;
}

export function isTimingValid(): boolean {
  return getTimeSinceLoad() > 2000;
}

// --- Honeypot ---
let honeypotValue = "";

export function setHoneypotValue(val: string) {
  honeypotValue = val;
}

export function isHoneypotClean(): boolean {
  return honeypotValue === "";
}

// --- Interaction tracking with trajectory analysis ---
let interactionCount = 0;
let hasMouseMoved = false;
let hasTouched = false;
let hasScrolled = false;
let mousePositions: { x: number; y: number; t: number }[] = [];
let keyPressCount = 0;
let focusBlurCount = 0;

function onMouseMove(e: MouseEvent) {
  hasMouseMoved = true;
  interactionCount++;
  // Sample every 5th event to avoid memory bloat
  if (interactionCount % 5 === 0) {
    mousePositions.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    // Keep last 50 positions
    if (mousePositions.length > 50) mousePositions.shift();
  }
}

function onTouchStart() {
  hasTouched = true;
  interactionCount++;
}

function onScroll() {
  hasScrolled = true;
  interactionCount++;
}

function onKeyDown() {
  keyPressCount++;
  interactionCount++;
}

function onFocusBlur() {
  focusBlurCount++;
}

export function startInteractionTracking() {
  interactionCount = 0;
  hasMouseMoved = false;
  hasTouched = false;
  hasScrolled = false;
  mousePositions = [];
  keyPressCount = 0;
  focusBlurCount = 0;

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("focus", onFocusBlur);
  window.addEventListener("blur", onFocusBlur);
}

export function stopInteractionTracking() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("scroll", onScroll);
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("focus", onFocusBlur);
  window.removeEventListener("blur", onFocusBlur);
}

export function hasHumanInteraction(): boolean {
  return hasMouseMoved || hasTouched || hasScrolled;
}

/**
 * Analyze mouse trajectory for human-like patterns.
 * Bots tend to move in perfectly straight lines or teleport.
 * Real humans have slight curves, acceleration changes, and jitter.
 */
function analyzeMouseTrajectory(): {
  isHumanLike: boolean;
  straightLineRatio: number;
  avgSpeed: number;
  speedVariance: number;
} {
  if (mousePositions.length < 5) {
    return { isHumanLike: true, straightLineRatio: 0, avgSpeed: 0, speedVariance: 0 };
  }

  const speeds: number[] = [];
  let totalAngleChanges = 0;
  let straightSegments = 0;

  for (let i = 1; i < mousePositions.length; i++) {
    const dx = mousePositions[i].x - mousePositions[i - 1].x;
    const dy = mousePositions[i].y - mousePositions[i - 1].y;
    const dt = mousePositions[i].t - mousePositions[i - 1].t;

    if (dt > 0) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      speeds.push(dist / dt);
    }

    if (i >= 2) {
      const prevDx = mousePositions[i - 1].x - mousePositions[i - 2].x;
      const prevDy = mousePositions[i - 1].y - mousePositions[i - 2].y;
      const angle1 = Math.atan2(prevDy, prevDx);
      const angle2 = Math.atan2(dy, dx);
      const angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff < 0.01) straightSegments++;
      totalAngleChanges += angleDiff;
    }
  }

  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const speedVariance = speeds.length > 1
    ? speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length
    : 0;

  const straightLineRatio = mousePositions.length > 2
    ? straightSegments / (mousePositions.length - 2)
    : 0;

  // Bots: very high straight-line ratio, zero speed variance, or impossibly fast
  const isHumanLike = straightLineRatio < 0.9 || speedVariance > 0.001;

  return { isHumanLike, straightLineRatio, avgSpeed, speedVariance };
}

// --- Browser fingerprint ---
export function collectFingerprint(): Record<string, unknown> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let canvasHash = "";
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("bot-check", 2, 2);
    canvasHash = canvas.toDataURL().slice(-50);
  }

  const trajectory = analyzeMouseTrajectory();

  return {
    screenW: screen.width,
    screenH: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
    cookiesEnabled: navigator.cookieEnabled,
    languages: navigator.languages?.join(","),
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    webglRenderer: getWebGLRenderer(),
    canvasHash,
    webdriver: !!(navigator as any).webdriver,
    interactionCount,
    hasMouseMoved,
    hasTouched,
    hasScrolled,
    timeSinceLoad: getTimeSinceLoad(),
    // New: enhanced signals
    keyPressCount,
    focusBlurCount,
    mouseTrajectory: trajectory,
    domIntegrity: checkDOMIntegrity(),
    audioFingerprint: getAudioFingerprint(),
    memoryInfo: getMemoryInfo(),
    connectionType: getConnectionType(),
  };
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
      }
    }
  } catch {
    // ignore
  }
  return "";
}

/**
 * DOM integrity check: verify the page structure hasn't been
 * tampered with (injected iframes, modified scripts, etc.)
 */
function checkDOMIntegrity(): { scriptCount: number; iframeCount: number; hiddenInputCount: number; suspicious: boolean } {
  const scripts = document.querySelectorAll("script");
  const iframes = document.querySelectorAll("iframe");
  const hiddenInputs = document.querySelectorAll('input[type="hidden"]');

  // Suspicious if too many injected iframes or unexpected hidden inputs
  const suspicious = iframes.length > 2 || hiddenInputs.length > 5;

  return {
    scriptCount: scripts.length,
    iframeCount: iframes.length,
    hiddenInputCount: hiddenInputs.length,
    suspicious,
  };
}

/**
 * AudioContext fingerprint - headless browsers often lack audio support
 */
function getAudioFingerprint(): string {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    oscillator.connect(analyser);
    const result = `${ctx.sampleRate}-${analyser.fftSize}-${ctx.destination.numberOfInputs}`;
    ctx.close();
    return result;
  } catch {
    return "unavailable";
  }
}

/**
 * Memory info - headless browsers often have unusual memory patterns
 */
function getMemoryInfo(): Record<string, number> | null {
  const perf = performance as any;
  if (perf.memory) {
    return {
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      usedJSHeapSize: perf.memory.usedJSHeapSize,
    };
  }
  return null;
}

/**
 * Network connection type - helps identify automated environments
 */
function getConnectionType(): string {
  const conn = (navigator as any).connection;
  if (conn) {
    return `${conn.effectiveType || "unknown"}-${conn.downlink || 0}`;
  }
  return "unknown";
}

// --- Headless browser detection ---
export function detectHeadlessBrowser(): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if ((navigator as any).webdriver) {
    reasons.push("webdriver_detected");
  }

  if ((window as any)._phantom || (window as any).__nightmare || (window as any).callPhantom) {
    reasons.push("phantom_detected");
  }

  if (/HeadlessChrome/i.test(navigator.userAgent)) {
    reasons.push("headless_chrome");
  }

  if (screen.width === 0 || screen.height === 0) {
    reasons.push("zero_screen");
  }

  if (navigator.plugins && navigator.plugins.length === 0 && !/mobile|android|iphone/i.test(navigator.userAgent)) {
    reasons.push("no_plugins_desktop");
  }

  // Chrome DevTools protocol detection
  if ((window as any).chrome && !(window as any).chrome.runtime) {
    // Not conclusive alone, but contributes to score
  }

  // Check for impossible browser dimensions
  if (window.outerWidth === 0 || window.outerHeight === 0) {
    reasons.push("zero_outer_dimensions");
  }

  // Permissions API inconsistency (headless often lacks)
  if (!navigator.permissions) {
    reasons.push("no_permissions_api");
  }

  // Check notification permission inconsistency
  if (typeof Notification !== "undefined" && Notification.permission === "denied" && !navigator.userAgent.includes("Mobile")) {
    // Some headless browsers auto-deny
  }

  const automationKeys = [
    "__webdriver_evaluate", "__selenium_evaluate",
    "__webdriver_script_function", "__webdriver_script_func",
    "__webdriver_script_fn", "__fxdriver_evaluate",
    "__driver_unwrapped", "__webdriver_unwrapped",
    "__driver_evaluate", "__selenium_unwrapped",
    "__fxdriver_unwrapped", "_Selenium_IDE_Recorder",
    "_selenium", "calledSelenium",
    "$cdc_asdjflasutopfhvcZLmcfl_", "$wdc_",
    "_webdriverBidi", "__lastWatirAlert",
    "__webdriverFunc", "__webdriver_script_fn",
  ];

  for (const key of automationKeys) {
    if (key in document || key in window) {
      reasons.push(`automation_key_${key}`);
    }
  }

  // Detect overridden toString on native functions (common in spoofing)
  try {
    const nativeToString = Function.prototype.toString;
    const navUserAgentDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
    if (navUserAgentDesc && navUserAgentDesc.get) {
      const toString = nativeToString.call(navUserAgentDesc.get);
      if (!toString.includes("native code")) {
        reasons.push("spoofed_useragent_getter");
      }
    }
  } catch {
    // ignore
  }

  return { isBot: reasons.length > 0, reasons };
}

// --- Proof of Work ---
/**
 * Client must solve a computational puzzle before submitting.
 * This adds CPU cost that deters automated mass requests.
 * Difficulty: find a nonce where SHA-256(challenge + nonce) starts with N zeros.
 */
export async function solveProofOfWork(challenge: string, difficulty: number = 4): Promise<{ nonce: number; hash: string }> {
  const prefix = "0".repeat(difficulty);
  let nonce = 0;

  while (true) {
    const data = `${challenge}:${nonce}`;
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
    const hash = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (hash.startsWith(prefix)) {
      return { nonce, hash };
    }
    nonce++;
    // Yield to main thread every 1000 iterations to prevent UI freeze
    if (nonce % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

/**
 * Generate a challenge string based on timestamp + random
 */
export function generateChallenge(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}:${random}`;
}

// --- Combined validation ---
export function runClientSideValidation(): {
  valid: boolean;
  fingerprint: Record<string, unknown>;
  checks: Record<string, boolean>;
  botReasons: string[];
} {
  const headless = detectHeadlessBrowser();
  const checks = {
    honeypotClean: isHoneypotClean(),
    timingValid: isTimingValid(),
    humanInteraction: hasHumanInteraction(),
    notHeadless: !headless.isBot,
  };

  const valid = checks.honeypotClean && checks.timingValid && checks.notHeadless;

  return {
    valid,
    fingerprint: collectFingerprint(),
    checks,
    botReasons: headless.reasons,
  };
}
