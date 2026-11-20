/**
 * Ryan Schmidt Portfolio: "Desk Scene" 2.5D Vanilla WebGL Runtime
 * Zero-dependency WebGL renderer (no Three.js) with two-stage progressive loading,
 * tight-cropped 2x Retina sprites, mobile 2D fast path, and idle GPU gating.
 *
 * Architecture:
 * - Master Studio Coordinate Space (1480 x 1180):
 *   - Monitor screen, coffee mug rim, and cat overlays synced via CSS custom properties.
 * - Static background pass (#desk-bg-canvas, z-index: 1):
 *   Renders `assets/desk-scene/scene-bg.webp?v=156` (2220x1770 1.5x master).
 *   On mobile (<1024px), composites Stage 1 character layers directly in 2D (no WebGL/Stage 2).
 * - Live HTML monitor layer (#desk-monitor-screen, z-index: 2):
 *   Dynamically synced via `--mon-left`, `--mon-top`, `--mon-width`, `--mon-height`.
 * - Dynamic WebGL foreground pass (#desk-char-canvas, z-index: 3, desktop >=1024px):
 *   1. `neckBed` (`ryan-neck-bed.webp?v=156`, 320x168, 38% cervical hinge, premultiplied alpha)
 *   2. `head` (Stage 1 `ryan-head.webp?v=156` -> Stage 2 5-pose optical-flow morph + soft Sandstone rolloff)
 *   3. `chinShadow` (elliptical contact AO with right-turn jaw-lift scaling & opacity rolloff)
 *   4. `body` (`ryan-body.webp?v=156`, 766x848, locked stationary collar/arm/chair, premultiplied alpha)
 */

const ASSET_V = '156';
const SCENE_W = 1480;
const SCENE_H = 1180;

// Exact inner monitor screen rectangle in 1480x1180 master space
const MON_RECT = { x: 517, y: 507, w: 445, h: 177 };

// Exact coffee mug opening center in 1480x1180 master space
const MUG_POS = { x: 1003.5, y: 708 };

// Exact napping tuxedo cat position on left desk surface
const CAT_POS = { x: 375, y: 742 };

// Tight-cropped master bounds (1480x1180 space, matching 2x cropped WebPs)
const NECK_BOUNDS = { x0: 696, y0: 562, x1: 856, y1: 646 };
const BODY_BOUNDS = { x0: 585, y0: 594, x1: 968, y1: 1018 };
const HEAD_BOUNDS = { x0: 656, y0: 428, x1: 884, y1: 660 };
const CHIN_BOUNDS = { x0: 704, y0: 604, x1: 742, y1: 626 };

// Cervical & cranial pivots in master space
const NECK_BASE_PIVOT = { x: 754, y: 626 };
const HEAD_ATLAS_PIVOT = { x: 754, y: 584 };
const HEAD_CENTER = { x: 754, y: 533 };
const BODY_PIVOT = { x: 760, y: 840 };
const CHIN_PIVOT = { x: 722, y: 615 };

const FOV_DEG = 24;
const CAM_Z = 4.2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function isPow2(v) {
  return (v & (v - 1)) === 0 && v > 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(img), () => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFlowAtlasBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed loading flow atlas: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function makeChinShadowCanvas() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.translate(48, 32);
  ctx.scale(1.45, 0.72);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  g.addColorStop(0.0, 'rgba(68, 42, 24, 0.36)');
  g.addColorStop(0.5, 'rgba(74, 46, 28, 0.14)');
  g.addColorStop(1.0, 'rgba(74, 46, 28, 0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return c;
}

// =========================================================================
// Minimal 4x4 Column-Major Matrix Math (Matches THREE.PerspectiveCamera & Euler 'XYZ')
// =========================================================================
function mat4Mul(a, b, out = new Float32Array(16)) {
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4];
    const b1 = b[col * 4 + 1];
    const b2 = b[col * 4 + 2];
    const b3 = b[col * 4 + 3];
    out[col * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
    out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
    out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

function mat4PerspectiveView(fovDeg, aspect, near, far, camZ) {
  const f = 1.0 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1.0 / (near - far);
  const proj = new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
  const view = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, -camZ, 1
  ]);
  return mat4Mul(proj, view);
}

// T(tx, ty, tz) * Rx(rx) * Ry(ry) * Rz(rz) * S(sx, sy, 1) — exact Three.js Euler('XYZ')
function mat4TRS(tx, ty, tz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1) {
  const cx = Math.cos(rx), sxr = Math.sin(rx);
  const cy = Math.cos(ry), syr = Math.sin(ry);
  const cz = Math.cos(rz), szr = Math.sin(rz);

  const ae = cy * cz;
  const af = -cy * szr;
  const ag = syr;

  const be = sxr * syr * cz + cx * szr;
  const bf = -sxr * syr * szr + cx * cz;
  const bg = -sxr * cy;

  const ce = -cx * syr * cz + sxr * szr;
  const cf = cx * syr * szr + sxr * cz;
  const cg = cx * cy;

  return new Float32Array([
    ae * sx, be * sx, ce * sx, 0,
    af * sy, bf * sy, cf * sy, 0,
    ag,      bg,      cg,      0,
    tx,      ty,      tz,      1
  ]);
}

// =========================================================================
// Shaders (Basic Premultiplied Plane + Bidirectional Optical-Flow Head)
// =========================================================================
const BASIC_VS = `
  attribute vec3 aPos;
  attribute vec2 aUv;
  attribute float aBreathMask;
  uniform mat4 uMvp;
  uniform float uBreathLift;
  varying vec2 vUv;
  void main() {
    vUv = aUv;
    vec3 p = aPos;
    p.y += aBreathMask * uBreathLift;
    gl_Position = uMvp * vec4(p, 1.0);
  }
`;

