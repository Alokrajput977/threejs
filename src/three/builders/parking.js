import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { addBox, groundPlane } from '../helpers.js';
import { signTexture } from '../textures.js';

/*
 * Main gate (south) ke saamne, access road ke LEFT aur RIGHT dono taraf parking.
 * Har lot: asphalt, 2 rows x 10 bays (2.6 m x 5.2 m), beech mein 6.5 m aisle,
 * white bay lines, wheel stoppers, kerb, light poles, "P PARKING" board aur kuch parked cars.
 *
 * LIGHTWEIGHT VERSION:
 *  - 0 point lights (pehle 8). Raat ki roshni = lamp glow + zameen par "light pool" decal
 *    (Lambert + additive blending) – dikhne mein same, GPU par lagbhag free.
 *  - Saari cars InstancedMesh se: sab cars milakar sirf 6 draw calls (pehle ~12 per car).
 *  - Car paint MeshStandardMaterial (pehle MeshPhysical clearcoat – sabse mehnga shader).
 *  - Light poles ek merged mesh per material.
 *  - Cars kam: ~30% bays bhare hue.
 */

const BAY_W = 2.6;
const BAY_D = 5.2;
const AISLE = 6.5;
const BAYS_PER_ROW = 10;
const OCCUPANCY = 0.3;
const CAR_COLORS = ['#f2f2f0', '#b9bec4', '#1c1e21', '#9e1b1b', '#1f3f8a', '#5d6166', '#e8e2d2', '#2f5d50'];

/* ---------- Car parts (shared geometry) ---------- */
function carGeometries() {
  const profile = new THREE.Shape();
  profile.moveTo(-2.15, 0.32);
  profile.lineTo(2.15, 0.32);
  profile.lineTo(2.2, 0.62);
  profile.lineTo(2.05, 0.82);
  profile.lineTo(1.1, 0.9);
  profile.lineTo(-1.95, 0.92);
  profile.lineTo(-2.2, 0.75);
  profile.closePath();
  const body = new THREE.ExtrudeGeometry(profile, {
    depth: 1.7, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
  });
  body.translate(0, 0, -0.85);
  body.rotateY(-Math.PI / 2); // length z axis ke along, nose +z

  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.55, 0);
  cabinShape.lineTo(0.75, 0);
  cabinShape.lineTo(0.15, 0.5);
  cabinShape.lineTo(-1.2, 0.52);
  cabinShape.closePath();
  const cabin = new THREE.ExtrudeGeometry(cabinShape, {
    depth: 1.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2,
  });
  cabin.translate(0, 0.9, -0.75);
  cabin.rotateY(-Math.PI / 2);

  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16);
  wheel.rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10);
  hub.rotateZ(Math.PI / 2);
  const lamp = new THREE.BoxGeometry(0.35, 0.1, 0.04);
  return { body, cabin, wheel, hub, lamp };
}

const WHEELS = [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]];

/** Saari cars ke parts InstancedMesh mein (har part type = 1 draw call). */
function buildCars(spots, collector, rand) {
  const geo = carGeometries();
  const std = (o) => {
    const m = new THREE.MeshStandardMaterial(o);
    collector.ownMaterials.push(m);
    return m;
  };
  const M = {
    paint: std({ color: '#ffffff', metalness: 0.6, roughness: 0.26 }), // rang instanceColor se
    glass: std({ color: '#1b2630', metalness: 0.6, roughness: 0.08 }),
    tyre: std({ color: '#141414', roughness: 0.9 }),
    rim: std({ color: '#c8cdd2', metalness: 0.9, roughness: 0.3 }),
    tail: std({ color: '#8a0f0f', emissive: '#ff2020', emissiveIntensity: 0.15 }),
    head: std({ color: '#f4f4ee', emissive: '#ffffff', emissiveIntensity: 0.1 }),
  };

  const n = spots.length;
  const body = new THREE.InstancedMesh(geo.body, M.paint, n);
  const cabin = new THREE.InstancedMesh(geo.cabin, M.glass, n);
  const wheels = new THREE.InstancedMesh(geo.wheel, M.tyre, n * 4);
  const hubs = new THREE.InstancedMesh(geo.hub, M.rim, n * 4);
  const heads = new THREE.InstancedMesh(geo.lamp, M.head, n * 2);
  const tails = new THREE.InstancedMesh(geo.lamp, M.tail, n * 2);

  const car = new THREE.Matrix4();
  const part = new THREE.Matrix4();
  const out = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);

  spots.forEach((s, i) => {
    q.setFromAxisAngle(up, s.rotY);
    car.compose(new THREE.Vector3(s.x, 0.03, s.z), q, one);
    body.setMatrixAt(i, car);
    body.setColorAt(i, color.set(CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)]));
    cabin.setMatrixAt(i, car);
    WHEELS.forEach(([x, z], k) => {
      part.makeTranslation(x, 0.33, z);
      out.multiplyMatrices(car, part);
      wheels.setMatrixAt(i * 4 + k, out);
      hubs.setMatrixAt(i * 4 + k, out);
    });
    [-0.6, 0.6].forEach((x, k) => {
      part.makeTranslation(x, 0.66, 2.24);
      heads.setMatrixAt(i * 2 + k, out.multiplyMatrices(car, part));
      part.makeTranslation(x, 0.72, -2.22);
      tails.setMatrixAt(i * 2 + k, out.multiplyMatrices(car, part));
    });
  });
  body.instanceColor.needsUpdate = true;

  const g = new THREE.Group();
  g.name = 'parked-cars';
  [body, cabin, wheels, hubs, heads, tails].forEach((m, idx) => {
    m.castShadow = idx < 2; // sirf body + cabin ki shadow
    m.receiveShadow = true;
    g.add(m);
  });
  return g;
}

