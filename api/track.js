// Vercel serverless function: /api/track.js
// Stores privacy-safe portfolio interaction events in Vercel Blob.

import crypto from "node:crypto";
import { put } from "@vercel/blob";

const BOT_UA_RE = /(?:bot\b|\bcrawler|\bspider|headless|lighthouse|pingdom|uptimerobot|vercel-screenshot)/i;
const RATE_LIMITS = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

export function getClientIp(req) {
  const headers = req?.headers || {};
  const fwd = headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) {
    return fwd.split(",")[0].trim();
  }
  return headers["x-real-ip"] || req?.socket?.remoteAddress || "unknown";
}

export function isBotUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== "string") return false;
  return BOT_UA_RE.test(userAgent);
}

export function detectDeviceType(userAgent) {
  const ua = String(userAgent || "");
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export function computeVisitorHash(clientIp, userAgent) {
  return crypto
    .createHash("sha256")
    .update(`${String(clientIp || "unknown")}|${String(userAgent || "")}|rs-portfolio-v1`)
    .digest("hex")
    .slice(0, 12);
}

export function sanitizeSlug(value, fallback = "", maxLen = 40) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  return cleaned || fallback;
}

function cleanText(value, maxLen = 140) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (RATE_LIMITS.get(ip) || []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);

  if (RATE_LIMITS.size >= 500) {
    for (const [key, list] of RATE_LIMITS.entries()) {
      if (list.every((t) => t <= windowStart)) RATE_LIMITS.delete(key);
    }
    if (RATE_LIMITS.size >= 500) {
      const oldest = RATE_LIMITS.keys().next().value;
      if (oldest) RATE_LIMITS.delete(oldest);
    }
  }

  RATE_LIMITS.set(ip, timestamps);
  return true;
}

export function normalizeEventPayload(rawBody, reqHeaders = {}, clientIp = "unknown", now = new Date()) {
  let body = rawBody;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== "object") {
    return { ok: false, reason: "invalid_body" };
  }

  const safeEvent = sanitizeSlug(body.event, "", 40);
  if (!/^[a-z0-9_]{2,40}$/.test(safeEvent)) {
    return { ok: false, reason: "invalid_event" };
  }

  const safeSource = sanitizeSlug(body.source, "ui", 40);
  const userAgent = String(reqHeaders["user-agent"] || reqHeaders["User-Agent"] || "");
  if (isBotUserAgent(userAgent)) {
    return { ok: false, reason: "bot_filtered" };
  }

  const visitorHash = computeVisitorHash(clientIp, userAgent);
  const tsIso = now.toISOString();
  const datePart = tsIso.slice(0, 10);
  const tsMs = now.getTime();

  let page = cleanText(body.page || body.pageUrl || "/", 160);
  if (page.startsWith("http://") || page.startsWith("https://")) {
    try {
      page = new URL(page).pathname || "/";
    } catch {
      page = "/";
    }
  }
  if (!page.startsWith("/")) page = `/${page}`;

  const headerReferrer = reqHeaders.referer || reqHeaders.referrer || "";
  const referrer = cleanText(body.referrer || headerReferrer || "", 256);
  const label = cleanText(body.label || "", 140);
  const sessionId = cleanText(body.sessionId || body.session_id || "", 64) || null;

  const pathname = `events/${datePart}/${tsMs}__${safeEvent}__${safeSource}__${visitorHash}.json`;
  const record = {
    event: safeEvent,
    source: safeSource,
    label,
    page,
    referrer,
    session_id: sessionId,
    visitor_hash: visitorHash,
    device: detectDeviceType(userAgent),
    ts: tsIso
  };

  return { ok: true, pathname, record };
}

export function parseBlobKey(pathname) {
  const raw = String(pathname || "");
  const match = raw.match(/^events\/(\d{4}-\d{2}-\d{2})\/(\d+)__([a-z0-9_]+)__([a-z0-9_]+)__([a-f0-9]+)(?:-[A-Za-z0-9]+)?\.json$/);
  if (!match) return null;
  return {
    date: match[1],
    tsMs: Number(match[2]),
    event: match[3],
    source: match[4],
    visitorHash: match[5]
  };
}

function setCorsHeaders(req, res) {
  const origin = req.headers?.origin || "";
  const isAllowed =
    origin === "https://ryanschmidt.design" ||
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

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Too Many Requests" });
  }

  const parsed = normalizeEventPayload(req.body, req.headers, clientIp);
  if (!parsed.ok) {
    return res.status(200).json({ ok: true, ignored: parsed.reason });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({ ok: true, stored: false });
  }

  try {
    await put(parsed.pathname, JSON.stringify(parsed.record), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: true
    });
    return res.status(200).json({ ok: true, stored: true });
  } catch (err) {
    console.warn("Analytics track error:", err?.message || "unknown");
    return res.status(200).json({ ok: true, stored: false });
  }
}
