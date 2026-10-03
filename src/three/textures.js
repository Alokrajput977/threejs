import * as THREE from 'three';

/*
 * Saare textures canvas par procedurally bante hain –
 * koi image file download nahi karni padti.
 * Ek tile = 1 meter (grass / asphalt jaise bade surfaces ke liye alag tile size).
 */

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, aniso, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function speckle(ctx, w, h, count, colors, alpha = [0.04, 0.14], size = [1, 3]) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = rand(alpha[0], alpha[1]);
    ctx.fillStyle = pick(colors);
    const s = rand(size[0], size[1]);
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

/* ---------- Brick (lal eent + mortar) + bump map ---------- */
function brick(aniso) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  const [b, bctx] = makeCanvas(S);
  ctx.fillStyle = '#b5a893';
  ctx.fillRect(0, 0, S, S);
  bctx.fillStyle = '#000';
  bctx.fillRect(0, 0, S, S);

  const rows = 12;
  const cols = 4;
  const rh = S / rows;
  const cw = S / cols;
  const m = 5;
  const palette = ['#8f3b28', '#9c4430', '#a34d36', '#87382a', '#964a33', '#7d3424', '#a8573d', '#93422c'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let k = 0; k < cols; k++) {
      const x = k * cw + offset;
      const color = pick(palette);
      const shade = rand(-0.08, 0.06);
      const draw = (xx) => {
        ctx.fillStyle = color;
        ctx.fillRect(xx + m / 2, r * rh + m / 2, cw - m, rh - m);
        ctx.globalAlpha = Math.abs(shade);
        ctx.fillStyle = shade < 0 ? '#000' : '#fff';
        ctx.fillRect(xx + m / 2, r * rh + m / 2, cw - m, rh - m);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#2a120b';
        ctx.fillRect(xx + m / 2, r * rh + rh - m / 2 - 3, cw - m, 3);
        ctx.globalAlpha = 1;
        bctx.fillStyle = '#fff';
        bctx.fillRect(xx + m / 2 + 1, r * rh + m / 2 + 1, cw - m - 2, rh - m - 2);
      };
      draw(x);
      if (x + cw > S) draw(x - S); // seamless wrap
    }
  }
  speckle(ctx, S, S, 9000, ['#000', '#3b1a10', '#d9b08c', '#fff'], [0.04, 0.16], [1, 2.5]);
  speckle(bctx, S, S, 6000, ['#000', '#888'], [0.08, 0.25], [1, 2]);
  return { map: toTexture(c, aniso), bump: toTexture(b, aniso, false) };
}

/* ---------- Plaster (white base, material color se tint) ---------- */
function plaster(aniso) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#f3f0ea';
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 7000, ['#000', '#7a6c58', '#fff'], [0.02, 0.07], [1, 3]);
  // halke rain-stain streaks
  for (let i = 0; i < 18; i++) {
    ctx.globalAlpha = rand(0.015, 0.04);
    ctx.fillStyle = '#5b4d3a';
    ctx.fillRect(rand(0, S), rand(0, S), rand(2, 6), rand(30, 120));
  }
  ctx.globalAlpha = 1;
  return toTexture(c, aniso);
}

/* ---------- Stone (ashlar blocks – plinth / base band) ---------- */
function stone(aniso) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#5d5850';
  ctx.fillRect(0, 0, S, S);
  const palette = ['#8d867a', '#9a9284', '#7f786c', '#a39b8b', '#8a7f6e', '#968b78'];
  const rows = 4;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = 0;
    while (x < S) {
      let w = rand(120, 230);
      if (S - (x + w) < 90) w = S - x;
      ctx.fillStyle = pick(palette);
      ctx.fillRect(x + 4, r * rh + 4, w - 8, rh - 8);
      // edge shading
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 4, r * rh + rh - 10, w - 8, 6);
      ctx.fillRect(x + w - 10, r * rh + 4, 6, rh - 8);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x + 4, r * rh + 4, w - 8, 4);
      ctx.globalAlpha = 1;
      x += w;
    }
  }
  speckle(ctx, S, S, 16000, ['#000', '#fff', '#4a4038'], [0.04, 0.14], [1, 3]);
  return toTexture(c, aniso);
}

/* ---------- Concrete ---------- */
function concrete(aniso) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#b3b0a8';
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 9000, ['#000', '#fff', '#6b675f'], [0.03, 0.12], [1, 2.5]);
  for (let i = 0; i < 8; i++) {
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#3d3a35';
    ctx.beginPath();
    ctx.arc(rand(0, S), rand(0, S), rand(10, 40), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(c, aniso);
}

/* ---------- Ramp concrete with anti-skid grooves ---------- */
function rampConcrete(aniso) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#a9a69e';
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 7000, ['#000', '#fff'], [0.03, 0.12], [1, 2.5]);
  const lines = 6;
  for (let i = 0; i < lines; i++) {
    const x = (i + 0.5) * (S / lines);
    ctx.fillStyle = 'rgba(40,38,34,0.55)';
    ctx.fillRect(x - 3, 0, 6, S);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 3, 0, 2, S);
  }
  return toTexture(c, aniso);
}

