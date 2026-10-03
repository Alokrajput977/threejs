import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { HALL } from './warehouse.js';

/*
 * Main gate se warehouse tak ki road ke LEFT + RIGHT decorative gamle.
 * Do design alternate:
 *   A) Terracotta gamla – rolled rim, mitti ka texture
 *   B) Tall glazed urn – chamakdar teal glaze (clearcoat)
 * Har gamle mein asli jaisa plant: patte (leaf shapes) + paankhudiyon wale phool.
 * Sab InstancedMesh – hazaron patte bhi fast.
 */

const LEAF_GREENS = ['#1f4d1c', '#2a5e24', '#33702b', '#244f20', '#3d7a30', '#1b4419'];
const THEMES = [
  ['#ff8c1a', '#ffa83d', '#ff7a00'], // marigold
  ['#c62828', '#e53935', '#d81b60'], // geranium
  ['#ec5f9c', '#f48fb1', '#ff77a9'], // petunia
  ['#7e57c2', '#b39ddb', '#ffffff'], // purple + white
  ['#fbc02d', '#ffeb3b', '#ffd54f'], // yellow
  ['#ffffff', '#fff3e0', '#ff8a80'], // white + coral
];

/* ---------- Textures ---------- */
function terracottaTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b8582f';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(90,35,15,0.10)' : 'rgba(255,210,170,0.10)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // halki horizontal throwing lines
  for (let y = 0; y < 256; y += 9) {
    ctx.fillStyle = `rgba(80,30,10,${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(0, y, 256, 2);
  }
  // paani ke halke daag (white mineral stain) neeche
  const g = ctx.createLinearGradient(0, 256, 0, 170);
  g.addColorStop(0, 'rgba(235,225,210,0.35)');
  g.addColorStop(1, 'rgba(235,225,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 170, 256, 86);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- Geometries ---------- */
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

function terracottaPotGeo() {
  // Rolled rim wala classic gamla (~0.55 m)
  return new THREE.LatheGeometry(v2([
    [0.001, 0], [0.17, 0], [0.18, 0.015], [0.215, 0.36], [0.24, 0.37],
    [0.255, 0.39], [0.257, 0.45], [0.245, 0.465], [0.228, 0.46], [0.222, 0.42],
  ]), 40);
}

function urnGeo() {
  // Tall glazed urn (~0.9 m)
  return new THREE.LatheGeometry(v2([
    [0.001, 0], [0.15, 0], [0.16, 0.03], [0.13, 0.07], [0.12, 0.1],
    [0.18, 0.2], [0.25, 0.36], [0.285, 0.52], [0.28, 0.64], [0.245, 0.74],
    [0.215, 0.79], [0.25, 0.82], [0.272, 0.86], [0.262, 0.885], [0.235, 0.875], [0.225, 0.84],
  ]), 44);
}

function leafGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.045, 0.03, 0.04, 0.1, 0, 0.14);
  s.bezierCurveTo(-0.04, 0.1, -0.045, 0.03, 0, 0);
  const g = new THREE.ShapeGeometry(s, 4);
  // beech se halka mod (midrib bend) – zyada natural
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.abs(x) * 0.6 + y * y * 1.2);
  }
  g.computeVertexNormals();
  return g;
}

function petalsGeo() {
  const petals = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.022, 0.012, 0.024, 0.04, 0, 0.05);
    s.bezierCurveTo(-0.024, 0.04, -0.022, 0.012, 0, 0);
    const g = new THREE.ShapeGeometry(s, 3);
    g.rotateX(-(Math.PI / 2 - 0.4)); // thoda cup shape
    g.rotateY((i / n) * Math.PI * 2);
    petals.push(g);
  }
  return mergeGeometries(petals);
}

/* ---------- Builder ---------- */
export function buildDrivewayPlanters(collector, rand) {
  const { plotDepth: D, plinthHeight: P, gateOpening: GO } = CONFIG;
  const g = new THREE.Group();
  g.name = 'driveway-planters';

  const mats = {
    terracotta: new THREE.MeshStandardMaterial({ map: terracottaTex(), roughness: 0.88 }),
    glaze: new THREE.MeshPhysicalMaterial({
      color: '#164651', metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05,
    }),
    base: new THREE.MeshStandardMaterial({ color: '#9b978f', roughness: 0.85 }),
    soil: new THREE.MeshStandardMaterial({ color: '#3a281b', roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, side: THREE.DoubleSide }),
    petal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, side: THREE.DoubleSide }),
    center: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }),
  };
  Object.values(mats).forEach((m) => collector.ownMaterials.push(m));

  const geos = {
    potA: terracottaPotGeo(),
    potB: urnGeo(),
    base: new THREE.CylinderGeometry(0.42, 0.46, 0.08, 28),
    soil: new THREE.CylinderGeometry(1, 1, 0.02, 20),
    leaf: leafGeo(),
    petals: petalsGeo(),
    center: new THREE.SphereGeometry(0.013, 8, 6),
  };

  // Road ke dono taraf positions
  const roadHalf = (GO + 1.2) / 2;
  const xOff = roadHalf + 0.75;
  const zStart = HALL.centerZ + HALL.length / 2 + 1.5 + 1.0 + 1.6; // warehouse plaza ke baad
  const zEnd = D / 2 - 5.8; // gate / guard room path se pehle
  const spots = [];
  const count = Math.max(2, Math.floor((zEnd - zStart) / 2.4) + 1);
  for (let i = 0; i < count; i++) {
    const z = zStart + (i * (zEnd - zStart)) / (count - 1);
    [-1, 1].forEach((s) => spots.push({ x: s * xOff, z, type: i % 2 === 0 ? 'B' : 'A', theme: (i * 2 + (s > 0 ? 1 : 0)) % THEMES.length }));
  }

  const potA = [];
  const potB = [];
  const bases = [];
  const soils = [];
  const leaves = [];
  const petals = [];
  const centers = [];

  const tmpQ = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const randDir = (minY) => {
    const v = new THREE.Vector3();
    do {
      v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
    } while (v.lengthSq() > 1 || v.lengthSq() < 0.05 || v.y / v.length() < minY);
    return v.normalize();
  };

  spots.forEach((sp) => {
    const isUrn = sp.type === 'B';
    const scale = isUrn ? 1.0 : 1.25;
    const potH = (isUrn ? 0.875 : 0.465) * scale;
    const innerR = (isUrn ? 0.225 : 0.222) * scale;
    const y0 = P + 0.08; // stone base ke upar
    const rotY = rand() * Math.PI * 2;

    bases.push({ p: [sp.x, P + 0.04, sp.z], s: [1, 1, 1] });
    (isUrn ? potB : potA).push({ p: [sp.x, y0, sp.z], s: [scale, scale, scale], ry: rotY });
    const soilY = y0 + potH - 0.04 * scale;
    soils.push({ p: [sp.x, soilY, sp.z], s: [innerR, 1, innerR] });

    // Plant crown
    const crownR = isUrn ? 0.36 : 0.38;
    const cy = soilY + crownR * 0.55;
    const theme = THEMES[sp.theme];

    for (let k = 0; k < 230; k++) {
      const dir = randDir(-0.35);
      const r = crownR * (0.3 + rand() * 0.7);
      const pos = new THREE.Vector3(sp.x, cy, sp.z).addScaledVector(dir, r);
      if (pos.y < soilY + 0.01) pos.y = soilY + 0.01 + rand() * 0.03;
      // patta bahar ki taraf, thoda upar uthta hua
      const out = dir.clone().add(new THREE.Vector3(0, 0.6, 0)).normalize();
      tmpQ.setFromUnitVectors(up, out);
      const roll = new THREE.Quaternion().setFromAxisAngle(out, rand() * Math.PI * 2);
      const q = roll.multiply(tmpQ);
      const s = 0.8 + rand() * 0.7;
      leaves.push({ p: pos.toArray(), q, s: [s, s, s], c: LEAF_GREENS[Math.floor(rand() * LEAF_GREENS.length)] });
    }

    for (let k = 0; k < 38; k++) {
      const dir = randDir(0.15);
      const pos = new THREE.Vector3(sp.x, cy, sp.z).addScaledVector(dir, crownR * (0.95 + rand() * 0.15));
      tmpQ.setFromUnitVectors(up, dir.clone().add(new THREE.Vector3(0, 0.8, 0)).normalize());
      const q = new THREE.Quaternion().setFromAxisAngle(up, rand() * 6.28).premultiply(tmpQ);
      const s = 1.2 + rand() * 0.7;
      petals.push({ p: pos.toArray(), q, s: [s, s, s], c: theme[Math.floor(rand() * theme.length)] });
      const cpos = pos.clone().addScaledVector(dir, 0.004);
      centers.push({ p: cpos.toArray(), s: [s, s * 0.6, s], c: rand() > 0.3 ? '#f5c518' : '#5a3a1a' });
    }
  });

  const d = new THREE.Object3D();
  const color = new THREE.Color();
  const inst = (geo, mat, items, { cast = true } = {}) => {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => {
      d.position.fromArray(it.p);
      if (it.q) d.quaternion.copy(it.q);
      else d.quaternion.setFromAxisAngle(up, it.ry || 0);
      d.scale.fromArray(it.s);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      if (it.c) m.setColorAt(i, color.set(it.c));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = cast;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  inst(geos.base, mats.base, bases);
  if (potA.length) inst(geos.potA, mats.terracotta, potA);
  if (potB.length) inst(geos.potB, mats.glaze, potB);
  inst(geos.soil, mats.soil, soils, { cast: false });
  inst(geos.leaf, mats.leaf, leaves);
  inst(geos.petals, mats.petal, petals, { cast: false });
  inst(geos.center, mats.center, centers, { cast: false });

  return g;
}