import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GeoIP check using ip-api.com (free, no key needed, 45 req/min)
async function isFromBrazil(ip: string): Promise<boolean> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return true;
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.countryCode === "BR";
  } catch {
    // If geo lookup fails, allow through to avoid blocking legit users
    console.log(`[GEO] Lookup failed for IP: ${ip}, allowing through`);
    return true;
  }
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

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

const BOT_UA_PATTERNS = [
  /headlesschrome/i, /phantomjs/i, /slimerjs/i, /puppeteer/i,
  /selenium/i, /webdriver/i, /crawl/i, /spider/i, /scraper/i,
];

function isBotUserAgent(ua: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
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

    // Geo-block: only allow Brazilian IPs
    const fromBrazil = await isFromBrazil(ip);
    if (!fromBrazil) {
      console.log(`[GEO] Blocked non-BR IP: ${ip}`);
      return new Response(
        JSON.stringify({ success: false, error: "geo_blocked" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: "rate_limited" }),
        { status: 429, headers: jsonHeaders }
      );
    }
    const ua = req.headers.get("user-agent") || "";
    if (isBotUserAgent(ua)) {
      console.log(`[BOT] UA blocked - IP: ${ip}, UA: ${ua}`);
      return new Response(
        JSON.stringify({ success: false, error: "bot_detected" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const body = await req.json();
    const { fingerprint, checks, botReasons } = body;

    if (checks) {
      if (!checks.honeypotClean) {
        console.log(`[BOT] Honeypot triggered - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
      if (!checks.notHeadless) {
        console.log(`[BOT] Headless detected - IP: ${ip}, reasons: ${botReasons?.join(", ")}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
      if (!checks.timingValid) {
        console.log(`[BOT] Timing too fast - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
    }

    if (fingerprint) {
      if (fingerprint.webdriver === true) {
        console.log(`[BOT] Webdriver flag - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
      if (fingerprint.screenW === 0 || fingerprint.screenH === 0) {
        console.log(`[BOT] Zero screen - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
      if (typeof fingerprint.timeSinceLoad === "number" && fingerprint.timeSinceLoad < 1000) {
        console.log(`[BOT] Too fast - IP: ${ip}, time: ${fingerprint.timeSinceLoad}ms`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
    }

    const sessionProof = crypto.randomUUID();
    console.log(`[OK] Passed - IP: ${ip}`);

    return new Response(
      JSON.stringify({ success: true, sessionProof }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "internal_error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
