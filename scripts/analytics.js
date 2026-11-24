#!/usr/bin/env node
// Local CLI query tool for portfolio interaction analytics stored in Vercel Blob.
// Usage:
//   npm run analytics -- --days 3
//   npm run analytics -- --days 7 --event resume_click --detail
//   npm run analytics -- --days 30 --json

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { parseBlobKey } from "../api/track.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

function loadEnvLocal() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return;
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const opts = {
    days: 7,
    event: "",
    detail: false,
    json: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--days" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) opts.days = n;
    } else if (arg.startsWith("--days=")) {
      const n = Number(arg.slice(7));
      if (Number.isFinite(n) && n > 0) opts.days = n;
    } else if (arg === "--event" && argv[i + 1]) {
      opts.event = String(argv[++i]).trim().toLowerCase();
    } else if (arg.startsWith("--event=")) {
      opts.event = String(arg.slice(8)).trim().toLowerCase();
    } else if (arg === "--detail") {
      opts.detail = true;
    } else if (arg === "--json") {
      opts.json = true;
    }
  }

  return opts;
}

function httpsGetJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
        }
        try {
          resolve(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function listAllEventBlobs(token, cutoffMs) {
  // Enumerate YYYY-MM-DD prefixes covering the requested window (+1 day buffer for UTC boundary)
  const prefixes = [];
  const totalDays = Math.ceil(cutoffMs ? (Date.now() - cutoffMs) / 86400000 : 7) + 1;
  const seenDates = new Set();
  for (let d = 0; d <= totalDays; d++) {
    const dt = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    if (!seenDates.has(dt)) {
      seenDates.add(dt);
      prefixes.push(`events/${dt}/`);
    }
  }

  const allBlobs = [];
  for (const prefix of prefixes) {
    let cursor = "";
    do {
      const params = new URLSearchParams({ prefix, limit: "1000" });
      if (cursor) params.set("cursor", cursor);
      const data = await httpsGetJson(`https://vercel.com/api/blob?${params.toString()}`, {
        authorization: `Bearer ${token}`,
        "x-api-version": "12"
      });
      if (Array.isArray(data?.blobs)) {
        allBlobs.push(...data.blobs);
      }
      cursor = data?.hasMore && data?.cursor ? data.cursor : "";
    } while (cursor);
  }
  return allBlobs;
}

async function fetchDetails(items, token, concurrency = 8) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = items[idx++];
      try {
        const body = await httpsGetJson(current.blob.url, {
          authorization: `Bearer ${token}`
        });
        results.push({ ...current, detail: body });
      } catch {
        results.push({ ...current, detail: null });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

function incrementCount(map, key) {
  const k = key || "(none)";
  map.set(k, (map.get(k) || 0) + 1);
}

function mapToSortedEntries(map, limit = 15) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

async function main() {
  loadEnvLocal();
  const opts = parseArgs(process.argv.slice(2));
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.error("Missing BLOB_READ_WRITE_TOKEN in environment or .env.local");
    process.exit(1);
  }

  const nowMs = Date.now();
  const cutoffMs = nowMs - opts.days * 86400 * 1000;
  const rawBlobs = await listAllEventBlobs(token, cutoffMs);

  const matched = [];
  for (const blob of rawBlobs) {
    const parsed = parseBlobKey(blob.pathname);
    if (!parsed) continue;
    if (parsed.tsMs < cutoffMs) continue;
    if (opts.event && parsed.event !== opts.event) continue;
    matched.push({ blob, parsed });
  }

  matched.sort((a, b) => b.parsed.tsMs - a.parsed.tsMs);

  const uniqueVisitors = new Set();
  const byEvent = new Map();
  const byDay = new Map();

  for (const { parsed } of matched) {
    uniqueVisitors.add(parsed.visitorHash);

    if (!byEvent.has(parsed.event)) {
      byEvent.set(parsed.event, {
        total: 0,
        visitors: new Set(),
        sources: new Map()
      });
    }
    const evStats = byEvent.get(parsed.event);
    evStats.total += 1;
    evStats.visitors.add(parsed.visitorHash);
    incrementCount(evStats.sources, parsed.source);

    if (!byDay.has(parsed.date)) {
      byDay.set(parsed.date, { total: 0, visitors: new Set() });
    }
    const dayStats = byDay.get(parsed.date);
    dayStats.total += 1;
    dayStats.visitors.add(parsed.visitorHash);
  }

  let detailed = null;
  if (opts.detail && matched.length > 0) {
    const rows = await fetchDetails(matched, token);
    const pages = new Map();
    const referrers = new Map();
    const labels = new Map();
    const devices = new Map();

    for (const row of rows) {
      if (!row.detail) continue;
      incrementCount(pages, row.detail.page || "/");
      incrementCount(referrers, row.detail.referrer || "(direct)");
      if (row.detail.label) incrementCount(labels, row.detail.label);
      incrementCount(devices, row.detail.device || "unknown");
    }

    detailed = {
      pages: mapToSortedEntries(pages),
      referrers: mapToSortedEntries(referrers),
      labels: mapToSortedEntries(labels),
      devices: mapToSortedEntries(devices)
    };
  }

  const summary = {
    window_days: opts.days,
    since_iso: new Date(cutoffMs).toISOString(),
    event_filter: opts.event || null,
    total_events: matched.length,
    unique_visitors: uniqueVisitors.size,
    events: [...byEvent.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([event, stats]) => ({
        event,
        total: stats.total,
        unique_visitors: stats.visitors.size,
        sources: mapToSortedEntries(stats.sources)
      })),
    by_day: [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        unique_visitors: stats.visitors.size
      })),
    ...(detailed ? { detail: detailed } : {})
  };

  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const filterLabel = opts.event ? ` | event=${opts.event}` : "";
  console.log(`\nPortfolio Analytics (last ${opts.days} day${opts.days === 1 ? "" : "s"}${filterLabel})`);
  console.log(`Since: ${summary.since_iso}`);
  console.log(`Total events: ${summary.total_events} | Unique visitors: ${summary.unique_visitors}\n`);

  if (summary.events.length === 0) {
    console.log("No tracked events found in this window.");
    return;
  }

  console.log("By Event:");
  for (const ev of summary.events) {
    const srcText = ev.sources.map((s) => `${s.key}: ${s.count}`).join(", ");
    console.log(`  - ${ev.event}: ${ev.total} total (${ev.unique_visitors} unique) [${srcText}]`);
  }

  console.log("\nBy Day:");
  for (const day of summary.by_day) {
    console.log(`  - ${day.date}: ${day.total} total (${day.unique_visitors} unique)`);
  }

  if (summary.detail) {
    console.log("\nTop Pages:");
    for (const item of summary.detail.pages) console.log(`  - ${item.key}: ${item.count}`);

    console.log("\nTop Referrers:");
    for (const item of summary.detail.referrers) console.log(`  - ${item.key}: ${item.count}`);

    if (summary.detail.labels.length) {
      console.log("\nTop Labels:");
      for (const item of summary.detail.labels) console.log(`  - ${item.key}: ${item.count}`);
    }

    console.log("\nDevices:");
    for (const item of summary.detail.devices) console.log(`  - ${item.key}: ${item.count}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("Analytics query error:", err?.message || err);
  process.exit(1);
});