const BASIC_FS = `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uRimStrength;
  varying vec2 vUv;
  void main() {
    vec4 col = texture2D(uMap, vUv) * uOpacity;
    if (col.a < 0.002) discard;
    if (uRimStrength > 0.001) {
      vec3 straight = col.rgb / col.a;
      // Subtle right-side warm desk-lamp rim light + soft monitor bounce on upper shoulders
      float rightRim = smoothstep(0.56, 0.96, vUv.x) * smoothstep(0.18, 0.78, vUv.y);
      float monBounce = smoothstep(0.32, 0.72, vUv.x) * smoothstep(0.42, 0.92, vUv.y) * 0.35;
      vec3 lampTint = vec3(1.0, 0.88, 0.72) * (rightRim * uRimStrength);
      vec3 bounceTint = vec3(0.96, 0.92, 0.86) * (monBounce * uRimStrength);
      straight = clamp(straight + (lampTint + bounceTint) * (1.0 - straight), 0.0, 1.0);
      col.rgb = straight * col.a;
    }
    gl_FragColor = col;
  }
`;

const HEAD_VS = `
  attribute vec3 aPos;
  attribute vec2 aUv;
  attribute float aCrownMask;
  uniform mat4 uMvp;
  uniform float uCrownLag;
  varying vec2 vUv;
  varying vec2 vFlowLocal;
  void main() {
    vUv = aUv;
    vFlowLocal = aUv;
    vec3 p = aPos;
    p.x += aCrownMask * uCrownLag * 0.0025;
    gl_Position = uMvp * vec4(p, 1.0);
  }
`;

const HEAD_FS = `
  precision highp float;
  uniform sampler2D uMapC0;
  uniform sampler2D uMapC1;
  uniform sampler2D uMapRest;
  uniform sampler2D uMapC2;
  uniform sampler2D uMapC3;
  uniform sampler2D uFlowAtlas;
  uniform float uAngle;
  uniform float uHoverReady;
  varying vec2 vUv;
  varying vec2 vFlowLocal;

  vec4 sampleMorph(sampler2D texA, sampler2D texB, vec2 qOrigin, float t) {
    float wt = clamp(t, 0.0, 1.0);
    vec2 qCoord = vec2(vFlowLocal.x, 1.0 - vFlowLocal.y);
    vec2 atlasUv = qOrigin + clamp(qCoord, 0.004, 0.996) * 0.5;
    vec4 fl = texture2D(uFlowAtlas, atlasUv);
    vec2 fAB = (fl.rg - 128.0 / 255.0) * (255.0 / 127.0) * 0.16;
    vec2 fBA = (fl.ba - 128.0 / 255.0) * (255.0 / 127.0) * 0.16;

    vec4 a = texture2D(texA, clamp(vUv + fBA * wt, 0.0, 1.0));
    vec4 b = texture2D(texB, clamp(vUv + fAB * (1.0 - wt), 0.0, 1.0));
    float wA = a.a * (1.0 - wt);
    float wB = b.a * wt;
    float outA = mix(a.a, b.a, wt);
    vec3 straightRgb = (a.rgb * wA + b.rgb * wB) / max(wA + wB, 1e-4);
    return vec4(straightRgb, outA);
  }

  void main() {
    vec4 outCol;
    if (uHoverReady < 0.5) {
      outCol = texture2D(uMapRest, vUv);
    } else if (uAngle <= -0.48) {
      outCol = sampleMorph(uMapC0, uMapC1, vec2(0.0, 0.0), (uAngle + 1.0) / 0.52);
    } else if (uAngle <= 0.0) {
      outCol = sampleMorph(uMapC1, uMapRest, vec2(0.5, 0.0), (uAngle + 0.48) / 0.48);
    } else if (uAngle <= 0.48) {
      outCol = sampleMorph(uMapRest, uMapC2, vec2(0.0, 0.5), uAngle / 0.48);
    } else {
      outCol = sampleMorph(uMapC2, uMapC3, vec2(0.5, 0.5), (uAngle - 0.48) / 0.52);
    }

    if (outCol.a < 0.004) discard;

    // Soft Sandstone daylight highlight rolloff + subtle right-side desk lamp rim & monitor bounce
    float sideGrad = clamp((0.5 - vFlowLocal.x) * 1.6, -1.0, 1.0);
    float lightShift = clamp(-uAngle, -1.0, 1.0) * sideGrad * 0.022;
    vec3 warmShift = vec3(1.04, 0.98, 0.92) * lightShift;
    float headLampRim = smoothstep(0.64, 0.96, vFlowLocal.x) * smoothstep(0.22, 0.78, vFlowLocal.y) * 0.028;
    float headMonBounce = smoothstep(0.28, 0.72, vFlowLocal.x) * smoothstep(0.10, 0.55, vFlowLocal.y) * 0.012;
    vec3 studioWarmth = warmShift + vec3(1.0, 0.88, 0.72) * headLampRim + vec3(0.96, 0.92, 0.86) * headMonBounce;
    outCol.rgb = clamp(outCol.rgb + studioWarmth * (1.0 - outCol.rgb), 0.0, 1.0);

    gl_FragColor = vec4(outCol.rgb * outCol.a, outCol.a);
  }
`;

function compileShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(sh) || 'Shader compile failed';
    gl.deleteShader(sh);
    throw new Error(err);
  }
  return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const err = gl.getProgramInfoLog(prog) || 'Program link failed';
    gl.deleteProgram(prog);
    throw new Error(err);
  }
  return prog;
}

