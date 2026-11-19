/**
 * Ryan Schmidt Portfolio: "Desk Scene" 3D Runtime (Three.js)
 * Lazily loaded after hero text and case study cards render.
 *
 * Architecture:
 * - Master Studio Coordinate Space (1480 x 1180, rendered from 2x 2960x2360 WebP studio plates):
 *   - Monitor screen, coffee mug rim, and cat overlays synced via CSS custom properties.
 * - Static background pass (#desk-bg-canvas, z-index: 1):
 *   Renders `assets/desk-scene/scene-bg.webp?v=155`.
 * - Live HTML monitor layer (#desk-monitor-screen, z-index: 2):
 *   Dynamically synced via `--mon-left`, `--mon-top`, `--mon-width`, `--mon-height`.
 * - Dynamic 3D foreground pass (#desk-char-canvas, z-index: 3):
 *   - `upperBodyGroup` (locked stationary shoulders/torso/chair)
 *     - `neckBedGroup` (`ryan-neck-bed.webp?v=155`, renderOrder 1, 38% cervical hinge)
 *     - `headPivotGroup` (5-pose optical-flow morphed head `ryan-head*.webp?v=155` + `flow-atlas.bin?v=155`,
 *       renderOrder 1.5, residual 62% cranial turn driven by critically-damped springs)
 *     - `chinShadowMesh` (renderOrder 2.4, soft hand-jaw contact occlusion)
 *     - `bodyMesh` (`ryan-body.webp?v=155`, renderOrder 3): sweater collar rim, left arm & hand, and chair.
 */

import * as THREE from './vendor/three.module.min.js';

// Master studio asset dimensions & exact feature coordinates (v123: high-res 1480x1180)
const SCENE_W = 1480;
const SCENE_H = 1180;

// Exact inner monitor screen rectangle in 1480x1180 master space (extended ~2px under all 4 bezels so zero gap shows)
const MON_RECT = {
  x: 517, // 34.93%
  y: 507, // 42.97%
  w: 445, // 30.07%
  h: 177  // 15.00%
};

// Exact coffee mug opening center in 1480x1180 master space (strictly left of lamp shade)
const MUG_POS = {
  x: 1003.5, // 67.80%
  y: 708     // 60.00%
};

// Exact napping tuxedo cat position on left desk surface (between left edge and monitor)
const CAT_POS = {
  x: 375, // 25.34%
  y: 742  // 62.88%
};

// True spine/cervical center pivots aligned cleanly to Ryan's head center (crownCX = 754)
const NECK_BASE_PIVOT = {
  x: 754,
  y: 626
};
const HEAD_ATLAS_PIVOT = {
  x: 754,
  y: 584
};