/* ---------- Interlocking pavers ---------- */
function paver(aniso) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#5b5852';
  ctx.fillRect(0, 0, S, S);
  const cols = 5;
  const rows = 10;
  const cw = S / cols;
  const rh = S / rows;
  const palette = ['#9d9a93', '#a7a39b', '#918d85', '#a29d93'];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      ctx.fillStyle = (r + k) % 7 === 0 ? '#8f5e4c' : pick(palette);
      ctx.fillRect(k * cw + 3, r * rh + 3, cw - 6, rh - 6);
    }
  }
  speckle(ctx, S, S, 12000, ['#000', '#fff'], [0.03, 0.1], [1, 2]);
  return toTexture(c, aniso);
}

/* ---------- Asphalt ---------- */
function asphalt(aniso) {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#3a3c3f';
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 40000, ['#000', '#8a8a86', '#57595c', '#c9c7c0'], [0.06, 0.3], [1, 2]);
  for (let i = 0; i < 10; i++) {
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(rand(0, S), rand(0, S), rand(20, 70), rand(10, 30), rand(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(c, aniso);
}

/* ---------- Grass (1 tile = 4 m) ---------- */
function grass(aniso, base = '#5c7a37') {
  const S = 512;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const greens = ['#4b6a2b', '#6d8c40', '#7f9b4b', '#3e5a24', '#8aa356', '#5f7f35', '#9a9a5a'];
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.strokeStyle = pick(greens);
    ctx.globalAlpha = rand(0.25, 0.7);
    ctx.lineWidth = rand(0.6, 1.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand(-2, 2), y - rand(2, 6));
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = Math.random() > 0.5 ? '#2f4419' : '#9a8f55';
    ctx.beginPath();
    ctx.arc(rand(0, S), rand(0, S), rand(20, 60), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(c, aniso);
}

/* ---------- Jaali (diamond mesh, alpha cut-out) – 1 tile = 0.35 m ---------- */
function jaali(aniso) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 11;
  ctx.lineCap = 'square';
  const step = S / 2;
  for (let k = -S; k <= S * 2; k += step) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + S, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k, S);
    ctx.lineTo(k + S, 0);
    ctx.stroke();
  }
  // crossing par chhote rivets
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[0, 0], [S / 2, S / 2], [S, 0], [0, S], [S, S], [S / 2, 0], [0, S / 2], [S, S / 2], [S / 2, S]]) {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = toTexture(c, aniso);
  return t;
}

/* ---------- Wood (door) ---------- */
function wood(aniso) {
  const S = 256;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#6b4227';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    ctx.strokeStyle = pick(['#4f2e19', '#7d5133', '#5d391f', '#86593a']);
    ctx.globalAlpha = rand(0.2, 0.5);
    ctx.lineWidth = rand(0.5, 2);
    const x = rand(0, S);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand(-6, 6), S * 0.3, x + rand(-6, 6), S * 0.7, x, S);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(c, aniso);
}

/* ---------- Hazard stripes ---------- */
function hazard(aniso) {
  const S = 128;
  const [c, ctx] = makeCanvas(S);
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#1b1b1b';
  for (let k = -S; k < S * 2; k += S / 2) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + S / 4, 0);
    ctx.lineTo(k + S / 4 + S, S);
    ctx.lineTo(k + S, S);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(c, aniso);
}

/** Text signboard (guard room / gate plaque). */
export function signTexture(title, subtitle = '', { bg = '#123a6b', fg = '#ffffff', w = 512, h = 128 } = {}) {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (subtitle) {
    ctx.font = `800 ${Math.round(h * 0.36)}px Arial, sans-serif`;
    ctx.fillText(title, w / 2, h * 0.4);
    ctx.font = `600 ${Math.round(h * 0.18)}px Arial, sans-serif`;
    ctx.fillText(subtitle, w / 2, h * 0.75);
  } else {
    ctx.font = `800 ${Math.round(h * 0.46)}px Arial, sans-serif`;
    ctx.fillText(title, w / 2, h / 2 + 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let cache = null;

export function getTextures(maxAniso = 8) {
  if (cache) return cache;
  const a = Math.min(maxAniso, 16);
  const b = brick(a);
  cache = {
    brick: b.map,
    brickBump: b.bump,
    plaster: plaster(a),
    stone: stone(a),
    concrete: concrete(a),
    ramp: rampConcrete(a),
    paver: paver(a),
    asphalt: asphalt(a),
    grass: grass(a),
    lawn: grass(a, '#5f8436'),
    jaali: jaali(a),
    wood: wood(a),
    hazard: hazard(a),
  };
  return cache;
}

export function disposeTextures() {
  if (!cache) return;
  Object.values(cache).forEach((t) => t.dispose());
  cache = null;
}
