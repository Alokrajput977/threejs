import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox } from '../helpers.js';

/*
 * Wall ke BAHAR ki taraf garden:
 *  - wall ke saath raised flower bed (kerb + mitti)
 *  - peeche hedge (jhaadiyan), aage rang-birange phool
 *  - plinth ke kinare par terracotta flower pots
 *  - har gate ke dono taraf bade pots, aur har corner par ek pot
 * Sab kuch InstancedMesh se – hazaron phool bhi fast chalte hain.
 */

const FLOWER_COLORS = ['#ff8c1a', '#ffb300', '#e8333c', '#ff5fa2', '#f6f2e6', '#b03fd1', '#ffd84a', '#ff6a3d'];

/** Ek baar banta hai, saari sides share karti hain. */
export function createGardenKit(mats, collector) {
  const potProfile = [
    [0.001, 0], [0.17, 0], [0.19, 0.03], [0.23, 0.34], [0.27, 0.36],
    [0.28, 0.44], [0.25, 0.45], [0.24, 0.41], [0.001, 0.41],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const kit = {
    geos: {
      bush: new THREE.IcosahedronGeometry(1, 1),
      flower: new THREE.IcosahedronGeometry(0.07, 0),
      pot: new THREE.LatheGeometry(potProfile, 18),
    },
    mats: {
      kerb: mats.pillar,
      soil: new THREE.MeshStandardMaterial({ color: '#4a3222', roughness: 1 }),
      hedge: new THREE.MeshStandardMaterial({ color: '#3b6b2a', roughness: 0.9, flatShading: true }),
      mound: new THREE.MeshStandardMaterial({ color: '#4f8f34', roughness: 0.9, flatShading: true }),
      flower: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }),
      pot: new THREE.MeshStandardMaterial({ color: '#b5552e', roughness: 0.85 }),
    },
  };
  ['soil', 'hedge', 'mound', 'flower', 'pot'].forEach((k) => collector.ownMaterials.push(kit.mats[k]));
  return kit;
}

function instanced(geo, mat, items, { cast = true } = {}) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const d = new THREE.Object3D();
  items.forEach((it, i) => {
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(it.rx || 0, it.ry || 0, 0);
    d.scale.set(it.s, it.sy ?? it.s, it.s);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (it.c) m.setColorAt(i, it.c);
  });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/**
 * Ek side ka garden (local frame: +z = bahar).
 * L = side ki lambai, gEdge = gate pillar ka bahari kinara.
 */
export function buildGardenSide(L, gEdge, kit, rand, { cornerPots = false } = {}) {
  const { plinthHeight: P, plinthMargin: PM } = CONFIG;
  const g = new THREE.Group();
  g.name = 'garden';

  const colors = FLOWER_COLORS.map((c) => new THREE.Color(c));
  const pickColor = () => colors[Math.floor(rand() * colors.length)];
  const bushes = [];
  const mounds = [];
  const flowers = [];
  const pots = [];

  const z0 = 0.2; // wall ke stone base ke just bahar
  const z1 = 1.15;
  const bedD = z1 - z0;
  const zc = (z0 + z1) / 2;
  const kerbH = 0.28;
  const soilTop = 0.22;

  const addFlowersAround = (x, y, z, spread, count, lift = 0.1) => {
    for (let k = 0; k < count; k++) {
      flowers.push({
        x: x + (rand() - 0.5) * spread,
        y: y + rand() * lift,
        z: z + (rand() - 0.5) * spread,
        s: 0.8 + rand() * 0.6,
        ry: rand() * 3,
        c: pickColor(),
      });
    }
  };

  const addPot = (x, z, scale) => {
    pots.push({ x, y: P, z, s: scale, ry: rand() * 3 });
    const top = P + 0.42 * scale;
    mounds.push({ x, y: top + 0.1 * scale, z, s: 0.26 * scale, sy: 0.22 * scale, ry: rand() * 3 });
    addFlowersAround(x, top + 0.2 * scale, z, 0.34 * scale, Math.round(7 * scale), 0.08 * scale);
  };

  const segments = [
    [-L / 2 + 0.6, -(gEdge + 1.6)],
    [gEdge + 1.6, L / 2 - 0.6],
  ];

  segments.forEach(([a, b]) => {
    const len = b - a;
    const cx = a + len / 2;

    // Kerb (aage + dono ends) aur mitti
    addBox(g, len + 0.1, kerbH, 0.1, kit.mats.kerb, cx, P + kerbH / 2, z1 + 0.05);
    addBox(g, 0.1, kerbH, bedD, kit.mats.kerb, a - 0.05, P + kerbH / 2, zc);
    addBox(g, 0.1, kerbH, bedD, kit.mats.kerb, b + 0.05, P + kerbH / 2, zc);
    addBox(g, len, soilTop, bedD, kit.mats.soil, cx, P + soilTop / 2, zc, { cast: false });

    // Peeche hedge (wall ke saath)
    for (let x = a + 0.3; x < b - 0.2; x += 0.5) {
      const s = 0.3 + rand() * 0.1;
      const bx = x + (rand() - 0.5) * 0.1;
      bushes.push({ x: bx, y: P + soilTop + s * 0.75, z: z0 + 0.3, s, sy: s * (1.0 + rand() * 0.3), ry: rand() * 3 });
      if (rand() > 0.55) addFlowersAround(bx, P + soilTop + s * 1.5, z0 + 0.32, 0.4, 3, 0.1);
    }

    // Aage phoolon wali chhoti jhaadiyan
    for (let x = a + 0.22; x < b - 0.15; x += 0.36) {
      const mz = zc + 0.18 + (rand() - 0.5) * 0.08;
      mounds.push({ x, y: P + soilTop + 0.05, z: mz, s: 0.17 + rand() * 0.05, sy: 0.13, ry: rand() * 3 });
      addFlowersAround(x, P + soilTop + 0.15, mz, 0.3, 7, 0.06);
    }

    // Plinth ke kinare par pots
    for (let x = a + 1.4; x < b - 0.6; x += 4.5) addPot(x, PM - 0.42, 1);
  });

  // Gate ke dono taraf bade pots
  addPot(-(gEdge + 0.8), 1.05, 1.45);
  addPot(gEdge + 0.8, 1.05, 1.45);

  // Corners par pot (sirf north/south sides se, taaki duplicate na ho)
  if (cornerPots) {
    addPot(-(L / 2 + 0.75), 0.75, 1.6);
    addPot(L / 2 + 0.75, 0.75, 1.6);
  }

  [
    instanced(kit.geos.bush, kit.mats.hedge, bushes),
    instanced(kit.geos.bush, kit.mats.mound, mounds),
    instanced(kit.geos.flower, kit.mats.flower, flowers, { cast: false }),
    instanced(kit.geos.pot, kit.mats.pot, pots),
  ].forEach((m) => m && g.add(m));

  return g;
}