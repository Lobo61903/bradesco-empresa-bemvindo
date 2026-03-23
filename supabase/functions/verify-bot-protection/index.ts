import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- GeoIP ---
async function isFromBrazil(ip: string): Promise<boolean> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return true;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.countryCode === "BR";
  } catch (_e) {
    console.log(`[GEO] Lookup failed for IP: ${ip}, allowing through`);
    return true;
  }
}

// --- Rate limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

// --- IP blacklist ---
const blacklistMap = new Map<string, { until: number; strikes: number }>();
const BLACKLIST_DURATION = 10 * 60_000;
const STRIKE_THRESHOLD = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function isBlacklisted(ip: string): boolean {
  const entry = blacklistMap.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    blacklistMap.delete(ip);
    return false;
  }
  return true;
}

function addStrike(ip: string) {
  const entry = blacklistMap.get(ip) || { until: 0, strikes: 0 };
  entry.strikes++;
  if (entry.strikes >= STRIKE_THRESHOLD) {
    entry.until = Date.now() + BLACKLIST_DURATION;
    console.log(`[BAN] IP blacklisted for 10min: ${ip}`);
  }
  blacklistMap.set(ip, entry);
}

// --- Bot UA detection ---
const BOT_UA_PATTERNS = [
  /headlesschrome/i, /phantomjs/i, /slimerjs/i, /puppeteer/i,
  /selenium/i, /webdriver/i, /crawl/i, /spider/i, /scraper/i,
  /bot(?!tom)/i, /curl/i, /wget/i, /httpie/i, /python-requests/i,
  /node-fetch/i, /axios/i, /go-http/i, /java\//i,
];

function isBotUserAgent(ua: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

// --- PoW verification ---
async function verifyProofOfWork(
  challenge: string,
  nonce: number,
  hash: string,
  difficulty: number = 4
): Promise<boolean> {
  const prefix = "0".repeat(difficulty);
  if (!hash.startsWith(prefix)) return false;

  const data = `${challenge}:${nonce}`;
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  const computed = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed !== hash) return false;

  const parts = challenge.split(":");
  const ts = parseInt(parts[0], 10);
  if (isNaN(ts) || Date.now() - ts > 120_000) return false;

  return true;
}

// --- Mobile-focused bot score ---
function calculateBotScore(fingerprint: Record<string, any>, checks: Record<string, boolean>): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // === Hard signals ===
  if (!checks?.honeypotClean) { score += 100; reasons.push("honeypot_filled"); }
  if (!checks?.notHeadless) { score += 80; reasons.push("headless_browser"); }
  if (fingerprint?.webdriver === true) { score += 90; reasons.push("webdriver"); }

  // === Timing ===
  if (!checks?.timingValid) { score += 50; reasons.push("timing_fast"); }
  if (typeof fingerprint?.timeSinceLoad === "number" && fingerprint.timeSinceLoad < 1000) {
    score += 40; reasons.push("server_timing_fast");
  }

  // === Screen ===
  if (fingerprint?.screenW === 0 || fingerprint?.screenH === 0) {
    score += 70; reasons.push("zero_screen");
  }

  // === Touch interaction (mobile-critical) ===
  if (!checks?.humanInteraction && fingerprint?.interactionCount === 0) {
    score += 30; reasons.push("no_interaction");
  }

  // No touch at all on a supposed mobile device
  if (!fingerprint?.hasTouched && fingerprint?.touchStartCount === 0) {
    score += 15; reasons.push("no_touch_events");
  }

  // Touch behavior analysis
  const touchBehavior = fingerprint?.touchBehavior;
  if (touchBehavior) {
    // Bot: touch start without any move (programmatic click)
    if (touchBehavior.touchCompleteRatio > 0 && fingerprint?.touchMoveCount === 0 && fingerprint?.touchStartCount > 0) {
      score += 20; reasons.push("touch_no_move");
    }
    // Impossibly fast touches
    if (touchBehavior.avgTimeBetweenTouches > 0 && touchBehavior.avgTimeBetweenTouches < 10) {
      score += 30; reasons.push("touch_too_fast");
    }
  }

  // === Device sensors ===
  const sensorData = fingerprint?.sensorData;
  // Note: not all devices grant sensor permission, so this is soft
  if (sensorData) {
    // If orientation API exists but no data came, mildly suspicious
    if (!sensorData.hasOrientation && !sensorData.hasMotion) {
      score += 5; reasons.push("no_sensor_data");
    }
  }

  // === Viewport consistency ===
  const viewportCheck = fingerprint?.viewportConsistency;
  if (viewportCheck && !viewportCheck.consistent) {
    const vpReasons = viewportCheck.reasons as string[];
    if (vpReasons?.includes("no_touch_points")) {
      score += 35; reasons.push("viewport_no_touch_points");
    }
    if (vpReasons?.includes("viewport_exceeds_screen")) {
      score += 25; reasons.push("viewport_mismatch");
    }
    if (vpReasons?.includes("low_pixel_ratio_mobile")) {
      score += 15; reasons.push("low_dpr_mobile");
    }
  }

  // === maxTouchPoints ===
  if (typeof fingerprint?.maxTouchPoints === "number" && fingerprint.maxTouchPoints === 0) {
    score += 30; reasons.push("zero_touch_points");
  }

  // === DOM integrity ===
  if (fingerprint?.domIntegrity?.suspicious) {
    score += 25; reasons.push("dom_tampered");
  }

  // === Audio fingerprint absent ===
  if (fingerprint?.audioFingerprint === "unavailable") {
    score += 15; reasons.push("no_audio");
  }

  // === No language info ===
  if (!fingerprint?.languages) {
    score += 20; reasons.push("no_languages");
  }

  // === Canvas hash empty ===
  if (!fingerprint?.canvasHash) {
    score += 25; reasons.push("no_canvas");
  }

  return { score, reasons };
}