function buildGridData(bounds, cols, rows, pivot, optionsGrid = {}) {
  const { x0, y0, x1, y1 } = bounds;
  const vertCount = (cols + 1) * (rows + 1);
  const baseSX = new Float32Array(vertCount);
  const baseSY = new Float32Array(vertCount);
  const reliefZ = new Float32Array(vertCount);
  const crownMask = new Float32Array(vertCount);
  const breathMask = new Float32Array(vertCount);
  const uvs = new Float32Array(vertCount * 2);
  const positions = new Float32Array(vertCount * 3);

  let vi = 0;
  for (let r = 0; r <= rows; r++) {
    const v = 1 - r / rows;
    const sy = y0 + (1 - v) * (y1 - y0);
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const sx = x0 + u * (x1 - x0);
      baseSX[vi] = sx;
      baseSY[vi] = sy;
      uvs[vi * 2] = u;
      uvs[vi * 2 + 1] = v;

      if (optionsGrid.isCranial) {
        const dx = (sx - HEAD_CENTER.x) / 86;
        const dy = (sy - HEAD_CENTER.y) / 86;
        const r2 = Math.min(1, dx * dx + dy * dy);
        reliefZ[vi] = Math.sqrt(Math.max(0, 1 - r2)) * 0.052;
        crownMask[vi] = smoothstep(545, 442, sy);
      }
      if (optionsGrid.isTorso) {
        // Upper shoulders/collar lift gently with breathing; lower chair/desk stays 100% locked
        breathMask[vi] = smoothstep(860, 620, sy);
      }
      vi++;
    }
  }

  const indices = new Uint16Array(cols * rows * 6);
  let ii = 0;
  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      const b = a + 1;
      const d = (r + 1) * stride + c;
      const e = d + 1;
      indices[ii++] = a;
      indices[ii++] = d;
      indices[ii++] = b;
      indices[ii++] = b;
      indices[ii++] = d;
      indices[ii++] = e;
    }
  }

  return {
    bounds,
    pivot,
    vertCount,
    baseSX,
    baseSY,
    reliefZ,
    crownMask,
    breathMask,
    uvs,
    positions,
    indices,
    posBuf: null,
    uvBuf: null,
    crownBuf: null,
    breathBuf: null,
    idxBuf: null
  };
}

