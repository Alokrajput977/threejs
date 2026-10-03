import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { addBox, mesh, scaleUV } from '../helpers.js';
import { HALL } from './warehouse.js';
import { buildHallRooms, PIT } from './hallRooms.js';

/*
 * TRAINING HALL – ANDAR KA VIEW
 *  - Safed insulated ceiling + peeli (yellow) arched steel trusses + purlins
 *  - Ridge par light strip, hanging high-bay lamps, 8 interior lights
 *  - Maple wood sprung floor
 *  - Gymnastics equipment: floor exercise carpet, vault, balance beams,
 *    uneven bars, rings, pommel horse, parallel bars, trampoline, bleachers
 *  - Front block (hallRooms.js): reception, manager room + cabin, owner room,
 *    2 staircases, first floor 2 rooms, second floor girls/boys toilets,
 *    5 ft deep foam pit + tumbling track
 *  - LEFT (west) aur RIGHT (east) wall par 4-4 bade gymnastics murals
 *  - Peeche ki wall par LED board, trusses se latakte banners
 * Interior pehli baar andar jaane par hi banta hai (lazy) – load fast rehta hai.
 */

const T = 0.3; // wall thickness (warehouse.js jaisa)
const D2R = Math.PI / 180;

export function hallDims() {
  const { width: W, length: L, floorH: F, floors, roofRise: rise, podium: PH, centerZ } = HALL;
  const H = F * floors;
  const a = W / 2 + 0.6;
  const Rr = (a * a + rise * rise) / (2 * rise);
  const cy = H + rise - Rr;
  const floorY = CONFIG.plinthHeight + PH;
  return { W, L, H, F, Rr, cy, floorY, centerZ };
}

/* ================= Lights (startup par bante hain, intensity 0) ================= */
export function createInteriorLights() {
  const d = hallDims();
  const g = new THREE.Group();
  g.name = 'hall-interior-lights';
  g.position.set(0, d.floorY, d.centerZ);
  const lights = [];
  [-28, -9.5, 9.5, 28].forEach((x) => {
    [-12, 12].forEach((z) => {
      const l = new THREE.PointLight('#fff3e0', 0, 50, 2);
      l.position.set(x, d.H - 2.4, z);
      g.add(l);
      lights.push(l);
    });
  });
  // Front block (manager/owner, first floor, toilets) – har floor par ek light
  [3.0, 6.5, 10.0].forEach((y) => {
    const l = new THREE.PointLight('#fff1dc', 0, 20, 2);
    l.position.set(24, y, 24);
    l.userData.blockLight = true;
    g.add(l);
    lights.push(l);
  });
  return {
    group: g,
    setOn(on) {
      lights.forEach((l) => {
        l.intensity = on ? (l.userData.blockLight ? 35 : 140) : 0;
      });
    },
  };
}

/* ================= Canvas helpers ================= */
function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const r = (a, b) => a + Math.random() * (b - a);

// Maple wood planks – 1 tile = 2 m
const woodTex = () => canvasTex(512, 512, (ctx, w, h) => {
  const rows = 8;
  const rh = h / rows;
  const tones = ['#d8b88a', '#cfae7f', '#e0c295', '#d3b285', '#c9a676', '#dcbd8f'];
  for (let i = 0; i < rows; i++) {
    let x = -r(0, 200);
    while (x < w) {
      const len = r(170, 420);
      ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
      ctx.fillRect(x, i * rh, len, rh);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = `rgba(120,80,40,${r(0.04, 0.12)})`;
        ctx.lineWidth = r(0.5, 1.6);
        const yy = i * rh + r(3, rh - 3);
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.bezierCurveTo(x + len * 0.3, yy + r(-3, 3), x + len * 0.7, yy + r(-3, 3), x + len, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(70,45,20,0.45)';
      ctx.fillRect(x, i * rh, 2, rh);
      x += len;
    }
    ctx.fillStyle = 'rgba(70,45,20,0.4)';
    ctx.fillRect(0, i * rh, w, 2);
  }
});

// Carpet / vinyl – safed noise, material color se tint
const fabricTex = () => canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
});

// Ceiling panels – har 1 m par joint
const ceilingTex = () => canvasTex(64, 256, (ctx, w, h) => {
  ctx.fillStyle = '#f3f4f5';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 0, w, 3);
  for (let y = 16; y < h; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    ctx.fillRect(0, y, w, 1);
  }
});

const shutterTex = () => canvasTex(64, 128, (ctx, w, h) => {
  ctx.fillStyle = '#c3c8cd';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(0, y + 2, w, 2);
  }
});

const blobTex = () => canvasTex(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}, { srgb: false, repeat: false });