// --- HMAC session proof ---
async function signSessionProof(proof: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-signing-key";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(proof));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";

    // 1. Blacklist
    if (isBlacklisted(ip)) {
      return new Response(JSON.stringify({ success: false, error: "blocked" }), { status: 403, headers: jsonHeaders });
    }

    // 2. Geo-block
    const fromBrazil = await isFromBrazil(ip);
    if (!fromBrazil) {
      console.log(`[GEO] Blocked non-BR IP: ${ip}`);
      return new Response(JSON.stringify({ success: false, error: "geo_blocked" }), { status: 403, headers: jsonHeaders });
    }

    // 3. Rate limit
    if (isRateLimited(ip)) {
      addStrike(ip);
      return new Response(JSON.stringify({ success: false, error: "rate_limited" }), { status: 429, headers: jsonHeaders });
    }

    // 4. UA check
    const ua = req.headers.get("user-agent") || "";
    if (isBotUserAgent(ua)) {
      addStrike(ip);
      console.log(`[BOT] UA blocked - IP: ${ip}, UA: ${ua}`);
      return new Response(JSON.stringify({ success: false, error: "bot_detected" }), { status: 403, headers: jsonHeaders });
    }

    const body = await req.json();
    const { fingerprint, checks, botReasons, pow } = body;

    // 5. Verify PoW
    if (!pow?.challenge || typeof pow.nonce !== "number" || !pow.hash) {
      addStrike(ip);
      return new Response(JSON.stringify({ success: false, error: "pow_missing" }), { status: 403, headers: jsonHeaders });
    }

    const powValid = await verifyProofOfWork(pow.challenge, pow.nonce, pow.hash);
    if (!powValid) {
      addStrike(ip);
      return new Response(JSON.stringify({ success: false, error: "pow_invalid" }), { status: 403, headers: jsonHeaders });
    }

    // 6. Mobile-focused bot scoring
    const { score, reasons } = calculateBotScore(fingerprint, checks);

    if (score >= 50) {
      addStrike(ip);
      console.log(`[BOT] Score ${score} - IP: ${ip}, reasons: ${reasons.join(", ")}`);
      return new Response(JSON.stringify({ success: false, error: "validation_failed" }), { status: 403, headers: jsonHeaders });
    }

    if (score >= 30) {
      console.log(`[WARN] Suspicious score ${score} - IP: ${ip}, reasons: ${reasons.join(", ")}`);
    }

    // 7. HMAC-signed session proof
    const sessionProof = crypto.randomUUID();
    const signature = await signSessionProof(sessionProof);

    console.log(`[OK] Passed (score: ${score}) - IP: ${ip}`);

    return new Response(JSON.stringify({ success: true, sessionProof, signature }), { headers: jsonHeaders });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: "internal_error" }), { status: 500, headers: jsonHeaders });
  }
});
