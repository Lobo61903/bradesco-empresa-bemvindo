import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (per IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 attempts per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// Known headless/bot signatures
const BOT_UA_PATTERNS = [
  /headlesschrome/i,
  /phantomjs/i,
  /slimerjs/i,
  /puppeteer/i,
  /selenium/i,
  /webdriver/i,
  /crawl/i,
  /spider/i,
  /scraper/i,
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
    // Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: "rate_limited" }),
        { status: 429, headers: jsonHeaders }
      );
    }

    // Check User-Agent
    const ua = req.headers.get("user-agent") || "";
    if (isBotUserAgent(ua)) {
      return new Response(
        JSON.stringify({ success: false, error: "bot_detected" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const body = await req.json();
    const { token, fingerprint, checks, botReasons } = body;

    // 1. Validate reCAPTCHA token exists
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "token_missing" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 2. Server-side validation of client checks
    if (checks) {
      // Honeypot was filled — bot
      if (!checks.honeypotClean) {
        console.log(`[BOT] Honeypot triggered - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      // Client detected headless browser
      if (!checks.notHeadless) {
        console.log(`[BOT] Headless detected - IP: ${ip}, reasons: ${botReasons?.join(", ")}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      // Timing too fast (< 2s = likely automated)
      if (!checks.timingValid) {
        console.log(`[BOT] Timing too fast - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
    }

    // 3. Server-side fingerprint analysis
    if (fingerprint) {
      // webdriver flag
      if (fingerprint.webdriver === true) {
        console.log(`[BOT] Webdriver flag - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      // Zero screen dimensions
      if (fingerprint.screenW === 0 || fingerprint.screenH === 0) {
        console.log(`[BOT] Zero screen - IP: ${ip}`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      // Suspiciously fast timing on server side too
      if (typeof fingerprint.timeSinceLoad === "number" && fingerprint.timeSinceLoad < 1000) {
        console.log(`[BOT] Server timing check failed - IP: ${ip}, time: ${fingerprint.timeSinceLoad}ms`);
        return new Response(
          JSON.stringify({ success: false, error: "validation_failed" }),
          { status: 403, headers: jsonHeaders }
        );
      }
    }

    // 4. Verify reCAPTCHA with Google
    const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");
    const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}&remoteip=${ip}`,
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      console.log(`[BOT] reCAPTCHA failed - IP: ${ip}, errors: ${verifyData["error-codes"]?.join(", ")}`);
      return new Response(
        JSON.stringify({ success: false, error: "recaptcha_failed" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // 5. Generate a one-time session token (proof of verification)
    const sessionProof = crypto.randomUUID();

    console.log(`[OK] Verification passed - IP: ${ip}`);

    return new Response(
      JSON.stringify({ success: true, sessionProof }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "internal_error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
