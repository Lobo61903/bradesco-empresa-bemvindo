/**
 * Multi-layer bot protection system
 * Layers:
 * 1. Honeypot trap (hidden fields bots auto-fill)
 * 2. Timing analysis (bots click too fast)
 * 3. Browser fingerprint (detect headless/automated browsers)
 * 4. Interaction tracking (real users move mouse, touch, scroll)
 * 5. JavaScript challenge (verify JS execution environment)
 */

// --- Timing ---
let pageLoadTime = 0;

export function markPageLoad() {
  pageLoadTime = Date.now();
}

export function getTimeSinceLoad(): number {
  return Date.now() - pageLoadTime;
}

// Bots typically click in < 1.5s. Real users take at least 2-3s.
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

// --- Interaction tracking ---
let interactionCount = 0;
let hasMouseMoved = false;
let hasTouched = false;
let hasScrolled = false;

function onMouseMove() {
  hasMouseMoved = true;
  interactionCount++;
}

function onTouchStart() {
  hasTouched = true;
  interactionCount++;
}

function onScroll() {
  hasScrolled = true;
  interactionCount++;
}

export function startInteractionTracking() {
  interactionCount = 0;
  hasMouseMoved = false;
  hasTouched = false;
  hasScrolled = false;
  
  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("scroll", onScroll, { passive: true });
}

export function stopInteractionTracking() {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("touchstart", onTouchStart);
  document.removeEventListener("scroll", onScroll);
}

export function hasHumanInteraction(): boolean {
  return hasMouseMoved || hasTouched || hasScrolled;
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

  return {
    // Screen properties (headless often has 0x0 or unusual values)
    screenW: screen.width,
    screenH: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    
    // Timezone
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
    
    // Browser capabilities
    cookiesEnabled: navigator.cookieEnabled,
    languages: navigator.languages?.join(","),
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    
    // WebGL renderer (headless browsers have specific signatures)
    webglRenderer: getWebGLRenderer(),
    
    // Canvas fingerprint
    canvasHash,
    
    // Detect automation flags
    webdriver: !!(navigator as any).webdriver,
    
    // Interaction data
    interactionCount,
    hasMouseMoved,
    hasTouched,
    hasScrolled,
    
    // Timing
    timeSinceLoad: getTimeSinceLoad(),
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

// --- Headless browser detection ---
export function detectHeadlessBrowser(): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check navigator.webdriver (set by Selenium, Puppeteer, Playwright)
  if ((navigator as any).webdriver) {
    reasons.push("webdriver_detected");
  }

  // Check for PhantomJS
  if ((window as any)._phantom || (window as any).__nightmare || (window as any).callPhantom) {
    reasons.push("phantom_detected");
  }

  // Check for headless Chrome user agent
  if (/HeadlessChrome/i.test(navigator.userAgent)) {
    reasons.push("headless_chrome");
  }

  // Screen size 0x0 is common in headless
  if (screen.width === 0 || screen.height === 0) {
    reasons.push("zero_screen");
  }

  // No plugins in headless browsers
  if (navigator.plugins && navigator.plugins.length === 0 && !/mobile|android|iphone/i.test(navigator.userAgent)) {
    reasons.push("no_plugins_desktop");
  }

  // Check for automation-related properties
  const automationKeys = [
    "__webdriver_evaluate", "__selenium_evaluate",
    "__webdriver_script_function", "__webdriver_script_func",
    "__webdriver_script_fn", "__fxdriver_evaluate",
    "__driver_unwrapped", "__webdriver_unwrapped",
    "__driver_evaluate", "__selenium_unwrapped",
    "__fxdriver_unwrapped", "_Selenium_IDE_Recorder",
    "_selenium", "calledSelenium",
    "$cdc_asdjflasutopfhvcZLmcfl_", "$wdc_",
  ];

  for (const key of automationKeys) {
    if (key in document || key in window) {
      reasons.push(`automation_key_${key}`);
    }
  }

  return {
    isBot: reasons.length > 0,
    reasons,
  };
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

  // Must pass honeypot + timing + not headless. Interaction is a soft signal.
  const valid = checks.honeypotClean && checks.timingValid && checks.notHeadless;

  return {
    valid,
    fingerprint: collectFingerprint(),
    checks,
    botReasons: headless.reasons,
  };
}
