#!/usr/bin/env node
/**
 * generate-logo.js
 * -----------------------------------------------------------------------------
 * Portfolio brand mark generator — Variant #12 (final direction).
 *
 * Two overlapping hexagons (pointy-top, rounded corners, thin stroke):
 *   - Front hex  : Primary Brand Blue  #4F8CFF  (slightly heavier stroke)
 *   - Rear hex   : Secondary Blue      #6BA3FF  (15% dimmer)
 *   - Overlap    : subtle soft bloom, no filters (renderer-safe gradients)
 *   - Favicon    : filled silhouette on #081423 rounded tile (legible at 16px)
 *
 * Colors (portfolio tokens):
 *   Primary  #4F8CFF   Secondary #6BA3FF   Highlight #D9ECFF
 *   BG       #081423   Dark      #0F1E33
 *
 * Delivers (per brief):
 *   logo.svg, logo-dark.svg, logo-light.svg, favicon.svg, favicon.ico,
 *   favicon-16/32/48.png, apple-touch-icon.png (180), android 192/512,
 *   social-avatar.png (512), og-image.png (1200x630).
 *
 * Run: node scripts/generate-logo.js
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Pointy-top hexagon path (vertices at top/bottom), optionally with
 * rounded corners via the fill+stroke-linejoin trick.
 */
