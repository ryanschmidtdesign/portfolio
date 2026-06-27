// netlify/functions/track-resume.js
// Logs resume PDF downloads to Supabase.

const SUPABASE_URL   = "https://ggmkmymtilpkezkpihxt.supabase.co";
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || "";

const SUPABASE_HEADERS = SUPABASE_KEY ? {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
} : null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...CORS_HEADERS }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const sessionToken = String(body.sessionToken || body.session_token || "").slice(0, 128) || null;
    const referrer = String(event.headers["referer"] || event.headers["referrer"] || "").slice(0, 512) || null;
    const pageUrl = String(body.pageUrl || body.page_url || "").slice(0, 512) || null;
    const userAgent = String(event.headers["user-agent"] || "").slice(0, 256) || null;

    if (SUPABASE_HEADERS) {
      await fetch(`${SUPABASE_URL}/rest/v1/resume_downloads`, {
        method: "POST",
        headers: SUPABASE_HEADERS,
        body: JSON.stringify({
          session_token: sessionToken,
          referrer,
          page_url: pageUrl,
          user_agent: userAgent
        })
      });
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  }
};
