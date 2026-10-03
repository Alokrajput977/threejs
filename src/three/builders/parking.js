import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox, groundPlane, mesh } from '../helpers.js';
import { signTexture } from '../textures.js';

/*
 * Main gate (south) ke saamne, access road ke LEFT aur RIGHT dono taraf parking.
 * Har lot: asphalt, 2 rows x 10 bays (2.6 m x 5.2 m), beech mein 6.5 m aisle,
 * white bay lines, wheel stoppers, kerb, light poles, "P PARKING" board aur kuch parked cars.
 */

const BAY_W = 2.6;
const BAY_D = 5.2;
const AISLE = 6.5;
const BAYS_PER_ROW = 10;
const CAR_COLORS = ['#f2f2f0', '#b9bec4', '#1c1e21', '#9e1b1b', '#1f3f8a', '#5d6166', '#e8e2d2', '#2f5d50'];

function carKit(collector) {
  const paints = CAR_COLORS.map((c) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: c, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08,
    });
    collector.ownMaterials.push(m);
    return m;
  });
  const glass = new THREE.MeshStandardMaterial({ color: '#1b2630', metalness: 0.6, roughness: 0.08 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: '#c8cdd2', metalness: 0.9, roughness: 0.3 });
  const tail = new THREE.MeshStandardMaterial({ color: '#8a0f0f', emissive: '#ff2020', emissiveIntensity: 0.15 });
  const head = new THREE.MeshStandardMaterial({ color: '#f4f4ee', emissive: '#ffffff', emissiveIntensity: 0.1 });
  collector.ownMaterials.push(glass, tyre, rim, tail, head);

  // Body: lower box + bonnet slope ke liye side profile extrude
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
  body.rotateY(-Math.PI / 2); // length z axis ke along

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

  const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18);
  wheel.rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12);
  hub.rotateZ(Math.PI / 2);
  const lampGeo = new THREE.BoxGeometry(0.35, 0.1, 0.04);

  return { paints, glass, tyre, rim, tail, head, body, cabin, wheel, hub, lampGeo };
}

/** Ek car – origin zameen par, nose +z ki taraf. */
function makeCar(kit, paint) {
  const car = new THREE.Group();
  car.add(mesh(kit.body, paint));
  car.add(mesh(kit.cabin, kit.glass));
  [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]].forEach(([x, z]) => {
    const w = mesh(kit.wheel, kit.tyre);
    w.position.set(x, 0.33, z);
    const h = mesh(kit.hub, kit.rim, { cast: false });
    h.position.set(x, 0.33, z);
    car.add(w, h);
  });
  [-0.6, 0.6].forEach((x) => {
    const hl = mesh(kit.lampGeo, kit.head, { cast: false });
    hl.position.set(x, 0.66, 2.24);
    const tl = mesh(kit.lampGeo, kit.tail, { cast: false });
    tl.position.set(x, 0.72, -2.22);
    car.add(hl, tl);
  });
  return car;
}