function hexPath(cx, cy, r, cornerRadius = 0) {
  const pts = [];
  for (const deg of [90, 30, 330, 270, 210, 150]) {
    const rad = (deg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
  }
  const d =
    `M${pts[0][0]} ${pts[0][1]}` +
    pts.slice(1).map((p) => `L${p[0]} ${p[1]}`).join("") +
    "Z";
  // The stroke-linejoin="round" trick rounds corners by strokeWidth/2.
  const stroke = cornerRadius > 0 ? cornerRadius * 2 : 0;
  return { d, stroke };
}

/** Stroked hexagon with round joins/caps — thin line weight, rounded corners. */
function strokedHex(cx, cy, r, width, color, opacity = 1) {
  const { d } = hexPath(cx, cy, r, 0);
  return (
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"` +
    ` stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`
  );
}

/** Filled hexagon with rounded corners (fill + matching stroke + round join). */
function filledHex(cx, cy, r, color, opacity = 1) {
  const { d, stroke } = hexPath(cx, cy, r, Math.max(2, r * 0.14));
  return (
    `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="${stroke}"` +
    ` stroke-linejoin="round" opacity="${opacity}"/>`
  );
}

const BLUE = "#4F8CFF";
const BLUE_SECONDARY = "#6BA3FF";
const HIGHLIGHT = "#D9ECFF";
const BG = "#081423";
const BG_DARK = "#0F1E33";

/* ------------------------------------------------------------------ */
/* Mark compositions                                                   */
/* ------------------------------------------------------------------ */

/** Stroked two-hex mark (logo family). Centered on (cx, cy), symmetric. */
function strokedMark(cx, cy, R, glow = { color: BLUE, alpha: 0.16, r: null }) {
  const off = R * 0.33; // horizontal offset — silhouette stays mirror-symmetric
  const glowR = glow.r ?? R * 1.35;
  const bloom =
    `<radialGradient id="bloom" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${glow.color}" stop-opacity="${glow.alpha}"/>` +
    `<stop offset="100%" stop-color="${glow.color}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#bloom)"/>`;
  return (
    `<defs>${bloom}</defs>` +
    strokedHex(cx - off, cy, R, R * 0.09, BLUE_SECONDARY, 0.85) +
    strokedHex(cx + off, cy, R, R * 0.11, BLUE, 1)
  );
}

/** Filled two-hex mark on a brand tile (favicon family).
 *  rounded=true  → rounded-corner tile (favicon .ico/.png, browser UI)
 *  rounded=false → full-square opaque tile (iOS/Android masks their own corners) */
function tileMark(size, tile = BG, hexR = null, rounded = true) {
  const r = hexR ?? size * 0.3;
  const cx = size / 2;
  const cy = size / 2;
  const off = r * 0.21;
  const glowR = r * 1.5;
  const bloom =
    `<radialGradient id="bloom" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${HIGHLIGHT}" stop-opacity="0.30"/>` +
    `<stop offset="100%" stop-color="${HIGHLIGHT}" stop-opacity="0"/>` +
    `</radialGradient>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Ryan Schmidt — brand mark">` +
    `<defs>${bloom}</defs>` +
    `<rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${tile}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#bloom)"/>` +
    filledHex(cx - off, cy, r, BLUE_SECONDARY, 0.85) +
    filledHex(cx + off, cy, r, BLUE, 1) +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

const defs = (v) =>
  `<!-- Variant #12 — two overlapping hexagons. Brand tokens: ` +
  `#4F8CFF / #6BA3FF / #D9ECFF / #081423 / #0F1E33 -->\n${v}`;

const files = [];

/** logo.svg — canonical (light surfaces) */
{
  const mark = strokedMark(200, 200, 110, { color: BLUE, alpha: 0.16, r: 150 });
  files.push([
    "assets/logo/logo.svg",
    defs(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Ryan Schmidt — brand mark">${mark}</svg>`
    ),
  ]);
}

/** logo-dark.svg — tuned for dark surfaces */
{
  const mark = strokedMark(200, 200, 110, { color: HIGHLIGHT, alpha: 0.22, r: 150 });
  files.push([
    "assets/logo/logo-dark.svg",
    defs(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Ryan Schmidt — brand mark (dark)">${mark}</svg>`
    ),
  ]);
}

/** logo-light.svg — tuned for light surfaces */
{
  const mark = strokedMark(200, 200, 110, { color: "#3D6FFF", alpha: 0.10, r: 150 });
  files.push([
    "assets/logo/logo-light.svg",
    defs(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Ryan Schmidt — brand mark (light)">${mark}</svg>`
    ),
  ]);
}

/** favicon.svg — root, filled silhouette on brand tile */
files.push(["favicon.svg", tileMark(64, BG)]);

/** og-image.png — 1200x630 brand card (mark + wordmark) */
{
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${BG}"/>` +
    `<stop offset="100%" stop-color="${BG_DARK}"/>` +
    `</linearGradient>` +
    `<radialGradient id="halo" cx="28%" cy="50%" r="55%">` +
    `<stop offset="0%" stop-color="${BLUE}" stop-opacity="0.22"/>` +
    `<stop offset="100%" stop-color="${BLUE}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="1200" height="630" fill="url(#bg)"/>` +
    `<rect width="1200" height="630" fill="url(#halo)"/>` +
    strokedMark(270, 315, 150, { color: HIGHLIGHT, alpha: 0.18, r: 230 }) +
    `<text x="510" y="300" font-family="Helvetica Neue, Arial, sans-serif" font-size="76" font-weight="700" fill="#FFFFFF" letter-spacing="-1">Ryan Schmidt</text>` +
    `<text x="512" y="355" font-family="Helvetica Neue, Arial, sans-serif" font-size="34" font-weight="500" fill="#9FB4D9" letter-spacing="0.5">Senior Product Designer &amp; UX Engineer</text>` +
    `<text x="512" y="410" font-family="Helvetica Neue, Arial, sans-serif" font-size="24" font-weight="600" fill="${BLUE_SECONDARY}" letter-spacing="4">ryanschmidt.design</text>` +
    `</svg>`;
  files.push(["assets/logo/og-image.svg", defs(svg)]);
  files.push([
    "assets/logo/og-image.png",
    { svg, width: 1200, height: 630, label: "og-image" },
  ]);
}

/** social-avatar.png — transparent, mark only */
{
  const mark = strokedMark(256, 256, 150, { color: BLUE, alpha: 0.16, r: 220 });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Ryan Schmidt — brand mark">${mark}</svg>`;
  files.push(["assets/logo/social-avatar.svg", defs(svg)]);
  files.push([
    "assets/logo/social-avatar.png",
    { svg, width: 512, height: 512, label: "social-avatar" },
  ]);
}

/* ------------------------------------------------------------------ */
/* Raster outputs                                                      */
/* ------------------------------------------------------------------ */

const raster = [
  { name: "assets/icons/favicon-16.png", size: 16, tile: true },
  { name: "assets/icons/favicon-32.png", size: 32, tile: true },
  { name: "assets/icons/favicon-48.png", size: 48, tile: true },
  { name: "apple-touch-icon.png", size: 180, tile: true, rounded: false },
  { name: "assets/icons/android-favicon-sm.png", size: 192, tile: true, rounded: false },
  { name: "assets/icons/android-favicon-lg.png", size: 512, tile: true, rounded: false },
];

async function main() {
  for (const [path, content] of files) {
    const abs = join(ROOT, path);
    mkdirSync(dirname(abs), { recursive: true });
    if (typeof content === "string") {
      writeFileSync(abs, content);
      console.log(`wrote ${path}`);
    } else {
      await sharp(Buffer.from(content.svg)).resize(content.width, content.height).png().toFile(abs);
      console.log(`wrote ${path} (${content.width}x${content.height})`);
    }
  }

  for (const cfg of raster) {
    const tileSvg = tileMark(cfg.size, BG, cfg.size * 0.3, cfg.rounded !== false);
    const abs = join(ROOT, cfg.name);
    mkdirSync(dirname(abs), { recursive: true });
    await sharp(Buffer.from(tileSvg)).resize(cfg.size, cfg.size).png().toFile(abs);
    console.log(`wrote ${cfg.name} (${cfg.size}x${cfg.size})`);
  }

  // favicon.ico — PNG-compressed entries (16, 32, 48)
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(tileMark(size, BG))).resize(size, size).png().toBuffer();
    pngs.push(buf);
  }
  const ico = Buffer.concat([
    Buffer.from([0, 0, 1, 0, sizes.length, 0]),
    ...pngs.map((png, i) => {
      const size = sizes[i];
      const header = Buffer.alloc(16);
      header[0] = size >= 256 ? 0 : size;
      header[1] = size >= 256 ? 0 : size;
      header[2] = 0; // palette
      header[3] = 0; // reserved
      header.writeUInt16LE(1, 4); // planes
      header.writeUInt16LE(32, 6); // bit count
      header.writeUInt32LE(png.length, 8); // size
      header.writeUInt32LE(6 + sizes.length * 16 + pngs.slice(0, i).reduce((a, b) => a + b.length, 0), 12); // offset
      return header;
    }),
    ...pngs,
  ]);
  writeFileSync(join(ROOT, "favicon.ico"), ico);
  console.log("wrote favicon.ico (16/32/48)");

  console.log("\nAll brand assets generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
