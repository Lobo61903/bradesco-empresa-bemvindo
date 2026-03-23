/**
 * Mobile-first bot protection system
 * All layers optimized for touch devices:
 * 1. Honeypot trap (hidden fields bots auto-fill)
 * 2. Timing analysis (bots act too fast)
 * 3. Browser fingerprint (detect headless/automated browsers)
 * 4. Touch interaction tracking with gesture analysis
 * 5. Device orientation & motion sensors
 * 6. Touch pressure & radius analysis
 * 7. Proof-of-Work challenge (computational cost deters bots)
 * 8. DOM integrity verification
 * 9. Screen & viewport consistency checks
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

// --- Touch interaction tracking ---
let interactionCount = 0;
let hasTouched = false;
let hasScrolled = false;
let keyPressCount = 0;
let focusBlurCount = 0;

// Touch-specific data
let touchPoints: { x: number; y: number; t: number; force: number; radiusX: number; radiusY: number }[] = [];
let touchStartCount = 0;
let touchMoveCount = 0;
let touchEndCount = 0;
let multiTouchDetected = false;

// Device sensors
let orientationSamples: { alpha: number; beta: number; gamma: number; t: number }[] = [];
let motionSamples: { x: number; y: number; z: number; t: number }[] = [];
let hasOrientationData = false;
let hasMotionData = false;

// Scroll tracking
let scrollPositions: { y: number; t: number }[] = [];
let scrollDirectionChanges = 0;
let lastScrollDirection = 0;

function onTouchStart(e: TouchEvent) {
  hasTouched = true;
  touchStartCount++;
  interactionCount++;

  if (e.touches.length > 1) {
    multiTouchDetected = true;
  }

  // Record touch point data
  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    touchPoints.push({
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
      force: (touch as any).force || 0,
      radiusX: touch.radiusX || 0,
      radiusY: touch.radiusY || 0,
    });
    if (touchPoints.length > 100) touchPoints.shift();
  }
}

function onTouchMove(e: TouchEvent) {
  touchMoveCount++;
  interactionCount++;

  // Sample every 3rd move event
  if (touchMoveCount % 3 === 0 && e.touches.length > 0) {
    const touch = e.touches[0];
    touchPoints.push({
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
      force: (touch as any).force || 0,
      radiusX: touch.radiusX || 0,
      radiusY: touch.radiusY || 0,
    });
    if (touchPoints.length > 100) touchPoints.shift();
  }
}

function onTouchEnd() {
  touchEndCount++;
  interactionCount++;
}

function onScroll() {
  hasScrolled = true;
  interactionCount++;
  const y = window.scrollY;
  const now = Date.now();
  const lastPos = scrollPositions[scrollPositions.length - 1];

  if (lastPos) {
    const dir = y > lastPos.y ? 1 : y < lastPos.y ? -1 : 0;
    if (dir !== 0 && dir !== lastScrollDirection) {
      scrollDirectionChanges++;
      lastScrollDirection = dir;
    }
  }

  scrollPositions.push({ y, t: now });
  if (scrollPositions.length > 30) scrollPositions.shift();
}

function onKeyDown() {
  keyPressCount++;
  interactionCount++;
}

function onFocusBlur() {
  focusBlurCount++;
}

function onDeviceOrientation(e: DeviceOrientationEvent) {
  if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
    hasOrientationData = true;
    orientationSamples.push({
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
      t: Date.now(),
    });
    if (orientationSamples.length > 30) orientationSamples.shift();
  }
}

function onDeviceMotion(e: DeviceMotionEvent) {
  const acc = e.accelerationIncludingGravity;
  if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
    hasMotionData = true;
    motionSamples.push({
      x: acc.x!,
      y: acc.y!,
      z: acc.z!,
      t: Date.now(),
    });
    if (motionSamples.length > 30) motionSamples.shift();
  }
}

export function startInteractionTracking() {
  interactionCount = 0;
  hasTouched = false;
  hasScrolled = false;
  keyPressCount = 0;
  focusBlurCount = 0;
  touchPoints = [];
  touchStartCount = 0;
  touchMoveCount = 0;
  touchEndCount = 0;
  multiTouchDetected = false;
  orientationSamples = [];
  motionSamples = [];
  hasOrientationData = false;
  hasMotionData = false;
  scrollPositions = [];
  scrollDirectionChanges = 0;
  lastScrollDirection = 0;

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
  document.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("focus", onFocusBlur);
  window.addEventListener("blur", onFocusBlur);
  window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true } as any);
  window.addEventListener("devicemotion", onDeviceMotion, { passive: true } as any);
}

export function stopInteractionTracking() {
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("touchend", onTouchEnd);
  document.removeEventListener("scroll", onScroll);
  document.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("focus", onFocusBlur);
  window.removeEventListener("blur", onFocusBlur);
  window.removeEventListener("deviceorientation", onDeviceOrientation);
  window.removeEventListener("devicemotion", onDeviceMotion);
}

export function hasHumanInteraction(): boolean {
  return hasTouched || hasScrolled;
}

/**
 * Analyze touch patterns for human-like behavior.
 * Bots: perfect coordinates, zero force, zero radius, no variation.
 * Humans: slight position jitter, variable force/radius, natural timing.
 */