export function initDeskScene3D(options = {}) {
  const container = document.getElementById('desk-scene');
  const bgCanvas = document.getElementById('desk-bg-canvas');
  let charCanvas = document.getElementById('desk-char-canvas');
  if (!container || !bgCanvas || !charCanvas) return null;

  const bgCtx = bgCanvas.getContext('2d');
  let charCtx2D = null;
  const catCanvas = document.getElementById('desk-cat-layer');
  const catCtx = catCanvas ? catCanvas.getContext('2d') : null;

  let destroyed = false;
  let viewW = 974;
  let viewH = 900;
  let drawX = 0;
  let drawY = 0;
  let drawW = 974;
  let drawH = 900;

  let bgImage = null;
  let catImage = null;
  let neckBedImg = null;
  let bodyImg = null;
  let headRestImg = null;

  let stage1Ready = false;
  let stage2Started = false;
  let hoverReady = false;

  // WebGL state (lazily created on desktop >= 1024px)
  let gl = null;
  let isWebGL2 = false;
  let anisoExt = null;
  let maxAniso = 1;
  let basicProg = null;
  let headProg = null;
  let basicLoc = null;
  let headLoc = null;
  let webglFailed = false;
  let webglDirty = true;

  const textures = {
    neckBed: null,
    body: null,
    chinShadow: null,
    rest: null,
    c0: null,
    c1: null,
    c2: null,
    c3: null,
    flowAtlas: null
  };

  const neckBedGrid = buildGridData(NECK_BOUNDS, 12, 10, NECK_BASE_PIVOT);
  const bodyGrid = buildGridData(BODY_BOUNDS, 28, 28, BODY_PIVOT, { isTorso: true });
  const headGrid = buildGridData(HEAD_BOUNDS, 28, 28, HEAD_ATLAS_PIVOT, { isCranial: true });
  const chinShadowGrid = buildGridData(CHIN_BOUNDS, 2, 2, CHIN_PIVOT);
  const allGrids = [neckBedGrid, bodyGrid, headGrid, chinShadowGrid];

  let projView = mat4PerspectiveView(FOV_DEG, 1, 0.1, 30, CAM_Z);
  let neckPosW = { wx: 0, wy: 0 };
  let atlasPosW = { wx: 0, wy: 0 };
  let bodyPosW = { wx: 0, wy: 0 };
  let chinRestPos = { wx: 0, wy: 0 };

  function sceneToWorld(sx, sy) {
    const px = drawX + (sx / SCENE_W) * drawW;
    const py = drawY + (sy / SCENE_H) * drawH;
    const frustumH = 2 * CAM_Z * Math.tan((FOV_DEG * Math.PI) / 360);
    const frustumW = frustumH * (viewW / Math.max(1, viewH));
    return {
      wx: (px / Math.max(1, viewW) - 0.5) * frustumW,
      wy: (0.5 - py / Math.max(1, viewH)) * frustumH
    };
  }

  function uploadImageTexture(source, { premultiply, mipmap, aniso }) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, Boolean(premultiply));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    const w = source.naturalWidth || source.width || 0;
    const h = source.naturalHeight || source.height || 0;
    const canMipmap = mipmap && (isWebGL2 || (isPow2(w) && isPow2(h)));

    if (canMipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (aniso && anisoExt && maxAniso > 1) {
      gl.texParameterf(gl.TEXTURE_2D, anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function uploadFlowAtlasTexture(bytes) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function initGridBuffers(grid) {
    grid.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, grid.positions, gl.DYNAMIC_DRAW);

    grid.uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, grid.uvs, gl.STATIC_DRAW);

    if (grid === headGrid) {
      grid.crownBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, grid.crownBuf);
      gl.bufferData(gl.ARRAY_BUFFER, grid.crownMask, gl.STATIC_DRAW);
    } else {
      grid.breathBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, grid.breathBuf);
      gl.bufferData(gl.ARRAY_BUFFER, grid.breathMask, gl.STATIC_DRAW);
    }

    grid.idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grid.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
  }

  function ensureWebGL() {
    if (gl) return true;
    if (webglFailed || destroyed) return false;

    // A canvas bound to '2d' cannot switch to 'webgl'; clone a fresh node on resize <1024 -> >=1024
    if (charCtx2D) {
      charCanvas.removeEventListener('webglcontextlost', onContextLost);
      const freshCanvas = charCanvas.cloneNode(false);
      charCanvas.replaceWith(freshCanvas);
      charCanvas = freshCanvas;
      charCanvas.addEventListener('webglcontextlost', onContextLost);
      charCtx2D = null;
    }

    const ctxAttrs = {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    };

    try {
      gl = charCanvas.getContext('webgl2', ctxAttrs);
      if (gl) {
        isWebGL2 = true;
      } else {
        gl = charCanvas.getContext('webgl', ctxAttrs) || charCanvas.getContext('experimental-webgl', ctxAttrs);
        isWebGL2 = false;
      }
      if (!gl) throw new Error('WebGL unavailable');

      anisoExt =
        gl.getExtension('EXT_texture_filter_anisotropic') ||
        gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
      if (anisoExt) {
        const hwMax = gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 4;
        maxAniso = Math.min(16, hwMax);
      }

      basicProg = createProgram(gl, BASIC_VS, BASIC_FS);
      basicLoc = {
        aPos: gl.getAttribLocation(basicProg, 'aPos'),
        aUv: gl.getAttribLocation(basicProg, 'aUv'),
        aBreathMask: gl.getAttribLocation(basicProg, 'aBreathMask'),
        uMvp: gl.getUniformLocation(basicProg, 'uMvp'),
        uMap: gl.getUniformLocation(basicProg, 'uMap'),
        uOpacity: gl.getUniformLocation(basicProg, 'uOpacity'),
        uBreathLift: gl.getUniformLocation(basicProg, 'uBreathLift'),
        uRimStrength: gl.getUniformLocation(basicProg, 'uRimStrength')
      };

      headProg = createProgram(gl, HEAD_VS, HEAD_FS);
      headLoc = {
        aPos: gl.getAttribLocation(headProg, 'aPos'),
        aUv: gl.getAttribLocation(headProg, 'aUv'),
        aCrownMask: gl.getAttribLocation(headProg, 'aCrownMask'),
        uMvp: gl.getUniformLocation(headProg, 'uMvp'),
        uCrownLag: gl.getUniformLocation(headProg, 'uCrownLag'),
        uAngle: gl.getUniformLocation(headProg, 'uAngle'),
        uHoverReady: gl.getUniformLocation(headProg, 'uHoverReady'),
        uMapC0: gl.getUniformLocation(headProg, 'uMapC0'),
        uMapC1: gl.getUniformLocation(headProg, 'uMapC1'),
        uMapRest: gl.getUniformLocation(headProg, 'uMapRest'),
        uMapC2: gl.getUniformLocation(headProg, 'uMapC2'),
        uMapC3: gl.getUniformLocation(headProg, 'uMapC3'),
        uFlowAtlas: gl.getUniformLocation(headProg, 'uFlowAtlas')
      };

      allGrids.forEach(initGridBuffers);
      textures.chinShadow = uploadImageTexture(makeChinShadowCanvas(), {
        premultiply: true,
        mipmap: false,
        aniso: false
      });

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      if (stage1Ready) {
        uploadStage1Textures();
      }
      return true;
    } catch (_) {
      gl = null;
      webglFailed = true;
      if (typeof options.onFallback === 'function') options.onFallback();
      return false;
    }
  }

  function uploadStage1Textures() {
    if (!gl || !stage1Ready) return;
    if (!textures.neckBed && neckBedImg) {
      textures.neckBed = uploadImageTexture(neckBedImg, { premultiply: true, mipmap: true, aniso: true });
    }
    if (!textures.body && bodyImg) {
      textures.body = uploadImageTexture(bodyImg, { premultiply: true, mipmap: true, aniso: true });
    }
    if (!textures.rest && headRestImg) {
      textures.rest = uploadImageTexture(headRestImg, { premultiply: false, mipmap: true, aniso: true });
    }
    webglDirty = true;
  }

  function startStage2IfDesktop() {
    if (stage2Started || destroyed || window.innerWidth < 1024 || !gl) return;
    stage2Started = true;

    Promise.all([
      loadImage(`assets/desk-scene/ryan-head-card0.webp?v=${ASSET_V}`),
      loadImage(`assets/desk-scene/ryan-head-card1.webp?v=${ASSET_V}`),
      loadImage(`assets/desk-scene/ryan-head-card2.webp?v=${ASSET_V}`),
      loadImage(`assets/desk-scene/ryan-head-card3.webp?v=${ASSET_V}`),
      loadFlowAtlasBytes(`assets/desk-scene/flow-atlas.bin?v=${ASSET_V}`)
    ])
      .then(([c0, c1, c2, c3, flowBytes]) => {
        if (destroyed || !gl) return;
        textures.c0 = uploadImageTexture(c0, { premultiply: false, mipmap: true, aniso: true });
        textures.c1 = uploadImageTexture(c1, { premultiply: false, mipmap: true, aniso: true });
        textures.c2 = uploadImageTexture(c2, { premultiply: false, mipmap: true, aniso: true });
        textures.c3 = uploadImageTexture(c3, { premultiply: false, mipmap: true, aniso: true });
        textures.flowAtlas = uploadFlowAtlasTexture(flowBytes);
        hoverReady = true;
        webglDirty = true;
        ensureRunning();
      })
      .catch(() => {
        // Stage 1 rest pose remains crisp and intact even if Stage 2 fails
      });
  }

  const onContextLost = (e) => {
    e.preventDefault();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (typeof options.onFallback === 'function') options.onFallback();
  };
  charCanvas.addEventListener('webglcontextlost', onContextLost);

  // =========================================================================
  // 2. GEOMETRY POSITIONING, 2D BACKGROUND / MOBILE COMPOSITE & OVERLAY SYNC
  // =========================================================================
  function syncRigGeometry() {
    if (!gl) return;
    neckPosW = sceneToWorld(NECK_BASE_PIVOT.x, NECK_BASE_PIVOT.y);
    atlasPosW = sceneToWorld(HEAD_ATLAS_PIVOT.x, HEAD_ATLAS_PIVOT.y);
    bodyPosW = sceneToWorld(BODY_PIVOT.x, BODY_PIVOT.y);
    chinRestPos = sceneToWorld(CHIN_PIVOT.x, CHIN_PIVOT.y);

    const updateGridVerts = (grid, pivW) => {
      const pos = grid.positions;
      for (let i = 0; i < grid.vertCount; i++) {
        const w = sceneToWorld(grid.baseSX[i], grid.baseSY[i]);
        pos[i * 3] = w.wx - pivW.wx;
        pos[i * 3 + 1] = w.wy - pivW.wy;
        pos[i * 3 + 2] = grid.reliefZ[i];
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, grid.posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    };

    updateGridVerts(neckBedGrid, neckPosW);
    updateGridVerts(headGrid, atlasPosW);
    updateGridVerts(chinShadowGrid, chinRestPos);
    updateGridVerts(bodyGrid, bodyPosW);
    webglDirty = true;
  }

  function drawCroppedLayer2D(ctx, img, bounds, dpr) {
    if (!ctx || !img) return;
    const dx = (drawX + (bounds.x0 / SCENE_W) * drawW) * dpr;
    const dy = (drawY + (bounds.y0 / SCENE_H) * drawH) * dpr;
    const dw = ((bounds.x1 - bounds.x0) / SCENE_W) * drawW * dpr;
    const dh = ((bounds.y1 - bounds.y0) / SCENE_H) * drawH * dpr;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function renderBackgroundPlate() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    if (!bgImage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';
    bgCtx.drawImage(bgImage, drawX * dpr, drawY * dpr, drawW * dpr, drawH * dpr);
  }

  function renderMobileCharacter2D() {
    if (gl || !stage1Ready) return;
    if (!charCtx2D) {
      charCtx2D = charCanvas.getContext('2d');
    }
    if (!charCtx2D) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    charCtx2D.clearRect(0, 0, charCanvas.width, charCanvas.height);
    charCtx2D.imageSmoothingEnabled = true;
    charCtx2D.imageSmoothingQuality = 'high';
    drawCroppedLayer2D(charCtx2D, neckBedImg, NECK_BOUNDS, dpr);
    drawCroppedLayer2D(charCtx2D, headRestImg, HEAD_BOUNDS, dpr);
    drawCroppedLayer2D(charCtx2D, bodyImg, BODY_BOUNDS, dpr);
  }

  function drawBasicMesh(grid, tex, mvp, opacity, breathLift = 0.0, rimStrength = 0.0) {
    if (!tex) return;
    gl.useProgram(basicProg);
    gl.uniformMatrix4fv(basicLoc.uMvp, false, mvp);
    gl.uniform1f(basicLoc.uOpacity, opacity);
    gl.uniform1f(basicLoc.uBreathLift, breathLift);
    gl.uniform1f(basicLoc.uRimStrength, rimStrength);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(basicLoc.uMap, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, grid.posBuf);
    gl.enableVertexAttribArray(basicLoc.aPos);
    gl.vertexAttribPointer(basicLoc.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, grid.uvBuf);
    gl.enableVertexAttribArray(basicLoc.aUv);
    gl.vertexAttribPointer(basicLoc.aUv, 2, gl.FLOAT, false, 0, 0);

    if (basicLoc.aBreathMask >= 0 && grid.breathBuf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, grid.breathBuf);
      gl.enableVertexAttribArray(basicLoc.aBreathMask);
      gl.vertexAttribPointer(basicLoc.aBreathMask, 1, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, grid.idxBuf);
    gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function drawHeadMesh(mvp, angle, crownLag) {
    if (!textures.rest) return;
    gl.useProgram(headProg);
    gl.uniformMatrix4fv(headLoc.uMvp, false, mvp);
    gl.uniform1f(headLoc.uAngle, angle);
    gl.uniform1f(headLoc.uCrownLag, crownLag);
    gl.uniform1f(headLoc.uHoverReady, hoverReady ? 1.0 : 0.0);

    const restTex = textures.rest;
    const slots = [
      [headLoc.uMapC0, textures.c0 || restTex],
      [headLoc.uMapC1, textures.c1 || restTex],
      [headLoc.uMapRest, restTex],
      [headLoc.uMapC2, textures.c2 || restTex],
      [headLoc.uMapC3, textures.c3 || restTex],
      [headLoc.uFlowAtlas, textures.flowAtlas || restTex]
    ];
    for (let i = 0; i < slots.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, slots[i][1]);
      gl.uniform1i(slots[i][0], i);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, headGrid.posBuf);
    gl.enableVertexAttribArray(headLoc.aPos);
    gl.vertexAttribPointer(headLoc.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, headGrid.uvBuf);
    gl.enableVertexAttribArray(headLoc.aUv);
    gl.vertexAttribPointer(headLoc.aUv, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, headGrid.crownBuf);
    gl.enableVertexAttribArray(headLoc.aCrownMask);
    gl.vertexAttribPointer(headLoc.aCrownMask, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, headGrid.idxBuf);
    gl.drawElements(gl.TRIANGLES, headGrid.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function renderWebGL() {
    if (!gl || !stage1Ready) return;
    gl.viewport(0, 0, charCanvas.width, charCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const neckEuler = angleToEuler(neckSpring.pos);
    const headEuler = angleToEuler(headSpring.pos);
    // Subtle human mid-sweep chin arc dip during head turn
    const pitchDip = -Math.min(0.014, Math.abs(headSpring.vel) * 0.0045);

    // Layer 1 (lower neck hinge: 38% turn led by neckSpring + unified breathing lift)
    const neckModel = mat4TRS(
      neckPosW.wx,
      neckPosW.wy + currentBreathLift,
      0.0,
      neckEuler.pitch * 0.38,
      neckEuler.yaw * 0.38,
      neckEuler.roll * 0.38
    );
    drawBasicMesh(neckBedGrid, textures.neckBed, mat4Mul(projView, neckModel), 1.0, 0.0, 0.025);

    // Layer 2 (cranial dome atop C1 atlas: residual 62% + natural chin arc dip)
    const headLocal = mat4TRS(
      atlasPosW.wx - neckPosW.wx,
      atlasPosW.wy - neckPosW.wy,
      0.002,
      headEuler.pitch + pitchDip - neckEuler.pitch * 0.38,
      headEuler.yaw - neckEuler.yaw * 0.38,
      headEuler.roll - neckEuler.roll * 0.38
    );
    const headModel = mat4Mul(neckModel, headLocal);
    drawHeadMesh(mat4Mul(projView, headModel), headSpring.pos, crownSpring.pos - headSpring.pos);

    // Layer 3 (soft dynamic chin contact AO shadow with right-turn jaw-lift occlusion + breathing lift)
    const rightTurn = Math.max(0, headSpring.pos);
    const chinScaleX = 1.0 + rightTurn * 0.15;
    const chinScaleY = 1.0 + rightTurn * 0.2;
    const chinOpacity = Math.max(0, 0.45 - Math.abs(headSpring.pos) * 0.08 - rightTurn * 0.08);
    const chinModel = mat4TRS(
      chinRestPos.wx + crownSpring.pos * 0.0045,
      chinRestPos.wy - Math.abs(crownSpring.pos) * 0.0012 + currentBreathLift,
      0.004,
      0,
      0,
      0,
      chinScaleX,
      chinScaleY
    );
    drawBasicMesh(chinShadowGrid, textures.chinShadow, mat4Mul(projView, chinModel), chinOpacity, 0.0, 0.0);

    // Layer 4 (upper shoulders/collar gently lift via aBreathMask; chair & desk stay locked + warm desk-lamp rim)
    const bodyModel = mat4TRS(bodyPosW.wx, bodyPosW.wy, 0.005);
    drawBasicMesh(bodyGrid, textures.body, mat4Mul(projView, bodyModel), 1.0, currentBreathLift, 0.04);

    webglDirty = false;
  }

  function syncOverlaysAndResize() {
    if (destroyed) return;
    const rect = container.getBoundingClientRect();
    viewW = Math.max(320, Math.round(rect.width));
    viewH = Math.max(260, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    bgCanvas.width = viewW * dpr;
    bgCanvas.height = viewH * dpr;

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      if (ensureWebGL()) {
        charCanvas.width = viewW * dpr;
        charCanvas.height = viewH * dpr;
        projView = mat4PerspectiveView(FOV_DEG, viewW / viewH, 0.1, 30, CAM_Z);
        if (stage1Ready) startStage2IfDesktop();
      }
    } else {
      charCanvas.width = viewW * dpr;
      charCanvas.height = viewH * dpr;
      if (gl) {
        projView = mat4PerspectiveView(FOV_DEG, viewW / viewH, 0.1, 30, CAM_Z);
      }
    }

    const DESK_WIDTH_IN_SCENE = 936;
    const targetDeskW = Math.min(720, Math.max(280, viewW - 24));
    const scale = targetDeskW / DESK_WIDTH_IN_SCENE;
    drawW = SCENE_W * scale;
    drawH = SCENE_H * scale;
    drawX = (viewW - drawW) * 0.5;
    drawY = isDesktop ? viewH - drawH + 130 : Math.max(0, viewH - drawH);

    container.style.setProperty('--stage-left', `${((drawX / viewW) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-top', `${((drawY / viewH) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-width', `${((drawW / viewW) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-height', `${((drawH / viewH) * 100).toFixed(4)}%`);

    container.style.setProperty('--mon-left', `${((MON_RECT.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-top', `${((MON_RECT.y / SCENE_H) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-width', `${((MON_RECT.w / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-height', `${((MON_RECT.h / SCENE_H) * 100).toFixed(4)}%`);

    container.style.setProperty('--mug-left', `${((MUG_POS.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mug-top', `${((MUG_POS.y / SCENE_H) * 100).toFixed(4)}%`);

    container.style.setProperty('--cat-left', `${((CAT_POS.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--cat-top', `${((CAT_POS.y / SCENE_H) * 100).toFixed(4)}%`);

    const omnibarEl = document.querySelector('.home-omnibar-section');
    if (omnibarEl) {
      const obRect = omnibarEl.getBoundingClientRect();
      if (obRect.height > 0) {
        const floorCenterY = (obRect.top + obRect.bottom) * 0.5;
        document.documentElement.style.setProperty('--floor-center-y', `${floorCenterY.toFixed(1)}px`);
      }
    }

    renderBackgroundPlate();
    if (gl) {
      syncRigGeometry();
      applyPoseAtTime(performance.now());
      renderWebGL();
    } else {
      renderMobileCharacter2D();
      renderCatFrame(performance.now());
    }

    if (typeof options.onMonitorSync === 'function') {
      options.onMonitorSync();
    }
  }

  // =========================================================================
  // 3. LAYERED CRITICAL-SPRING ANATOMY + IDLE GPU GATING
  // =========================================================================
  const CARD_ANGLE_TARGETS = {
    rest: 0.0,
    0: -1.0,
    1: -0.48,
    2: 0.48,
    3: 1.0
  };

  function angleToEuler(a) {
    const absA = Math.min(1.0, Math.abs(a));
    const sign = a < 0 ? -1 : a > 0 ? 1 : 0;
    return {
      yaw: sign * 0.020 * absA,
      pitch: -0.016 * absA,
      roll: sign * 0.008 * absA
    };
  }

  function makeSpring(omega, zeta) {
    return { pos: 0.0, vel: 0.0, target: 0.0, omega, zeta };
  }

  function isSpringActive(s) {
    return s.vel !== 0.0 || s.pos !== s.target;
  }

  function stepSpring(s, dt) {
    const k = s.omega * s.omega;
    const c = 2.0 * s.zeta * s.omega;
    const acc = k * (s.target - s.pos) - c * s.vel;
    s.vel += acc * dt;
    s.pos += s.vel * dt;
    if (Math.abs(s.target - s.pos) < 0.0002 && Math.abs(s.vel) < 0.0004) {
      s.pos = s.target;
      s.vel = 0.0;
    }
  }

  const neckSpring = makeSpring(11.6, 0.95);
  const headSpring = makeSpring(9.8, 0.92);
  const crownSpring = makeSpring(8.6, 0.84);
  let lastPhysicsTime = performance.now();
  let currentCardKey = 'rest';
  let ambientGaze = 0.0;
  let currentBreathLift = 0.0;

  let isPaused = false;
  let prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rafId = null;

  function applyPoseAtTime(now) {
    const rawDt = Math.max(0, Math.min(0.05, (now - lastPhysicsTime) / 1000));
    lastPhysicsTime = now;

    if (prefersReducedMotion || window.innerWidth < 1024) {
      if (neckSpring.pos !== 0 || headSpring.pos !== 0 || crownSpring.pos !== 0 || currentBreathLift !== 0) {
        webglDirty = true;
      }
      neckSpring.pos = neckSpring.vel = neckSpring.target = 0;
      headSpring.pos = headSpring.vel = headSpring.target = 0;
      crownSpring.pos = crownSpring.vel = crownSpring.target = 0;
      currentBreathLift = 0.0;
    } else {
      // Gentle ~4.8s asymmetric thoracic breathing cycle (inhale 40%, exhale 60%)
      const bCycle = (now % 4800) / 4800;
      const bWave = bCycle < 0.4
        ? 0.5 - 0.5 * Math.cos((Math.PI * bCycle) / 0.4)
        : 0.5 + 0.5 * Math.cos((Math.PI * (bCycle - 0.4)) / 0.6);
      const nextBreathLift = bWave * 0.0022;
      if (Math.abs(nextBreathLift - currentBreathLift) > 1e-6) {
        currentBreathLift = nextBreathLift;
        webglDirty = true;
      }

      // Subtle organic idle gaze micro-drift (+-0.015) when at rest & cursor is centered/still
      if (currentCardKey === 'rest') {
        const idleDrift = Math.abs(ambientGaze) < 0.001
          ? Math.sin(now * 0.00055) * 0.010 + Math.sin(now * 0.00091 + 1.3) * 0.005
          : 0.0;
        const restTarget = ambientGaze + idleDrift;
        neckSpring.target = restTarget;
        headSpring.target = restTarget;
      }

      if (rawDt > 0 && (isSpringActive(neckSpring) || isSpringActive(headSpring) || isSpringActive(crownSpring))) {
        const steps = Math.max(1, Math.ceil(rawDt / 0.004));
        const dt = rawDt / steps;
        for (let s = 0; s < steps; s++) {
          stepSpring(neckSpring, dt);
          stepSpring(headSpring, dt);
          crownSpring.target = headSpring.pos;
          stepSpring(crownSpring, dt);
        }
        webglDirty = true;
      }
    }

    renderCatFrame(now);
  }

  // Natural snoozing ribcage breathing (~4.3s) + ear twitch (~9.6s) on 1:1 cropped 436x200 cat sprite
  function renderCatFrame(now) {
    if (!catCanvas || !catCtx || !catImage) return;
    const CW = catCanvas.width;
    const CH = catCanvas.height;
    const BASE_PAW_Y = 152;

    catCtx.clearRect(0, 0, CW, CH);
    catCtx.imageSmoothingEnabled = true;
    catCtx.imageSmoothingQuality = 'high';

    if (prefersReducedMotion || isPaused) {
      catCtx.drawImage(catImage, 0, 0, CW, CH, 0, 0, CW, CH);
      return;
    }

    const cycle = (now % 4300) / 4300;
    const breathe = cycle < 0.38
      ? 0.5 - 0.5 * Math.cos((Math.PI * cycle) / 0.38)
      : 0.5 + 0.5 * Math.cos((Math.PI * (cycle - 0.38)) / 0.62);

    const earCycle = (now % 9600) / 320;
    const earFlick = earCycle < 1.0 ? Math.sin(earCycle * Math.PI * 2) * (1.0 - earCycle) * 6.5 : 0;

    // 1. Pinned resting lower body & paws (zero lift off shadow)
    catCtx.drawImage(catImage, 0, BASE_PAW_Y, CW, CH - BASE_PAW_Y, 0, BASE_PAW_Y, CW, CH - BASE_PAW_Y);

    // 2. Smooth 4px vertical strips for ribcage rise/fall + ear twitch
    for (let dx = 0; dx < CW; dx += 4) {
      const sw = Math.min(4, CW - dx);
      const sx = 334 + (dx + sw * 0.5) * 0.5;
      const ribDist = (sx - 418) / 48;
      const ribW = Math.exp(-(ribDist * ribDist));
      const earDist = (sx - 533) / 11;
      const earW = Math.exp(-(earDist * earDist));
      const lift = breathe * 8.5 * ribW + earFlick * earW;
      catCtx.drawImage(catImage, dx, 0, sw, BASE_PAW_Y, dx, -lift, sw, BASE_PAW_Y + lift);
    }
  }

  function tick(now) {
    if (isPaused || destroyed) {
      rafId = null;
      return;
    }
    applyPoseAtTime(now);
    if (webglDirty) {
      renderWebGL();
    }
    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function ensureRunning() {
    if (isPaused || destroyed) return;
    if (prefersReducedMotion) {
      applyPoseAtTime(performance.now());
      if (webglDirty) renderWebGL();
      return;
    }
    if (!rafId) {
      lastPhysicsTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function setCardTarget(cardKey) {
    if (window.innerWidth < 1024) return;
    const normKey = Object.prototype.hasOwnProperty.call(CARD_ANGLE_TARGETS, cardKey)
      ? String(cardKey)
      : 'rest';
    currentCardKey = normKey;
    const nextAngle = normKey === 'rest' ? ambientGaze : CARD_ANGLE_TARGETS[normKey];
    neckSpring.target = nextAngle;
    headSpring.target = nextAngle;
    webglDirty = true;
    ensureRunning();
  }

  function setAmbientGaze(normX) {
    if (prefersReducedMotion || window.innerWidth < 1024) {
      ambientGaze = 0.0;
      return;
    }
    const clamped = clamp(Number(normX) || 0, -1, 1);
    ambientGaze = clamped * 0.16;
    if (currentCardKey === 'rest') {
      neckSpring.target = ambientGaze;
      headSpring.target = ambientGaze;
      webglDirty = true;
      ensureRunning();
    }
  }

  function setPaused(paused) {
    isPaused = Boolean(paused);
    if (isPaused && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!isPaused) {
      lastPhysicsTime = performance.now();
      ensureRunning();
    }
  }

  function setReducedMotion(reduced) {
    prefersReducedMotion = Boolean(reduced);
    if (prefersReducedMotion && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    webglDirty = true;
    applyPoseAtTime(performance.now());
    renderWebGL();
    if (!prefersReducedMotion) ensureRunning();
  }

  // =========================================================================
  // 4. TWO-STAGE PROGRESSIVE LOAD
  // =========================================================================
  syncOverlaysAndResize();

  Promise.all([
    loadImage(`assets/desk-scene/scene-bg.webp?v=${ASSET_V}`),
    loadImage(`assets/desk-scene/tuxedo-cat.webp?v=${ASSET_V}`),
    loadImage(`assets/desk-scene/ryan-neck-bed.webp?v=${ASSET_V}`),
    loadImage(`assets/desk-scene/ryan-body.webp?v=${ASSET_V}`),
    loadImage(`assets/desk-scene/ryan-head.webp?v=${ASSET_V}`)
  ])
    .then(([bg, cat, neck, body, headRest]) => {
      if (destroyed) return;
      bgImage = bg;
      catImage = cat;
      neckBedImg = neck;
      bodyImg = body;
      headRestImg = headRest;
      stage1Ready = true;

      if (window.innerWidth >= 1024 && ensureWebGL()) {
        uploadStage1Textures();
      }

      syncOverlaysAndResize();
      container.classList.add('is-ready');
      ensureRunning();

      // Stage 2: background hover poses + optical-flow atlas (desktop only)
      if (window.innerWidth >= 1024 && gl) {
        startStage2IfDesktop();
      }
    })
    .catch(() => {
      if (!destroyed && typeof options.onFallback === 'function') {
        options.onFallback();
      }
    });

  let resizeTimer = null;
  const onResize = () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(syncOverlaysAndResize);
  };
  window.addEventListener('resize', onResize);

  function destroy() {
    destroyed = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (resizeTimer) {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = null;
    }
    window.removeEventListener('resize', onResize);
    charCanvas.removeEventListener('webglcontextlost', onContextLost);

    if (gl) {
      Object.values(textures).forEach((tex) => {
        if (tex) gl.deleteTexture(tex);
      });
      allGrids.forEach((g) => {
        if (g.posBuf) gl.deleteBuffer(g.posBuf);
        if (g.uvBuf) gl.deleteBuffer(g.uvBuf);
        if (g.crownBuf) gl.deleteBuffer(g.crownBuf);
        if (g.breathBuf) gl.deleteBuffer(g.breathBuf);
        if (g.idxBuf) gl.deleteBuffer(g.idxBuf);
      });
      if (basicProg) gl.deleteProgram(basicProg);
      if (headProg) gl.deleteProgram(headProg);
      gl = null;
    }
  }

  return {
    setCardTarget,
    setAmbientGaze,
    setPaused,
    setReducedMotion,
    syncOverlaysAndResize,
    destroy
  };
}