/* ---------- Light poles: geometry merge + night light pool ---------- */
function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  // Gaussian jaisa smooth falloff – kinaare dikhte nahi, overlap hokar ek jaisi roshni
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const v = Math.exp(-t * t * 4.5) * (1 - t);
    gr.addColorStop(t, `rgba(255,255,255,${v.toFixed(3)})`);
  }
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); // linear data (banding kam)
  return t;
}

function buildPoles(poles, mats, collector) {
  const H = 6.5;
  const body = [];
  const base = [];
  const glow = [];
  poles.forEach(({ x, z, dir }) => {
    const pole = new THREE.CylinderGeometry(0.07, 0.11, H, 10);
    pole.translate(x, H / 2, z);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.4);
    arm.translate(x, H - 0.1, z + dir * 0.7);
    const head = new THREE.BoxGeometry(0.4, 0.12, 0.7);
    head.translate(x, H - 0.12, z + dir * 1.3);
    body.push(pole, arm, head);
    const b = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12);
    b.translate(x, 0.25, z);
    base.push(b);
    const gl = new THREE.BoxGeometry(0.32, 0.03, 0.6);
    gl.translate(x, H - 0.195, z + dir * 1.3);
    glow.push(gl);
  });
  const g = new THREE.Group();
  g.name = 'parking-poles';
  const m1 = new THREE.Mesh(mergeGeometries(body), mats.lampBody);
  const m2 = new THREE.Mesh(mergeGeometries(base), mats.concrete);
  const m3 = new THREE.Mesh(mergeGeometries(glow), mats.lamp); // raat mein glow (shared lamp material)
  m1.castShadow = m2.castShadow = true;
  m1.receiveShadow = m2.receiveShadow = true;
  g.add(m1, m2, m3);

  // Zameen par roshni ka gol "pool" – sirf raat mein dikhta hai (signMaterials night toggle)
  const tex = poolTexture();
  const poolMat = new THREE.MeshLambertMaterial({
    color: '#000000',
    emissive: new THREE.Color(0.055, 0.046, 0.033), // halki garam roshni
    emissiveMap: tex,
    emissiveIntensity: 0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    dithering: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  });
  collector.ownMaterials.push(poolMat);
  collector.signMaterials.push(poolMat);
  const poolGeo = new THREE.PlaneGeometry(24, 24);
  poolGeo.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, poles.length);
  const d = new THREE.Object3D();
  poles.forEach(({ x, z, dir }, i) => {
    d.position.set(x, 0.05, z + dir * 4.0);
    d.updateMatrix();
    pools.setMatrixAt(i, d.matrix);
  });
  pools.renderOrder = 3;
  g.add(pools);
  return g;
}

/**
 * opts: { roadStart, mainRoadZ, roadWidth } – ground.js se.
 */