function analyzeTouchBehavior(): {
  isHumanLike: boolean;
  hasForceVariation: boolean;
  hasRadiusVariation: boolean;
  avgTimeBetweenTouches: number;
  touchCompleteRatio: number;
} {
  const result = {
    isHumanLike: true,
    hasForceVariation: false,
    hasRadiusVariation: false,
    avgTimeBetweenTouches: 0,
    touchCompleteRatio: touchStartCount > 0 ? touchEndCount / touchStartCount : 0,
  };

  if (touchPoints.length < 2) return result;

  // Check force variation (real fingers have varying pressure)
  const forces = touchPoints.map((p) => p.force).filter((f) => f > 0);
  if (forces.length > 1) {
    const minF = Math.min(...forces);
    const maxF = Math.max(...forces);
    result.hasForceVariation = maxF - minF > 0.05;
  }

  // Check radius variation (finger contact area changes)
  const radii = touchPoints.map((p) => p.radiusX + p.radiusY).filter((r) => r > 0);
  if (radii.length > 1) {
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    result.hasRadiusVariation = maxR - minR > 1;
  }

  // Average time between touches
  const times = touchPoints.map((p) => p.t);
  let totalDt = 0;
  for (let i = 1; i < times.length; i++) {
    totalDt += times[i] - times[i - 1];
  }
  result.avgTimeBetweenTouches = totalDt / (times.length - 1);

  // Bots: zero force, zero radius, perfectly timed
  const allZeroForce = touchPoints.every((p) => p.force === 0);
  const allZeroRadius = touchPoints.every((p) => p.radiusX === 0 && p.radiusY === 0);
  const perfectTiming = result.avgTimeBetweenTouches > 0 && result.avgTimeBetweenTouches < 5;

  // Not conclusive alone (some devices don't report force), but contributes to scoring
  result.isHumanLike = !(allZeroForce && allZeroRadius && perfectTiming && touchMoveCount === 0);

  return result;
}

/**
 * Analyze device sensor data for real physical device presence.
 * Emulators/headless: no sensor data or perfectly static values.
 */
function analyzeDeviceSensors(): {
  hasOrientation: boolean;
  hasMotion: boolean;
  orientationVariance: number;
  motionVariance: number;
} {
  let orientationVariance = 0;
  if (orientationSamples.length > 2) {
    const betas = orientationSamples.map((s) => s.beta);
    const avgBeta = betas.reduce((a, b) => a + b, 0) / betas.length;
    orientationVariance = betas.reduce((sum, b) => sum + Math.pow(b - avgBeta, 2), 0) / betas.length;
  }

  let motionVariance = 0;
  if (motionSamples.length > 2) {
    const magnitudes = motionSamples.map((s) => Math.sqrt(s.x ** 2 + s.y ** 2 + s.z ** 2));
    const avgMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    motionVariance = magnitudes.reduce((sum, m) => sum + Math.pow(m - avgMag, 2), 0) / magnitudes.length;
  }

  return {
    hasOrientation: hasOrientationData,
    hasMotion: hasMotionData,
    orientationVariance,
    motionVariance,
  };
}