function lightPole(mats, collector, x, z, armDir) {
  const g = new THREE.Group();
  const H = 6.5;
  const pole = mesh(new THREE.CylinderGeometry(0.07, 0.11, H, 10), mats.lampBody);
  pole.position.set(x, H / 2, z);
  const base = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12), mats.concrete);
  base.position.set(x, 0.25, z);
  const arm = mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), mats.lampBody);
  arm.position.set(x, H - 0.1, z + armDir * 0.7);
  const headBox = mesh(new THREE.BoxGeometry(0.4, 0.12, 0.7), mats.lampBody);
  headBox.position.set(x, H - 0.12, z + armDir * 1.3);
  const glow = mesh(new THREE.BoxGeometry(0.32, 0.03, 0.6), mats.lamp, { cast: false });
  glow.position.set(x, H - 0.195, z + armDir * 1.3);
  g.add(pole, base, arm, headBox, glow);

  const light = new THREE.PointLight('#fff1d6', 0, 26, 2);
  light.position.set(x, H - 0.5, z + armDir * 1.3);
  g.add(light);
  collector.pointLights.push({ light, night: 90 });
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

  const kit = carKit(collector);
  const lineGeo = new THREE.PlaneGeometry(1, 1);
  lineGeo.rotateX(-Math.PI / 2);
  const stopGeo = new THREE.BoxGeometry(1.8, 0.13, 0.22);

  const entry = 1.5; // road aur pehle bay ke beech
  const lotLen = entry + BAYS_PER_ROW * BAY_W + 1.2;
  const lotD = 2 * BAY_D + AISLE;
  const zc = (roadStart + mainRoadZ) / 2;
  const x0 = roadWidth / 2;

  [-1, 1].forEach((s) => {
    const lot = new THREE.Group();
    const cxLot = s * (x0 + lotLen / 2);

    // Asphalt surface
    const slab = groundPlane(lotLen, lotD, mats.asphalt, 4);
    slab.position.set(cxLot, 0.024, zc);
    lot.add(slab);

    // Bay lines + wheel stoppers (instanced)
    const lines = [];
    const stops = [];
    const bayCenters = [];
    [-1, 1].forEach((row) => {
      // row -1 = gate ki taraf (north), +1 = main road ki taraf (south)
      const zIn = zc + row * (AISLE / 2); // aisle edge
      const zOut = zc + row * (AISLE / 2 + BAY_D); // bay ka peeche wala end
      const zMid = (zIn + zOut) / 2;
      for (let i = 0; i <= BAYS_PER_ROW; i++) {
        const x = s * (x0 + entry + i * BAY_W);
        lines.push({ x, z: zMid, sx: 0.12, sz: BAY_D });
      }
      // peeche ki line
      lines.push({ x: s * (x0 + entry + (BAYS_PER_ROW * BAY_W) / 2), z: zOut - row * 0.06, sx: BAYS_PER_ROW * BAY_W, sz: 0.12 });
      for (let i = 0; i < BAYS_PER_ROW; i++) {
        const x = s * (x0 + entry + (i + 0.5) * BAY_W);
        stops.push({ x, z: zOut - row * 0.7 });
        bayCenters.push({ x, z: zMid, row });
      }
    });
    // Aisle centre dashed line
    for (let x = x0 + 0.8; x < x0 + lotLen - 1; x += 3) lines.push({ x: s * (x + 0.75), z: zc, sx: 1.5, sz: 0.12 });

    const d = new THREE.Object3D();
    const lineMesh = new THREE.InstancedMesh(lineGeo, lineMat, lines.length);
    lines.forEach((l, i) => {
      d.position.set(l.x, 0.03, l.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(l.sx, 1, l.sz);
      d.updateMatrix();
      lineMesh.setMatrixAt(i, d.matrix);
    });
    lineMesh.receiveShadow = true;
    lot.add(lineMesh);

    const stopMesh = new THREE.InstancedMesh(stopGeo, mats.hazard, stops.length);
    stops.forEach((p, i) => {
      d.position.set(p.x, 0.09, p.z);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      stopMesh.setMatrixAt(i, d.matrix);
    });
    stopMesh.castShadow = stopMesh.receiveShadow = true;
    lot.add(stopMesh);

    // Kerb – road wali side khuli (entry), baaki teen taraf
    const kH = 0.18;
    const kW = 0.25;
    const outerX = s * (x0 + lotLen);
    addBox(lot, kW, kH, lotD + kW * 2, mats.coping, outerX + s * kW / 2, kH / 2, zc, { cast: false });
    [-1, 1].forEach((side) => {
      addBox(lot, lotLen, kH, kW, mats.coping, cxLot, kH / 2, zc + side * (lotD / 2 + kW / 2), { cast: false });
    });

    // Light poles (kerb par, aisle ke saamne)
    [0.3, 0.75].forEach((t) => {
      const px = s * (x0 + lotLen * t);
      lot.add(lightPole(mats, collector, px, zc - lotD / 2 - 0.6, 1));
      lot.add(lightPole(mats, collector, px, zc + lotD / 2 + 0.6, -1));
    });

    // "P PARKING" board – entry par, gate ki taraf wale kone mein
    const sx = s * (x0 + 0.6);
    const sz = zc - lotD / 2 - 0.8;
    const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10), mats.lampBody);
    post.position.set(sx, 1.3, sz);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), signMat);
    board.position.set(sx, 2.5, sz + 0.06);
    const boardBack = addBox(lot, 0.84, 1.04, 0.05, mats.lampBody, sx, 2.5, sz + 0.02);
    boardBack.castShadow = true;
    lot.add(post, board);

    // Parked cars (lagbhag 60% bays bhare hue)
    bayCenters.forEach((b) => {
      if (rand() > 0.6) return;
      const car = makeCar(kit, kit.paints[Math.floor(rand() * kit.paints.length)]);
      // nose stopper ki taraf (front parking), kabhi kabhi reverse parked
      const noseOut = rand() > 0.25;
      const facing = b.row > 0 ? 0 : Math.PI; // +z = south row ka bahar
      car.rotation.y = facing + (noseOut ? 0 : Math.PI) + (rand() - 0.5) * 0.06;
      car.position.set(b.x + (rand() - 0.5) * 0.25, 0.03, b.z + b.row * 0.25);
      lot.add(car);
    });

    g.add(lot);
  });

  return g;
}