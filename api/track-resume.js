// Vercel serverless function: /api/track-resume.js
// Logs resume PDF downloads to Supabase.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ggmkmymtilpkezkpihxt.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPABASE_HEADERS = SUPABASE_KEY ? {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
} : null;

const RATE_LIMITS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (RATE_LIMITS.get(ip) || []).filter(t => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  RATE_LIMITS.set(ip, timestamps);
  return true;
}

function setCorsHeaders(req, res) {
  const origin = req.headers?.origin || "";
  const isAllowed = origin === "https://ryanschmidt.design" ||
    origin === "https://www.ryanschmidt.design" ||
    (origin.startsWith("https://ryanschmidt-portfolio") && origin.endsWith(".vercel.app")) ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");
  
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "https://ryanschmidt.design");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const clientIp = req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Too Many Requests" });
  }

  try {
    const sessionToken = String(req.body?.sessionToken || req.body?.session_token || "").slice(0, 128) || null;
    const referrer = String(req.headers?.["referer"] || req.headers?.["referrer"] || "").slice(0, 512) || null;
    const pageUrl = String(req.body?.pageUrl || req.body?.page_url || "").slice(0, 512) || null;
    const userAgent = String(req.headers?.["user-agent"] || "").slice(0, 256) || null;

    if (SUPABASE_HEADERS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/resume_downloads`, {
          method: "POST",
          signal: controller.signal,
          headers: SUPABASE_HEADERS,
          body: JSON.stringify({
            session_token: sessionToken,
            referrer,
            page_url: pageUrl,
            user_agent: userAgent
          })
        });
        if (!resp.ok) {
          console.warn(`Supabase tracking error: ${resp.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
}