export function buildParking(mats, collector, rand, { roadStart, mainRoadZ, roadWidth }) {
  const g = new THREE.Group();
  g.name = 'parking';

  const lineMat = new THREE.MeshStandardMaterial({
    color: '#f1efe6', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  collector.ownMaterials.push(lineMat);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture('P', 'PARKING', { bg: '#1f5fbf', w: 256, h: 320 }),
    roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0,
  });
  signMat.emissiveMap = signMat.map;
  collector.ownMaterials.push(signMat);
  collector.signMaterials.push(signMat);

  const lineGeo = new THREE.PlaneGeometry(1, 1);
  lineGeo.rotateX(-Math.PI / 2);
  const stopGeo = new THREE.BoxGeometry(1.8, 0.13, 0.22);
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10);
  const boardGeo = new THREE.PlaneGeometry(0.8, 1.0);

  const entry = 1.5;
  const lotLen = entry + BAYS_PER_ROW * BAY_W + 1.2;
  const lotD = 2 * BAY_D + AISLE;
  const zc = (roadStart + mainRoadZ) / 2;
  const x0 = roadWidth / 2;

  const lines = [];
  const stops = [];
  const carSpots = [];
  const poles = [];

  [-1, 1].forEach((s) => {
    const cxLot = s * (x0 + lotLen / 2);

    // Asphalt
    const slab = groundPlane(lotLen, lotD, mats.asphalt, 4);
    slab.position.set(cxLot, 0.024, zc);
    g.add(slab);

    [-1, 1].forEach((row) => {
      const zIn = zc + row * (AISLE / 2);
      const zOut = zc + row * (AISLE / 2 + BAY_D);
      const zMid = (zIn + zOut) / 2;
      for (let i = 0; i <= BAYS_PER_ROW; i++) {
        lines.push({ x: s * (x0 + entry + i * BAY_W), z: zMid, sx: 0.12, sz: BAY_D });
      }
      lines.push({ x: s * (x0 + entry + (BAYS_PER_ROW * BAY_W) / 2), z: zOut - row * 0.06, sx: BAYS_PER_ROW * BAY_W, sz: 0.12 });
      for (let i = 0; i < BAYS_PER_ROW; i++) {
        const x = s * (x0 + entry + (i + 0.5) * BAY_W);
        stops.push({ x, z: zOut - row * 0.7 });
        if (rand() < OCCUPANCY) {
          const noseOut = rand() > 0.25;
          const facing = row > 0 ? 0 : Math.PI;
          carSpots.push({
            x: x + (rand() - 0.5) * 0.25,
            z: zMid + row * 0.25,
            rotY: facing + (noseOut ? 0 : Math.PI) + (rand() - 0.5) * 0.06,
          });
        }
      }
    });
    for (let x = x0 + 0.8; x < x0 + lotLen - 1; x += 3) lines.push({ x: s * (x + 0.75), z: zc, sx: 1.5, sz: 0.12 });

    // Kerb – road wali side khuli
    const kH = 0.18;
    const kW = 0.25;
    const outerX = s * (x0 + lotLen);
    addBox(g, kW, kH, lotD + kW * 2, mats.coping, outerX + s * kW / 2, kH / 2, zc, { cast: false });
    [-1, 1].forEach((side) => {
      addBox(g, lotLen, kH, kW, mats.coping, cxLot, kH / 2, zc + side * (lotD / 2 + kW / 2), { cast: false });
    });

    // Light poles (positions)
    [0.3, 0.75].forEach((t) => {
      const px = s * (x0 + lotLen * t);
      poles.push({ x: px, z: zc - lotD / 2 - 0.6, dir: 1 });
      poles.push({ x: px, z: zc + lotD / 2 + 0.6, dir: -1 });
    });

    // "P PARKING" board
    const sx = s * (x0 + 0.6);
    const sz = zc - lotD / 2 - 0.8;
    const post = new THREE.Mesh(postGeo, mats.lampBody);
    post.position.set(sx, 1.3, sz);
    post.castShadow = true;
    const board = new THREE.Mesh(boardGeo, signMat);
    board.position.set(sx, 2.5, sz + 0.06);
    addBox(g, 0.84, 1.04, 0.05, mats.lampBody, sx, 2.5, sz + 0.02);
    g.add(post, board);
  });

  // Ek kam se kam car har lot mein ho
  if (!carSpots.some((c) => c.x < 0)) carSpots.push({ x: -(x0 + entry + 2.5 * BAY_W), z: zc + AISLE / 2 + BAY_D / 2 + 0.25, rotY: 0 });
  if (!carSpots.some((c) => c.x > 0)) carSpots.push({ x: x0 + entry + 6.5 * BAY_W, z: zc - AISLE / 2 - BAY_D / 2 - 0.25, rotY: Math.PI });

  // Lines + stoppers – dono lots ek saath (1 draw call each)
  const d = new THREE.Object3D();
  const lineMesh = new THREE.InstancedMesh(lineGeo, lineMat, lines.length);
  lines.forEach((l, i) => {
    d.position.set(l.x, 0.03, l.z);
    d.scale.set(l.sx, 1, l.sz);
    d.updateMatrix();
    lineMesh.setMatrixAt(i, d.matrix);
  });
  lineMesh.receiveShadow = true;
  g.add(lineMesh);

  const stopMesh = new THREE.InstancedMesh(stopGeo, mats.hazard, stops.length);
  d.scale.set(1, 1, 1);
  stops.forEach((p, i) => {
    d.position.set(p.x, 0.09, p.z);
    d.updateMatrix();
    stopMesh.setMatrixAt(i, d.matrix);
  });
  stopMesh.receiveShadow = true;
  g.add(stopMesh);

  g.add(buildPoles(poles, mats, collector));
  g.add(buildCars(carSpots, collector, rand));

  return g;
}