/* ================= Gymnast figure (murals + logo) ================= */
const POSES = {
  leap: { t: -85, la1: -130, la2: -140, ra1: -50, ra2: -40, ll1: 178, ll2: 182, rl1: -8, rl2: -4 },
  handstand: { t: 90, la1: 96, la2: 92, ra1: 84, ra2: 88, ll1: -100, ll2: -112, rl1: -80, rl2: -62 },
  arabesque: { t: -62, la1: -20, la2: -12, ra1: -165, ra2: -170, rl1: 92, rl2: 90, ll1: -165, ll2: -150 },
  ribbon: { t: -98, la1: -112, la2: -118, ra1: -35, ra2: -20, rl1: 95, rl2: 93, ll1: 72, ll2: 110 },
  cross: { t: -90, la1: 180, la2: 180, ra1: 0, ra2: 0, ll1: 90, ll2: 90, rl1: 88, rl2: 90 },
  vault: { t: -15, la1: -20, la2: -18, ra1: -10, ra2: -8, ll1: 168, ll2: 170, rl1: 163, rl2: 166 },
  bridge: { t: 150, la1: 100, la2: 95, ra1: 110, ra2: 100, ll1: 70, ll2: 100, rl1: -60, rl2: -65 },
  cartwheel: { t: 85, la1: 125, la2: 125, ra1: 55, ra2: 55, ll1: -130, ll2: -132, rl1: -50, rl2: -48 },
};

function joints(pose, x, y, s) {
  const v = (a, l) => [Math.cos(a * D2R) * l * s, Math.sin(a * D2R) * l * s];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const hip = [x, y];
  const neck = add(hip, v(pose.t, 170));
  const head = add(neck, v(pose.t, 62));
  const lE = add(neck, v(pose.la1, 105));
  const lH = add(lE, v(pose.la2, 95));
  const rE = add(neck, v(pose.ra1, 105));
  const rH = add(rE, v(pose.ra2, 95));
  const lK = add(hip, v(pose.ll1, 140));
  const lF = add(lK, v(pose.ll2, 130));
  const lT = add(lF, v(pose.ll2, 26));
  const rK = add(hip, v(pose.rl1, 140));
  const rF = add(rK, v(pose.rl2, 130));
  const rT = add(rF, v(pose.rl2, 26));
  const bun = add(head, v(pose.t + 90, 30));
  return { hip, neck, head, lE, lH, rE, rH, lK, lF, lT, rK, rF, rT, bun };
}