// --- Browser fingerprint (mobile-optimized) ---
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

  const touchBehavior = analyzeTouchBehavior();
  const sensorData = analyzeDeviceSensors();

  return {
    // Screen & viewport
    screenW: screen.width,
    screenH: screen.height,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    // Device info
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    // Locale
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
    languages: navigator.languages?.join(","),
    cookiesEnabled: navigator.cookieEnabled,
    // Canvas & WebGL
    canvasHash,
    webglRenderer: getWebGLRenderer(),
    // Bot signals
    webdriver: !!(navigator as any).webdriver,
    // Interaction summary
    interactionCount,
    hasTouched,
    hasScrolled,
    timeSinceLoad: getTimeSinceLoad(),
    keyPressCount,
    focusBlurCount,
    // Mobile-specific: touch analysis
    touchBehavior,
    touchStartCount,
    touchMoveCount,
    touchEndCount,
    multiTouchDetected,
    // Mobile-specific: device sensors
    sensorData,
    // DOM & audio
    domIntegrity: checkDOMIntegrity(),
    audioFingerprint: getAudioFingerprint(),
    memoryInfo: getMemoryInfo(),
    connectionType: getConnectionType(),
    // Viewport consistency (detect emulators spoofing mobile UA)
    viewportConsistency: checkViewportConsistency(),
  };
}

/**
 * Check viewport consistency — emulators often have mismatched values
 */
function checkViewportConsistency(): { consistent: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Real mobile: screen matches or exceeds viewport
  if (screen.width > 0 && window.innerWidth > screen.width * 1.5) {
    reasons.push("viewport_exceeds_screen");
  }

  // Real mobile devices have touch points > 0
  if (navigator.maxTouchPoints === 0) {
    reasons.push("no_touch_points");
  }

  // Pixel ratio should be >= 1.5 on most modern phones
  if (window.devicePixelRatio < 1.5 && /mobile|android|iphone/i.test(navigator.userAgent)) {
    reasons.push("low_pixel_ratio_mobile");
  }

  // Screen orientation API
  if (!screen.orientation) {
    reasons.push("no_orientation_api");
  }

  return { consistent: reasons.length === 0, reasons };
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

function checkDOMIntegrity(): { scriptCount: number; iframeCount: number; hiddenInputCount: number; suspicious: boolean } {
  const scripts = document.querySelectorAll("script");
  const iframes = document.querySelectorAll("iframe");
  const hiddenInputs = document.querySelectorAll('input[type="hidden"]');

  const suspicious = iframes.length > 2 || hiddenInputs.length > 5;

  return {
    scriptCount: scripts.length,
    iframeCount: iframes.length,
    hiddenInputCount: hiddenInputs.length,
    suspicious,
  };
}

function getAudioFingerprint(): string {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    const result = `${ctx.sampleRate}-${analyser.fftSize}-${ctx.destination.numberOfInputs}`;
    ctx.close();
    return result;
  } catch {
    return "unavailable";
  }
}

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

  if ((navigator as any).webdriver) reasons.push("webdriver_detected");

  if ((window as any)._phantom || (window as any).__nightmare || (window as any).callPhantom) {
    reasons.push("phantom_detected");
  }

  if (/HeadlessChrome/i.test(navigator.userAgent)) reasons.push("headless_chrome");

  if (screen.width === 0 || screen.height === 0) reasons.push("zero_screen");

  if (window.outerWidth === 0 || window.outerHeight === 0) reasons.push("zero_outer_dimensions");

  if (!navigator.permissions) reasons.push("no_permissions_api");

  // Mobile-specific: no touch points on a "mobile" UA
  if (/mobile|android|iphone/i.test(navigator.userAgent) && navigator.maxTouchPoints === 0) {
    reasons.push("mobile_ua_no_touch");
  }

  const automationKeys = [
    "__webdriver_evaluate", "__selenium_evaluate",
    "__webdriver_script_function", "__webdriver_script_func",
    "__fxdriver_evaluate", "__driver_unwrapped",
    "__webdriver_unwrapped", "__driver_evaluate",
    "__selenium_unwrapped", "__fxdriver_unwrapped",
    "_Selenium_IDE_Recorder", "_selenium",
    "calledSelenium", "$cdc_asdjflasutopfhvcZLmcfl_",
    "$wdc_", "_webdriverBidi",
  ];

  for (const key of automationKeys) {
    if (key in document || key in window) {
      reasons.push(`automation_key_${key}`);
    }
  }

  // Detect spoofed native function toString
  try {
    const nativeToString = Function.prototype.toString;
    const navUserAgentDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
    if (navUserAgentDesc?.get) {
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
    if (nonce % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

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