const HEAD_CENTER = {
  x: 754,
  y: 533
};

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function makeTexture(img, maxAnisotropy = 4) {
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

async function loadFlowAtlasTexture(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed loading flow atlas: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const tex = new THREE.DataTexture(bytes, 256, 256, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeChinShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const ctx = c.getContext('2d');
  // True elliptical contact shadow reaching strict 0 alpha well inside canvas borders (no visible quad rectangle)
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function initDeskScene3D(options = {}) {
  const container = document.getElementById('desk-scene');
  const bgCanvas = document.getElementById('desk-bg-canvas');
  const charCanvas = document.getElementById('desk-char-canvas');
  if (!container || !bgCanvas || !charCanvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: charCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (_) {
    if (typeof options.onFallback === 'function') options.onFallback();
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  charCanvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (typeof options.onFallback === 'function') options.onFallback();
  });

  const bgCtx = bgCanvas.getContext('2d');
  const fgScene = new THREE.Scene();

  const FOV_DEG = 24;
  const CAM_Z = 4.2;
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 30);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, 0);

  let viewW = 974;
  let viewH = 900;
  let drawX = 0;
  let drawY = 0;
  let drawW = 974;
  let drawH = 900;
  let bgImage = null;
  let assetsReady = false;

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

  // Build sub-region geometry anchored relative to a pivot point in 1480x1180 space
  function buildAnchoredSubGrid(bounds, cols, rows, pivot, optionsGrid = {}) {
    const { x0, y0, x1, y1 } = bounds;
    const geo = new THREE.PlaneGeometry(1, 1, cols, rows);
    const uvAttr = geo.attributes.uv;
    const count = uvAttr.count;
    const baseSX = new Float32Array(count);
    const baseSY = new Float32Array(count);
    const reliefZ = new Float32Array(count);
    const crownMask = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      const sx = x0 + u * (x1 - x0);
      const sy = y0 + (1 - v) * (y1 - y0);
      baseSX[i] = sx;
      baseSY[i] = sy;

      // Map UVs to exact crop inside the 1480x1180 master texture
      uvAttr.setXY(i, sx / SCENE_W, 1 - sy / SCENE_H);

      if (optionsGrid.isCranial) {
        // Gentle 3D cranial dome centered on HEAD_CENTER + crown follow-through mask
        const dx = (sx - HEAD_CENTER.x) / 86;
        const dy = (sy - HEAD_CENTER.y) / 86;
        const r2 = Math.min(1, dx * dx + dy * dy);
        reliefZ[i] = Math.sqrt(Math.max(0, 1 - r2)) * 0.052;
        crownMask[i] = smoothstep(545, 442, sy);
      }
    }
    uvAttr.needsUpdate = true;
    geo.setAttribute('aCrownMask', new THREE.BufferAttribute(crownMask, 1));

    return { geo, baseSX, baseSY, reliefZ, pivot };
  }

  // =========================================================================
  // LAYERED MULTI-SPRING ANATOMICAL RIG:
  // Layer 1: neckBedGroup -> neckBedMesh (renderOrder 1.0, cervical hinge 38%)
  // Layer 2: neckBedGroup -> headPivotGroup -> headMesh (renderOrder 1.5,
  //          3D cranial dome + cervical torsion + crown lag + bidirectional optical flow)
  // Layer 3: chinShadowMesh (renderOrder 2.4, soft hand-jaw contact occlusion)
  // Layer 4: bodyMesh (renderOrder 3.0, stationary sweater collar & chin-supporting hand)
  // Note: Sleeping cat is rendered in its own DOM `.desk-cat-layer` above `.desk-cat-shadow`
  // =========================================================================

  const upperBodyGroup = new THREE.Group();
  fgScene.add(upperBodyGroup);

  const neckBedGroup = new THREE.Group();
  upperBodyGroup.add(neckBedGroup);

  const headPivotGroup = new THREE.Group();
  neckBedGroup.add(headPivotGroup);

  const neckBedGrid = buildAnchoredSubGrid(
    { x0: 696, y0: 562, x1: 856, y1: 646 },
    12,
    10,
    NECK_BASE_PIVOT
  );
  const neckBedMat = new THREE.MeshBasicMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const neckBedMesh = new THREE.Mesh(neckBedGrid.geo, neckBedMat);
  neckBedMesh.renderOrder = 1;
  neckBedMesh.visible = false;
  neckBedGroup.add(neckBedMesh);

  const bodyGrid = buildAnchoredSubGrid(
    { x0: 585, y0: 594, x1: 968, y1: 1018 },
    28,
    28,
    { x: 760, y: 840 }
  );
  const bodyMat = new THREE.MeshBasicMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const bodyMesh = new THREE.Mesh(bodyGrid.geo, bodyMat);
  bodyMesh.renderOrder = 3;
  bodyMesh.visible = false;
  upperBodyGroup.add(bodyMesh);

  const chinShadowGrid = buildAnchoredSubGrid(
    { x0: 704, y0: 604, x1: 742, y1: 626 },
    2,
    2,
    { x: 722, y: 615 }
  );
  // Remap full quad [0..1] UVs for the standalone radial chin occlusion texture
  {
    const chinUv = chinShadowGrid.geo.attributes.uv;
    for (let i = 0; i < chinUv.count; i++) {
      const u = (chinShadowGrid.baseSX[i] - 704) / 38;
      const v = 1 - (chinShadowGrid.baseSY[i] - 604) / 22;
      chinUv.setXY(i, u, v);
    }
    chinUv.needsUpdate = true;
  }
  const chinShadowMat = new THREE.MeshBasicMaterial({
    map: makeChinShadowTexture(),
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.45
  });
  const chinShadowMesh = new THREE.Mesh(chinShadowGrid.geo, chinShadowMat);
  chinShadowMesh.renderOrder = 2.4;
  chinShadowMesh.visible = false;
  upperBodyGroup.add(chinShadowMesh);

  const headGrid = buildAnchoredSubGrid(
    { x0: 656, y0: 428, x1: 884, y1: 660 },
    28,
    28,
    HEAD_ATLAS_PIVOT,
    { isCranial: true }
  );

  // Bidirectional Optical-Flow 5-Pose Morph + Hair Crown Follow-Through Shader (6 samplers <= 8 limit)
  const headShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMapC0: { value: null },
      uMapC1: { value: null },
      uMapRest: { value: null },
      uMapC2: { value: null },
      uMapC3: { value: null },
      uFlowAtlas: { value: null },
      uAngle: { value: 0.0 },
      uCrownLag: { value: 0.0 }
    },
    vertexShader: `
      attribute float aCrownMask;
      uniform float uCrownLag;
      varying vec2 vUv;
      varying vec2 vFlowLocal;

      void main() {
        vUv = uv;
        vec2 cropMin = vec2(656.0 / 1480.0, 1.0 - 660.0 / 1180.0);
        vec2 cropSize = vec2(228.0 / 1480.0, 232.0 / 1180.0);
        vFlowLocal = (uv - cropMin) / cropSize;

        vec3 p = position;
        // Very subtle secondary follow-through on crown (zero cervical shear tear)
        p.x += aCrownMask * uCrownLag * 0.0025;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMapC0;
      uniform sampler2D uMapC1;
      uniform sampler2D uMapRest;
      uniform sampler2D uMapC2;
      uniform sampler2D uMapC3;
      uniform sampler2D uFlowAtlas;
      uniform float uAngle;
      varying vec2 vUv;
      varying vec2 vFlowLocal;

      vec4 sampleMorph(sampler2D texA, sampler2D texB, vec2 qOrigin, float t) {
        float wt = clamp(t, 0.0, 1.0);
        // flipY=false DataTexture row-major layout: top of crop -> y=0 inside quadrant
        vec2 qCoord = vec2(vFlowLocal.x, 1.0 - vFlowLocal.y);
        vec2 atlasUv = qOrigin + clamp(qCoord, 0.004, 0.996) * 0.5;
        vec4 fl = texture2D(uFlowAtlas, atlasUv);
        vec2 uvScale = vec2(228.0 / 1480.0, 232.0 / 1180.0);
        vec2 fAB = ((fl.rg - 128.0 / 255.0) * (255.0 / 127.0) * 0.16) * uvScale;
        vec2 fBA = ((fl.ba - 128.0 / 255.0) * (255.0 / 127.0) * 0.16) * uvScale;

        // Backward optical-flow alignment with coverage-weighted alpha compositing (zero dark fringes or threshold snaps)
        vec4 a = texture2D(texA, vUv + fBA * wt);
        vec4 b = texture2D(texB, vUv + fAB * (1.0 - wt));
        float wA = a.a * (1.0 - wt);
        float wB = b.a * wt;
        float outA = mix(a.a, b.a, wt);
        vec3 straightRgb = (a.rgb * wA + b.rgb * wB) / max(wA + wB, 1e-4);
        return vec4(straightRgb, outA);
      }

      void main() {
        vec4 outCol;
        if (uAngle <= -0.48) {
          outCol = sampleMorph(uMapC0, uMapC1, vec2(0.0, 0.0), (uAngle + 1.0) / 0.52);
        } else if (uAngle <= 0.0) {
          outCol = sampleMorph(uMapC1, uMapRest, vec2(0.5, 0.0), (uAngle + 0.48) / 0.48);
        } else if (uAngle <= 0.48) {
          outCol = sampleMorph(uMapRest, uMapC2, vec2(0.0, 0.5), uAngle / 0.48);
        } else {
          outCol = sampleMorph(uMapC2, uMapC3, vec2(0.5, 0.5), (uAngle - 0.48) / 0.52);
        }

        if (outCol.a < 0.004) discard;
        // Subtle directional left-window key-light wrap as temple/ear rotates toward or away from left
        float sideGrad = clamp((0.5 - vFlowLocal.x) * 1.6, -1.0, 1.0);
        float lightShift = clamp(-uAngle, -1.0, 1.0) * sideGrad * 0.022;
        outCol.rgb = clamp(outCol.rgb + vec3(lightShift * 1.08, lightShift * 0.96, lightShift * 0.78), 0.0, 1.0);

        gl_FragColor = outCol;
        #include <colorspace_fragment>
        gl_FragColor.rgb *= outCol.a;
      }
    `
  });

  const headMesh = new THREE.Mesh(headGrid.geo, headShaderMat);
  headMesh.renderOrder = 1.5;
  headMesh.visible = false;
  headPivotGroup.add(headMesh);

  const catCanvas = document.getElementById('desk-cat-layer');
  const catCtx = catCanvas ? catCanvas.getContext('2d') : null;
  let catImage = null;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);

  let headTextures = null;

  // Load 2x (2960x2360) sharp studio WebP layers + cat + neck bed + 5 poses + lossless flow atlas
  Promise.all([
    loadImage('assets/desk-scene/scene-bg.webp?v=155'),
    loadImage('assets/desk-scene/tuxedo-cat.webp?v=155'),
    loadImage('assets/desk-scene/ryan-neck-bed.webp?v=155'),
    loadImage('assets/desk-scene/ryan-body.webp?v=155'),
    loadImage('assets/desk-scene/ryan-head.webp?v=155'),
    loadImage('assets/desk-scene/ryan-head-card0.webp?v=155'),
    loadImage('assets/desk-scene/ryan-head-card1.webp?v=155'),
    loadImage('assets/desk-scene/ryan-head-card2.webp?v=155'),
    loadImage('assets/desk-scene/ryan-head-card3.webp?v=155'),
    loadFlowAtlasTexture('assets/desk-scene/flow-atlas.bin?v=155')
  ])
    .then(([bgImg, catImg, neckBedImg, bodyImg, headRestImg, headC0Img, headC1Img, headC2Img, headC3Img, flowAtlasTex]) => {
      bgImage = bgImg;
      catImage = catImg;

      neckBedMat.map = makeTexture(neckBedImg, maxAniso);
      neckBedMat.needsUpdate = true;
      neckBedMesh.visible = true;

      bodyMat.map = makeTexture(bodyImg, maxAniso);
      bodyMat.needsUpdate = true;
      bodyMesh.visible = true;
      chinShadowMesh.visible = true;

      headTextures = {
        rest: makeTexture(headRestImg, maxAniso),
        0: makeTexture(headC0Img, maxAniso),
        1: makeTexture(headC1Img, maxAniso),
        2: makeTexture(headC2Img, maxAniso),
        3: makeTexture(headC3Img, maxAniso)
      };

      headShaderMat.uniforms.uMapC0.value = headTextures[0];
      headShaderMat.uniforms.uMapC1.value = headTextures[1];
      headShaderMat.uniforms.uMapRest.value = headTextures.rest;
      headShaderMat.uniforms.uMapC2.value = headTextures[2];
      headShaderMat.uniforms.uMapC3.value = headTextures[3];
      headShaderMat.uniforms.uFlowAtlas.value = flowAtlasTex;
      headMesh.visible = true;

      assetsReady = true;
      syncOverlaysAndResize();
      ensureRunning();
    })
    .catch(() => {
      if (typeof options.onFallback === 'function') options.onFallback();
    });

  // =========================================================================
  // 2. GEOMETRY POSITIONING & OVERLAY SYNC
  // =========================================================================
  const chinRestPos = { wx: 0, wy: 0 };

  function syncRigGeometry() {
    const neckP = sceneToWorld(NECK_BASE_PIVOT.x, NECK_BASE_PIVOT.y);
    const atlasP = sceneToWorld(HEAD_ATLAS_PIVOT.x, HEAD_ATLAS_PIVOT.y);
    const bodyP = sceneToWorld(bodyGrid.pivot.x, bodyGrid.pivot.y);
    const chinP = sceneToWorld(chinShadowGrid.pivot.x, chinShadowGrid.pivot.y);
    chinRestPos.wx = chinP.wx;
    chinRestPos.wy = chinP.wy;

    // Keep shoulders, torso, chair, and resting left hand 100% locked stationary
    upperBodyGroup.position.set(0, 0, 0);

    neckBedGroup.position.set(neckP.wx, neckP.wy, 0.0);
    headPivotGroup.position.set(atlasP.wx - neckP.wx, atlasP.wy - neckP.wy, 0.002);
    chinShadowMesh.position.set(chinP.wx, chinP.wy, 0.004);
    bodyMesh.position.set(bodyP.wx, bodyP.wy, 0.005);

    const updateGridVerts = (grid, pivW) => {
      const pos = grid.geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const w = sceneToWorld(grid.baseSX[i], grid.baseSY[i]);
        const lx = w.wx - pivW.wx;
        const ly = w.wy - pivW.wy;
        pos.setXYZ(i, lx, ly, grid.reliefZ[i]);
      }
      pos.needsUpdate = true;
    };

    updateGridVerts(neckBedGrid, neckP);
    updateGridVerts(headGrid, atlasP);
    updateGridVerts(chinShadowGrid, chinP);
    updateGridVerts(bodyGrid, bodyP);
  }

  function renderBackgroundPlate() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    if (!bgImage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bgCtx.imageSmoothingEnabled = true;
    bgCtx.imageSmoothingQuality = 'high';
    bgCtx.drawImage(
      bgImage,
      drawX * dpr,
      drawY * dpr,
      drawW * dpr,
      drawH * dpr
    );
  }

  function syncOverlaysAndResize() {
    const rect = container.getBoundingClientRect();
    viewW = Math.max(320, Math.round(rect.width));
    viewH = Math.max(260, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    bgCanvas.width = viewW * dpr;
    bgCanvas.height = viewH * dpr;
    renderer.setSize(viewW, viewH, false);

    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();

    // Scale the entire studio scene so outer oak desk width matches the 720px CLI bar
    const DESK_WIDTH_IN_SCENE = 936;
    const targetDeskW = Math.min(720, Math.max(280, viewW - 24));
    const scale = targetDeskW / DESK_WIDTH_IN_SCENE;
    drawW = SCENE_W * scale;
    drawH = SCENE_H * scale;
    drawX = (viewW - drawW) * 0.5;
    // Restore original baseline desk & model position (+130px desktop offset below viewport bottom)
    drawY = window.innerWidth >= 1024 ? viewH - drawH + 130 : Math.max(0, viewH - drawH);

    // Position .desk-scene__stage to exact rendered scene image bounds so all children scale strictly as scene %
    container.style.setProperty('--stage-left', `${((drawX / viewW) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-top', `${((drawY / viewH) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-width', `${((drawW / viewW) * 100).toFixed(4)}%`);
    container.style.setProperty('--stage-height', `${((drawH / viewH) * 100).toFixed(4)}%`);

    // Position #desk-monitor-screen & #desk-steam purely as percentages of the 1480x1180 scene image
    container.style.setProperty('--mon-left', `${((MON_RECT.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-top', `${((MON_RECT.y / SCENE_H) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-width', `${((MON_RECT.w / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mon-height', `${((MON_RECT.h / SCENE_H) * 100).toFixed(4)}%`);

    container.style.setProperty('--mug-left', `${((MUG_POS.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--mug-top', `${((MUG_POS.y / SCENE_H) * 100).toFixed(4)}%`);

    container.style.setProperty('--cat-left', `${((CAT_POS.x / SCENE_W) * 100).toFixed(4)}%`);
    container.style.setProperty('--cat-top', `${((CAT_POS.y / SCENE_H) * 100).toFixed(4)}%`);

    // Align wall-to-floor boundary and floor shadows to the exact vertical center of the AI search bar
    const omnibarEl = document.querySelector('.home-omnibar-section');
    if (omnibarEl) {
      const obRect = omnibarEl.getBoundingClientRect();
      if (obRect.height > 0) {
        const floorCenterY = (obRect.top + obRect.bottom) * 0.5;
        document.documentElement.style.setProperty('--floor-center-y', `${floorCenterY.toFixed(1)}px`);
      }
    }

    renderBackgroundPlate();
    syncRigGeometry();
    applyPoseAtTime(performance.now());
    renderer.render(fgScene, camera);

    if (typeof options.onMonitorSync === 'function') {
      options.onMonitorSync();
    }
  }

  // =========================================================================
  // 3. LAYERED CRITICAL-SPRING ANATOMY + BIDIRECTIONAL OPTICAL FLOW SWEEP
  //    3 coupled sub-stepped 2nd-order springs (zero velocity discontinuity across sweeps):
  //    - neckSpring  (w=15.2, z=0.96): initiates turn at base cervical joint (38% rotation)
  //    - headSpring  (w=12.6, z=0.94): drives optical-flow uAngle + cranial atlas turn (62%)
  //    - crownSpring (w=10.2, z=0.90): secondary hair-crown & chin-shadow follow-through
  //    Targets: Card 0 (-1.0, -8deg) <-> Card 1 (-0.48, -4.3deg) <-> Rest (0) <-> Card 2 (+0.48) <-> Card 3 (+1.0)
  // =========================================================================
  const CARD_ANGLE_TARGETS = {
    rest: 0.0,
    0: -1.0,
    1: -0.48,
    2: 0.48,
    3: 1.0
  };

  // Natural micro-tilt complements the 5 real optical-flow-morphed poses without swinging a flat cutout sideways
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

  // Smooth critically-damped springs for fluid, organic head & neck turn without bounce or snap
  const neckSpring = makeSpring(10.5, 1.0);
  const headSpring = makeSpring(9.2, 1.0);
  const crownSpring = makeSpring(8.4, 1.0);
  let lastPhysicsTime = performance.now();

  let isPaused = false;
  let prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rafId = null;

  function applyPoseAtTime(now) {
    const rawDt = Math.max(0, Math.min(0.05, (now - lastPhysicsTime) / 1000));
    lastPhysicsTime = now;

    if (prefersReducedMotion || window.innerWidth < 1024) {
      neckSpring.pos = neckSpring.vel = neckSpring.target = 0;
      headSpring.pos = headSpring.vel = headSpring.target = 0;
      crownSpring.pos = crownSpring.vel = crownSpring.target = 0;
    } else if (rawDt > 0) {
      const steps = Math.max(1, Math.ceil(rawDt / 0.004));
      const dt = rawDt / steps;
      for (let s = 0; s < steps; s++) {
        stepSpring(neckSpring, dt);
        stepSpring(headSpring, dt);
        crownSpring.target = headSpring.pos;
        stepSpring(crownSpring, dt);
      }
    }

    const neckEuler = angleToEuler(neckSpring.pos);
    const headEuler = angleToEuler(headSpring.pos);

    headShaderMat.uniforms.uAngle.value = headSpring.pos;
    headShaderMat.uniforms.uCrownLag.value = crownSpring.pos - headSpring.pos;

    if (assetsReady) {
      // Layer 1 (lower neck hinge): 38% turn led by neckSpring
      neckBedGroup.rotation.set(
        neckEuler.pitch * 0.38,
        neckEuler.yaw * 0.38,
        neckEuler.roll * 0.38
      );
      // Layer 2 (cranial dome atop C1 atlas): residual 62% so cumulative skull reaches full target angle
      headPivotGroup.rotation.set(
        headEuler.pitch - neckEuler.pitch * 0.38,
        headEuler.yaw - neckEuler.yaw * 0.38,
        headEuler.roll - neckEuler.roll * 0.38
      );
      // Layer 3 (soft dynamic chin contact AO shadow over resting knuckles)
      chinShadowMesh.position.set(
        chinRestPos.wx + crownSpring.pos * 0.0045,
        chinRestPos.wy - Math.abs(crownSpring.pos) * 0.0012,
        0.004
      );
      chinShadowMat.opacity = 0.45 - Math.abs(headSpring.pos) * 0.08;
    }

    renderCatFrame(now);
  }

  // Natural snoozing ribcage breathing (~4.3s cycle) + subtle pointed-ear twitch (~9.6s) on dedicated CSS-filtered canvas
  function renderCatFrame(now) {
    if (!catCanvas || !catCtx || !catImage) return;
    const CW = catCanvas.width;
    const CH = catCanvas.height;
    const CROP_X = 668; // 334 * 2
    const CROP_Y = 1380; // 690 * 2
    const BASE_PAW_Y = 152; // keeps paws/belly anchored flat on desktop shadow (y >= 766)

    catCtx.clearRect(0, 0, CW, CH);
    catCtx.imageSmoothingEnabled = true;
    catCtx.imageSmoothingQuality = 'high';

    if (prefersReducedMotion || isPaused) {
      catCtx.drawImage(catImage, CROP_X, CROP_Y, CW, CH, 0, 0, CW, CH);
      return;
    }

    const cycle = (now % 4300) / 4300;
    const breathe = cycle < 0.38
      ? 0.5 - 0.5 * Math.cos((Math.PI * cycle) / 0.38)
      : 0.5 + 0.5 * Math.cos((Math.PI * (cycle - 0.38)) / 0.62);

    const earCycle = (now % 9600) / 320;
    const earFlick = earCycle < 1.0 ? Math.sin(earCycle * Math.PI * 2) * (1.0 - earCycle) * 6.5 : 0;

    // 1. Pinned resting lower body & paws (zero lift off shadow)
    catCtx.drawImage(catImage, CROP_X, CROP_Y + BASE_PAW_Y, CW, CH - BASE_PAW_Y, 0, BASE_PAW_Y, CW, CH - BASE_PAW_Y);

    // 2. Smooth 2px vertical strips for ribcage rise/fall + ear twitch
    for (let dx = 0; dx < CW; dx += 2) {
      const sx = 334 + dx * 0.5;
      const ribDist = (sx - 418) / 48;
      const ribW = Math.exp(-(ribDist * ribDist));
      const earDist = (sx - 533) / 11;
      const earW = Math.exp(-(earDist * earDist));
      const lift = breathe * 8.5 * ribW + earFlick * earW;
      catCtx.drawImage(
        catImage,
        CROP_X + dx,
        CROP_Y,
        2,
        BASE_PAW_Y,
        dx,
        -lift,
        2,
        BASE_PAW_Y + lift
      );
    }
  }

  function tick(now) {
    if (isPaused) {
      rafId = null;
      return;
    }
    applyPoseAtTime(now);
    renderer.render(fgScene, camera);
    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function ensureRunning() {
    if (isPaused) return;
    if (prefersReducedMotion) {
      applyPoseAtTime(performance.now());
      renderer.render(fgScene, camera);
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
    const nextAngle = CARD_ANGLE_TARGETS[normKey];
    neckSpring.target = nextAngle;
    headSpring.target = nextAngle;
    ensureRunning();
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
    applyPoseAtTime(performance.now());
    renderer.render(fgScene, camera);
    if (!prefersReducedMotion) ensureRunning();
  }

  syncOverlaysAndResize();
  ensureRunning();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(syncOverlaysAndResize);
  });

  return {
    setCardTarget,
    setPaused,
    setReducedMotion,
    syncOverlaysAndResize
  };
}