function drawFigure(ctx, J, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (pts, w) => {
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };
  line([J.hip, J.lK, J.lF], 32);
  line([J.lF, J.lT], 16);
  line([J.neck, J.lE, J.lH], 24);
  line([J.hip, J.neck], 50);
  line([J.hip, J.rK, J.rF], 32);
  line([J.rF, J.rT], 16);
  line([J.neck, J.rE, J.rH], 24);
  ctx.beginPath();
  ctx.arc(J.head[0], J.head[1], 31 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(J.bun[0], J.bun[1], 14 * s, 0, Math.PI * 2);
  ctx.fill();
}

const MURALS = {
  west: [
    { pose: 'leap', word: 'LEAP', colors: ['#2a1457', '#8e2a8f', '#ff6fa8'], hip: [1230, 640], trail: true },
    { pose: 'arabesque', word: 'BALANCE', colors: ['#0b3346', '#13798a', '#5fd3c4'], hip: [1250, 600], prop: 'beam' },
    { pose: 'handstand', word: 'STRENGTH', colors: ['#4a1010', '#c2410c', '#fbbf24'], hip: [1250, 520], prop: 'floor' },
    { pose: 'ribbon', word: 'GRACE', colors: ['#17154f', '#4338ca', '#c4b5fd'], hip: [1230, 590], prop: 'ribbon' },
  ],
  east: [
    { pose: 'cross', word: 'POWER', colors: ['#0a1f44', '#1d4ed8', '#38bdf8'], hip: [1250, 620], prop: 'rings' },
    { pose: 'vault', word: 'FLIGHT', colors: ['#3b0a0a', '#dc2626', '#fb923c'], hip: [1150, 470], prop: 'vault', trail: true },
    { pose: 'bridge', word: 'FLEXIBILITY', colors: ['#06302b', '#0f766e', '#86efac'], hip: [1180, 560], prop: 'floor' },
    { pose: 'cartwheel', word: 'COURAGE', colors: ['#4a044e', '#c026d3', '#fde047'], hip: [1220, 560], prop: 'floor', trail: true },
  ],
};

function muralTexture(def) {
  const W = 2048;
  const H = 1120;
  const S = 0.75; // 1536 x 840 canvas
  return canvasTex(W * S, H * S, (ctx) => {
    ctx.scale(S, S);
    const [c0, c1, c2] = def.colors;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, c0);
    bg.addColorStop(0.55, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const s = 1.25;
    const J = joints(POSES[def.pose], def.hip[0], def.hip[1], s);

    // Glow + rings
    const glow = ctx.createRadialGradient(def.hip[0], def.hip[1] - 100, 20, def.hip[0], def.hip[1] - 100, 560);
    glow.addColorStop(0, 'rgba(255,255,255,0.32)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 6;
    [300, 420, 540].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(def.hip[0], def.hip[1] - 100, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Speed stripes
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 7; i++) {
      const x = -300 + i * 170;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + 70, H);
      ctx.lineTo(x + 620, 0);
      ctx.lineTo(x + 550, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Halftone dots (top-left)
    for (let gx = 0; gx < 14; gx++) {
      for (let gy = 0; gy < 8; gy++) {
        const rad = Math.max(0, 11 - (gx + gy) * 0.75);
        if (rad <= 0.5) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(80 + gx * 38, 80 + gy * 38, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Big background word
    ctx.font = '900 300px "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillText(def.word, 60, H - 70, 1500);

    // Props
    const maxY = Math.max(J.lH[1], J.rH[1], J.lT[1], J.rT[1], J.head[1]) + 40 * s;
    if (def.prop === 'beam') {
      const top = Math.max(J.lT[1], J.rT[1]) + 6;
      ctx.fillStyle = '#e8c9a0';
      ctx.fillRect(def.hip[0] - 560, top, 1120, 34);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      [-420, 420].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(def.hip[0] + dx - 10, top + 34);
        ctx.lineTo(def.hip[0] + dx + 10, top + 34);
        ctx.lineTo(def.hip[0] + dx + 40, H);
        ctx.lineTo(def.hip[0] + dx - 40, H);
        ctx.fill();
      });
    }
    if (def.prop === 'floor') {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(140, Math.min(H - 40, maxY), W - 280, 10);
    }
    if (def.prop === 'rings') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      [J.lH, J.rH].forEach((h) => {
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(h[0], 0);
        ctx.lineTo(h[0], h[1] - 34);
        ctx.stroke();
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(h[0], h[1], 32, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    if (def.prop === 'vault') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(820, 830, 170, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(805, 860, 30, 220);
      ctx.fillRect(700, 1060, 240, 24);
    }
    if (def.prop === 'ribbon') {
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(J.rH[0], J.rH[1]);
      ctx.bezierCurveTo(J.rH[0] + 420, J.rH[1] - 120, J.rH[0] + 380, J.rH[1] + 260, J.rH[0] + 180, J.rH[1] + 300);
      ctx.bezierCurveTo(J.rH[0] - 20, J.rH[1] + 340, J.rH[0] + 120, J.rH[1] + 600, J.rH[0] + 460, J.rH[1] + 640);
      ctx.stroke();
    }

    // Motion trail
    if (def.trail) {
      [3, 2, 1].forEach((k) => {
        ctx.globalAlpha = 0.07 * (4 - k);
        const G = joints(POSES[def.pose], def.hip[0] - 120 * k, def.hip[1] + 18 * k, s);
        drawFigure(ctx, G, s, '#ffffff');
      });
      ctx.globalAlpha = 1;
    }

    // Main figure
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    drawFigure(ctx, J, s, '#ffffff');
    ctx.shadowColor = 'transparent';

    // Label
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 92px "Arial Black", Arial, sans-serif';
    ctx.fillText(def.word, W - 90, 150, 760);
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(W - 90 - 360, 176, 360, 9);
    ctx.font = '700 40px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Gymnastics Academy', W - 90, 238);

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, W - 60, H - 60);
  }, { repeat: false });
}

const emblemTex = () => canvasTex(512, 512, (ctx, w) => {
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = '#5a2483';
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(256, 256, 222, 0, Math.PI * 2);
  ctx.stroke();
  drawFigure(ctx, joints(POSES.leap, 256, 300, 0.62), 0.62, '#ffffff');
}, { repeat: false });

const ledTex = () => canvasTex(1024, 224, (ctx, w, h) => {
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd84a';
  ctx.font = '900 84px "Arial Black", Arial, sans-serif';
  ctx.fillText('GYMNASTICS ACADEMY', w / 2, 82, 960);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 44px Arial, sans-serif';
  ctx.fillText('TRAIN HARD  •  FLY HIGH', w / 2, 168, 900);
  // LED dot grid
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
}, { repeat: false });

const bannerTex = (bg, accent) => canvasTex(256, 640, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, bg);
  g.addColorStop(1, '#0e1430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 70, w, 16);
  ctx.fillRect(0, h - 120, w, 10);
  drawFigure(ctx, joints(POSES.leap, 128, 330, 0.4), 0.4, '#ffffff');
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, h - 60);
  ctx.lineTo(w / 2, h);
  ctx.lineTo(w, h - 60);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}, { repeat: false });

/* ================= Geometry helpers ================= */
function arcBand(cy, rIn, rOut, halfX, depth) {
  const rm = (rIn + rOut) / 2;
  const a0 = Math.acos(Math.min(1, halfX / rm));
  const s = new THREE.Shape();
  s.absarc(0, cy, rOut, a0, Math.PI - a0, false);
  s.absarc(0, cy, rIn, Math.PI - a0, a0, true);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 64 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

const UP = new THREE.Vector3(0, 1, 0);
function rodGeo(a, b, rad = 0.04, seg = 6) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(rad, rad, len, seg).toNonIndexed();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

function plane(w, d, mat, x, y, z, { tile = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(w, d);
  if (tile) scaleUV(geo, w / tile, d / tile);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

/* ================= Main builder ================= */
export function buildInterior(mats, collector) {
  const { W, L, H, Rr, cy, floorY, centerZ } = hallDims();
  const g = new THREE.Group();
  g.name = 'hall-interior';
  g.position.set(0, floorY, centerZ);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const fab = fabricTex();
  const M = {
    wood: std({ map: woodTex(), color: '#e8dccb', roughness: 0.42, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    carpetBlue: std({ map: fab, color: '#2457b8', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    carpetRed: std({ map: fab, color: '#c62828', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    lineWhite: std({ color: '#f7f7f7', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    lineYellow: std({ color: '#f2c230', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    matBlue: std({ map: fab, color: '#1f4fa8', roughness: 0.55 }),
    matRed: std({ map: fab, color: '#c0392b', roughness: 0.55 }),
    matYellow: std({ color: '#f2c230', roughness: 0.55 }),
    suede: std({ map: fab, color: '#d1ab80', roughness: 0.9 }),
    chrome: std({ color: '#dfe3e7', metalness: 1, roughness: 0.18 }),
    steelDark: std({ color: '#2b3036', metalness: 0.6, roughness: 0.4 }),
    leather: std({ color: '#6b3a1e', roughness: 0.5 }),
    woodBar: std({ color: '#d8b07a', roughness: 0.5 }),
    tramBed: std({ color: '#121212', roughness: 0.8 }),
    foam: std({ color: '#ffffff', roughness: 0.95 }),
    truss: std({ color: '#f2c230', metalness: 0.45, roughness: 0.38 }),
    lining: std({ map: mats.pillar.map, color: '#dedad2', roughness: 0.92 }),
    liningNavy: std({ map: mats.pillar.map, color: '#22325a', roughness: 0.85 }),
    ceiling: std({ map: ceilingTex(), color: '#e4e6e8', roughness: 0.85, side: THREE.BackSide }),
    glow: std({ color: '#ffffff', emissive: '#fff6e5', emissiveIntensity: 1.1 }),
    shade: std({ color: '#2a2e33', metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }),
    lampDisc: std({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 2.2 }),
    frame: std({ color: '#1d2229', metalness: 0.4, roughness: 0.5 }),
    shutter: std({ map: shutterTex(), metalness: 0.5, roughness: 0.45 }),
    door: std({ color: '#6f7780', metalness: 0.5, roughness: 0.4 }),
    exit: std({ color: '#0f8a3c', emissive: '#22ff77', emissiveIntensity: 0.6 }),
    seatTier: std({ map: mats.concrete.map, color: '#9aa0a6', roughness: 0.85 }),
    seat: std({ color: '#ffffff', roughness: 0.55 }),
    counter: std({ color: '#f5f5f2', roughness: 0.4 }),
    purple: std({ color: '#5a2483', roughness: 0.45 }),
    blob: new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.7 }),
    led: std({ map: ledTex(), emissive: '#ffffff', emissiveIntensity: 1.0, roughness: 0.4 }),
    emblem: std({ map: emblemTex(), transparent: true, alphaTest: 0.1, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }),
  };
  M.led.emissiveMap = M.led.map;
  Object.values(M).forEach((m) => collector.ownMaterials.push(m));

  const blob = (w, d, x, z) => {
    const p = plane(w, d, M.blob, x, 0.055, z);
    p.receiveShadow = false;
    p.renderOrder = 1;
    g.add(p);
  };

  const Lin = L - 2 * T;
  const Win = W - 2 * T;

  /* ---------- Floor ---------- */
  // Pit wale kone mein floor mein chhed (5 ft foam pit)
  const fx0 = -Win / 2;
  const fx1 = Win / 2;
  const fz0 = -Lin / 2;
  const fz1 = Lin / 2;
  const floorRect = (x0, x1, z0, z1) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2, -pos.getZ(i) / 2);
    const m = new THREE.Mesh(geo, M.wood);
    m.position.y = 0.012;
    m.receiveShadow = true;
    g.add(m);
  };
  floorRect(fx0, fx1, fz0, PIT.z0);
  floorRect(PIT.x1, fx1, PIT.z0, fz1);

  /* ---------- Wall lining (navy dado + white) ---------- */
  const lineWall = (len, cx, cz, alongX) => {
    const box = (h, y, mat, th = 0.06) =>
      alongX ? addBox(g, len, h, th, mat, cx, y, cz, { cast: false }) : addBox(g, th, h, len, mat, cx, y, cz, { cast: false });
    box(1.2, 0.6, M.liningNavy);
    box(0.08, 1.24, M.matYellow, 0.08);
    box(7.0 - 1.28, 1.28 + (7.0 - 1.28) / 2, M.lining);
    box(H - 9.0, 9.0 + (H - 9.0) / 2, M.lining);
  };
  [-1, 1].forEach((s) => lineWall(Lin, s * (W / 2 - T - 0.03), 0, false));
  const frontLen = W / 2 - T - 9;
  [-1, 1].forEach((s) => lineWall(frontLen, s * (9 + frontLen / 2), L / 2 - T - 0.03, true));
  lineWall(Win, 0, -(L / 2 - T - 0.03), true);

  // Rear shutters (andar se)
  [-10, 0, 10].forEach((x) => {
    addBox(g, 4.6, 4.8, 0.05, M.shutter, x, 2.4, -(L / 2 - T - 0.09), { cast: false });
    addBox(g, 4.9, 0.18, 0.12, M.frame, x, 4.85, -(L / 2 - T - 0.1), { cast: false });
  });

  // Side fire exits
  [-1, 1].forEach((s) => {
    const x = s * (W / 2 - T - 0.08);
    addBox(g, 0.05, 2.3, 1.1, M.door, x, 1.15, 0, { cast: false });
    addBox(g, 0.08, 0.1, 1.3, M.frame, x, 2.35, 0, { cast: false });
    addBox(g, 0.06, 0.28, 0.7, M.exit, x - s * 0.02, 2.75, 0, { cast: false });
  });

  /* ---------- Murals: LEFT (west) + RIGHT (east) ---------- */
  const bay = L / 5;
  const muralW = 9.4;
  const muralH = 5.15;
  [['west', -1], ['east', 1]].forEach(([side, s]) => {
    let idx = 0;
    for (let j = 0; j < 5; j++) {
      if (j === 2) continue; // beech wale bay mein fire exit
      if (side === 'east' && j === 4) continue; // yahan front block (rooms) hai
      const def = MURALS[side][idx++];
      const z = -L / 2 + (j + 0.5) * bay;
      const x = s * (W / 2 - T - 0.075);
      const mat = std({ map: muralTexture(def), roughness: 0.75 });
      collector.ownMaterials.push(mat);
      const mural = new THREE.Mesh(new THREE.PlaneGeometry(muralW, muralH), mat);
      mural.position.set(x, 3.95, z);
      mural.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(mural);
      // Frame
      const fx = x - s * 0.01;
      addBox(g, 0.08, 0.12, muralW + 0.24, M.frame, fx, 3.95 + muralH / 2 + 0.06, z, { cast: false });
      addBox(g, 0.08, 0.12, muralW + 0.24, M.frame, fx, 3.95 - muralH / 2 - 0.06, z, { cast: false });
      addBox(g, 0.08, muralH, 0.12, M.frame, fx, 3.95, z - muralW / 2 - 0.06, { cast: false });
      addBox(g, 0.08, muralH, 0.12, M.frame, fx, 3.95, z + muralW / 2 + 0.06, { cast: false });
      // Picture lights
      [-3, 0, 3].forEach((dz) => {
        addBox(g, 0.5, 0.08, 0.12, M.frame, x - s * 0.25, 6.85, z + dz, { cast: false });
        addBox(g, 0.02, 0.04, 0.1, M.lampDisc, x - s * 0.45, 6.8, z + dz, { cast: false });
      });
    }
  });

  // 4th right-side mural (COURAGE) – peeche ki wall par, east bleachers ke upar
  {
    const def = MURALS.east[3];
    const mat = std({ map: muralTexture(def), roughness: 0.75 });
    collector.ownMaterials.push(mat);
    const w = 8;
    const h = (w * muralH) / muralW;
    const z = -(L / 2 - T - 0.075);
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mural.position.set(23.25, 2.55 + h / 2, z);
    g.add(mural);
    addBox(g, w + 0.24, 0.12, 0.08, M.frame, 23.25, 2.55 + h + 0.06, z + 0.01, { cast: false });
    addBox(g, w + 0.24, 0.12, 0.08, M.frame, 23.25, 2.49, z + 0.01, { cast: false });
  }

  /* ---------- Ceiling + structure ---------- */
  const Rc = Rr - 0.35;
  const Xc = W / 2 - T;
  const phiC = Math.asin(Xc / Rc);
  const ceilGeo = new THREE.CylinderGeometry(Rc, Rc, Lin, 120, 1, true, Math.PI - phiC, phiC * 2);
  scaleUV(ceilGeo, Rc * phiC * 2, Lin);
  ceilGeo.rotateX(Math.PI / 2);
  const ceiling = mesh(ceilGeo, M.ceiling, { cast: false });
  ceiling.position.y = cy;
  g.add(ceiling);

  // Ridge light strip (skylight feel)
  addBox(g, 1.4, 0.05, L - 8, M.glow, 0, cy + Rc - 0.05, 0, { cast: false });

  // Purlins
  {
    const geos = [];
    for (let j = -6; j <= 6; j++) {
      if (j === 0) continue;
      const x = j * 5.8;
      const rr = Rc - 0.13;
      const th = Math.asin(x / rr);
      const y = cy + Math.sqrt(rr * rr - x * x);
      const b = new THREE.BoxGeometry(0.12, 0.22, Lin - 0.2);
      b.rotateZ(-th);
      b.translate(x, y, 0);
      geos.push(b);
    }
    g.add(mesh(mergeGeometries(geos), M.steelDark, { cast: false }));
  }

  // Arched trusses (4) + inside columns
  const Rt = Rc - 0.25;
  const Rb = Rt - 1.3;
  const Xs = W / 2 - T - 0.3;
  const yAt = (R, x) => cy + Math.sqrt(R * R - x * x);
  {
    const geos = [];
    const N = 48;
    for (let i = 1; i <= 4; i++) {
      const z = -L / 2 + i * bay;
      const top = arcBand(cy, Rt - 0.08, Rt + 0.08, Xs, 0.24);
      top.translate(0, 0, z);
      const bot = arcBand(cy, Rb - 0.08, Rb + 0.08, Xs, 0.24);
      bot.translate(0, 0, z);
      geos.push(top, bot);
      for (let k = 0; k <= N; k++) {
        const x = -Xs + (k * 2 * Xs) / N;
        const pb = new THREE.Vector3(x, yAt(Rb, x), z);
        const pt = new THREE.Vector3(x, yAt(Rt, x), z);
        geos.push(rodGeo(pb, pt, 0.04));
        if (k < N) {
          const x2 = -Xs + ((k + 1) * 2 * Xs) / N;
          const a = k % 2 === 0 ? pb : pt;
          const b = k % 2 === 0
            ? new THREE.Vector3(x2, yAt(Rt, x2), z)
            : new THREE.Vector3(x2, yAt(Rb, x2), z);
          geos.push(rodGeo(a, b, 0.04));
        }
      }
      // Columns (I-beam) dono walls par
      const colH = yAt(Rt, Xs);
      [-1, 1].forEach((s) => {
        const x = s * Xs;
        [-0.17, 0.17].forEach((dx) => {
          const f = new THREE.BoxGeometry(0.05, colH, 0.4).toNonIndexed();
          f.translate(x + dx, colH / 2, z);
          geos.push(f);
        });
        const web = new THREE.BoxGeometry(0.34, colH, 0.05).toNonIndexed();
        web.translate(x, colH / 2, z);
        geos.push(web);
      });
    }
    const merged = mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)));
    g.add(mesh(merged, M.truss, { cast: false }));
  }

  // High-bay lamps (instanced)
  {
    const pos = [];
    for (let i = 1; i <= 4; i++) {
      const z = -L / 2 + i * bay;
      [-28, -14, 0, 14, 28].forEach((x) => pos.push([x, yAt(Rb, x), z + 0.35]));
    }
    const shadeGeo = new THREE.CylinderGeometry(0.16, 0.45, 0.42, 20, 1, true);
    const discGeo = new THREE.CircleGeometry(0.42, 20);
    discGeo.rotateX(Math.PI / 2);
    const cableGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4);
    const shades = new THREE.InstancedMesh(shadeGeo, M.shade, pos.length);
    const discs = new THREE.InstancedMesh(discGeo, M.lampDisc, pos.length);
    const cables = new THREE.InstancedMesh(cableGeo, M.steelDark, pos.length);
    const d = new THREE.Object3D();
    pos.forEach(([x, yb, z], i) => {
      const drop = 1.1;
      d.position.set(x, yb - drop, z);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      shades.setMatrixAt(i, d.matrix);
      d.position.set(x, yb - drop - 0.2, z);
      d.updateMatrix();
      discs.setMatrixAt(i, d.matrix);
      d.position.set(x, yb - drop / 2 + 0.1, z);
      d.scale.set(1, drop, 1);
      d.updateMatrix();
      cables.setMatrixAt(i, d.matrix);
    });
    g.add(shades, discs, cables);
  }

  // Hanging banners
  {
    const bTex = [bannerTex('#5a2483', '#ffd84a'), bannerTex('#1d4ed8', '#ffd84a')];
    const bMats = bTex.map((t) => std({ map: t, side: THREE.DoubleSide, roughness: 0.8 }));
    bMats.forEach((m) => collector.ownMaterials.push(m));
    const bGeo = new THREE.PlaneGeometry(1.4, 3.5);
    let n = 0;
    for (let i = 1; i <= 4; i++) {
      const z = -L / 2 + i * bay - 0.4;
      [-33, -21, 21, 33].forEach((x) => {
        const top = yAt(Rb, x) - 0.35;
        const b = new THREE.Mesh(bGeo, bMats[n++ % 2]);
        b.position.set(x, top - 1.75, z);
        g.add(b);
        g.add(mesh(rodGeo(new THREE.Vector3(x - 0.8, top, z), new THREE.Vector3(x + 0.8, top, z), 0.03, 8), M.steelDark, { cast: false }));
      });
    }
  }

  // LED board – peeche ki gable wall par
  addBox(g, 12.6, 3.0, 0.3, M.frame, 0, H + 1.55, -(L / 2 - T - 0.15), { cast: false });
  {
    const led = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.6), M.led);
    led.position.set(0, H + 1.55, -(L / 2 - T - 0.31));
    g.add(led);
  }

  /* ---------- Equipment ---------- */

  // 1) Floor exercise carpet (centre)
  {
    const cz = -2;
    g.add(plane(15, 15, M.carpetRed, 0, 0.03, cz, { tile: 1 }));
    g.add(plane(13.6, 13.6, M.carpetBlue, 0, 0.04, cz, { tile: 1 }));
    const half = 6;
    [[0, cz - half, 12, 0.06], [0, cz + half, 12, 0.06], [-half, cz, 0.06, 12], [half, cz, 0.06, 12]].forEach(([x, z, w, d]) => {
      g.add(plane(w, d, M.lineWhite, x, 0.05, z));
    });
    g.add(plane(3.2, 3.2, M.emblem, 0, 0.052, cz));
  }

  // 3) Vault (east): runway + springboard + table + landing mat
  {
    const z = 16;
    g.add(plane(19.5, 1.2, M.carpetBlue, 20.75, 0.03, z, { tile: 1 }));
    g.add(plane(19.5, 0.05, M.lineWhite, 20.75, 0.045, z - 0.62));
    g.add(plane(19.5, 0.05, M.lineWhite, 20.75, 0.045, z + 0.62));
    const board = addBox(g, 1.2, 0.08, 0.6, M.woodBar, 31.1, 0.16, z);
    board.rotation.z = 0.18;
    addBox(g, 0.9, 0.08, 0.6, M.steelDark, 31.1, 0.05, z);
    addBox(g, 1.0, 0.08, 0.8, M.steelDark, 32.6, 0.04, z);
    const ped = mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.0, 16), M.steelDark);
    ped.position.set(32.6, 0.58, z);
    g.add(ped);
    const top = mesh(new THREE.CapsuleGeometry(0.42, 0.45, 6, 16), M.suede);
    top.rotation.z = Math.PI / 2;
    top.scale.set(0.42, 1, 1.1);
    top.position.set(32.6, 1.2, z);
    g.add(top);
    addBox(g, 4.8, 0.4, 3.6, M.matBlue, 35.8, 0.2, z);
    addBox(g, 4.82, 0.06, 0.25, M.matYellow, 35.8, 0.41, z - 1.65);
    addBox(g, 4.82, 0.06, 0.25, M.matYellow, 35.8, 0.41, z + 1.65);
    blob(6, 5, 34.5, z);
  }

  // 5) Balance beams x3 (west)
  [-5, -9.5, -14].forEach((z) => {
    const x = -26;
    addBox(g, 7, 0.2, 2.6, M.matBlue, x, 0.1, z);
    addBox(g, 5, 0.16, 0.1, M.suede, x, 1.17, z);
    [-1.9, 1.9].forEach((dx) => {
      addBox(g, 0.08, 1.0, 0.08, M.steelDark, x + dx, 0.6, z);
      addBox(g, 0.1, 0.06, 1.0, M.steelDark, x + dx, 0.23, z);
      addBox(g, 0.3, 0.05, 0.12, M.steelDark, x + dx, 1.07, z);
    });
    blob(7.5, 3, x, z);
  });

  // 6) Uneven bars (west)
  {
    const cx = -15.5;
    const cz = -9.5;
    addBox(g, 6, 0.2, 5.5, M.matBlue, cx, 0.1, cz);
    [[-0.9, 1.7], [0.9, 2.5]].forEach(([dx, h]) => {
      const x = cx + dx;
      const bar = mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.6, 12), M.woodBar);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(x, h, cz);
      g.add(bar);
      [-1.3, 1.3].forEach((dz) => {
        g.add(mesh(rodGeo(new THREE.Vector3(x, 0.2, cz + dz), new THREE.Vector3(x, h, cz + dz), 0.05, 12), M.chrome));
        g.add(mesh(rodGeo(new THREE.Vector3(x, h - 0.05, cz + dz), new THREE.Vector3(x, 0.2, cz + dz * 2.4), 0.008, 4), M.steelDark, { cast: false }));
      });
    });
    addBox(g, 2.4, 0.08, 0.14, M.steelDark, cx, 0.24, cz - 1.3);
    addBox(g, 2.4, 0.08, 0.14, M.steelDark, cx, 0.24, cz + 1.3);
    blob(6.5, 6, cx, cz);
  }

  // 7) Rings (east)
  {
    const cx = 21;
    const cz = -10;
    const top = 5.8;
    addBox(g, 5, 0.2, 4, M.matBlue, cx, 0.1, cz);
    [cx - 2.5, cx + 2.5].forEach((x) => {
      g.add(mesh(rodGeo(new THREE.Vector3(x, 0.2, cz - 1.6), new THREE.Vector3(x, top, cz), 0.06, 10), M.chrome));
      g.add(mesh(rodGeo(new THREE.Vector3(x, 0.2, cz + 1.6), new THREE.Vector3(x, top, cz), 0.06, 10), M.chrome));
    });
    g.add(mesh(rodGeo(new THREE.Vector3(cx - 2.6, top, cz), new THREE.Vector3(cx + 2.6, top, cz), 0.07, 10), M.chrome));
    [-0.25, 0.25].forEach((dx) => {
      g.add(mesh(rodGeo(new THREE.Vector3(cx + dx, top, cz), new THREE.Vector3(cx + dx, 2.86, cz), 0.015, 4), M.steelDark, { cast: false }));
      const ring = mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 24), M.woodBar);
      ring.position.set(cx + dx, 2.76, cz);
      g.add(ring);
    });
    blob(6, 5, cx, cz);
  }

  // 8) Pommel horse (east)
  {
    const cx = 30;
    const cz = -10;
    addBox(g, 4, 0.2, 3, M.matBlue, cx, 0.1, cz);
    addBox(g, 1.6, 0.06, 0.8, M.steelDark, cx, 0.23, cz);
    const post = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 12), M.steelDark);
    post.position.set(cx, 0.68, cz);
    g.add(post);
    const body = mesh(new THREE.CapsuleGeometry(0.17, 1.3, 6, 16), M.leather);
    body.rotation.z = Math.PI / 2;
    body.position.set(cx, 1.15, cz);
    g.add(body);
    [-0.22, 0.22].forEach((dx) => {
      const p = mesh(new THREE.TorusGeometry(0.12, 0.024, 8, 16, Math.PI), M.woodBar);
      p.rotation.y = Math.PI / 2;
      p.position.set(cx + dx, 1.3, cz);
      g.add(p);
    });
    blob(3, 2, cx, cz);
  }

  // 9) Parallel bars (east)
  {
    const cx = 29;
    const cz = 3;
    addBox(g, 4.5, 0.2, 3, M.matBlue, cx, 0.1, cz);
    [-0.24, 0.24].forEach((dz) => {
      const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.5, 12), M.woodBar);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(cx, 1.95, cz + dz);
      g.add(bar);
      [-1.2, 1.2].forEach((dx) => {
        g.add(mesh(rodGeo(new THREE.Vector3(cx + dx, 0.2, cz + dz), new THREE.Vector3(cx + dx, 1.95, cz + dz), 0.04, 10), M.chrome));
      });
      addBox(g, 3.0, 0.08, 0.12, M.steelDark, cx, 0.24, cz + dz * 2);
    });
    blob(4.5, 2.5, cx, cz);
  }

  // 10) Trampoline (east)
  {
    const cx = 18.5;
    const cz = 3.5;
    const h = 1.05;
    const ow = 4.6;
    const od = 2.7;
    const pad = 0.45;
    g.add(plane(ow - 2 * pad, od - 2 * pad, M.tramBed, cx, h - 0.02, cz));
    addBox(g, ow, 0.12, pad, M.matBlue, cx, h, cz - od / 2 + pad / 2);
    addBox(g, ow, 0.12, pad, M.matBlue, cx, h, cz + od / 2 - pad / 2);
    addBox(g, pad, 0.12, od - 2 * pad, M.matBlue, cx - ow / 2 + pad / 2, h, cz);
    addBox(g, pad, 0.12, od - 2 * pad, M.matBlue, cx + ow / 2 - pad / 2, h, cz);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      addBox(g, 0.08, h - 0.06, 0.08, M.steelDark, cx + sx * (ow / 2 - 0.25), (h - 0.06) / 2, cz + sz * (od / 2 - 0.25));
    });
    addBox(g, 6, 0.15, 1.2, M.matBlue, cx, 0.075, cz - od / 2 - 0.7);
    addBox(g, 6, 0.15, 1.2, M.matBlue, cx, 0.075, cz + od / 2 + 0.7);
    blob(5.5, 3.6, cx, cz);
  }

  // 11) Bleachers – peeche ke dono kone
  {
    const tiers = 5;
    const depth = 0.85;
    const rise = 0.45;
    const zBack = -(L / 2 - T - 0.3);
    const seatGeo = mergeGeometries([
      new THREE.BoxGeometry(0.46, 0.08, 0.4).translate(0, 0.08, 0),
      new THREE.BoxGeometry(0.46, 0.38, 0.06).translate(0, 0.3, -0.18),
    ]);
    const seats = [];
    [-1, 1].forEach((s) => {
      const x0 = 13.5;
      const x1 = 33;
      const len = x1 - x0;
      const cx = s * (x0 + len / 2);
      for (let k = 0; k < tiers; k++) {
        const h = (tiers - k) * rise;
        const z = zBack + depth / 2 + k * depth;
        addBox(g, len, h, depth, M.seatTier, cx, h / 2, z);
        addBox(g, len, 0.04, 0.05, M.matYellow, cx, h + 0.01, z + depth / 2 - 0.03, { cast: false });
        for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.55) {
          seats.push({ x: s * x, y: h, z: z - 0.05, c: k % 2 === 0 ? '#6a2c93' : '#2457b8' });
        }
      }
      // railing
      g.add(mesh(rodGeo(new THREE.Vector3(s * x0, tiers * rise + 1.0, zBack + 0.2), new THREE.Vector3(s * x1, tiers * rise + 1.0, zBack + 0.2), 0.03, 8), M.chrome, { cast: false }));
    });
    const inst = new THREE.InstancedMesh(seatGeo, M.seat, seats.length);
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    seats.forEach((p, i) => {
      d.position.set(p.x, p.y, p.z);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, c.set(p.c));
    });
    inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    g.add(inst);
  }

  // 12) Entrance mat
  g.add(plane(4, 2.2, M.carpetBlue, 0, 0.03, L / 2 - T - 1.6));

  /* ---------- Front block: reception, manager + cabin, owner, stairs, rooms, toilets, pit ---------- */
  buildHallRooms(g, { M, mats, collector });

  // Roof ke neeche sun ki shadow nahi aati – interior meshes ko shadow cast ki zaroorat nahi (fast)
  g.traverse((o) => {
    o.castShadow = false;
  });

  return { group: g };
}