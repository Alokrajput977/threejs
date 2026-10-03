import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { addBox, mesh, scaleUV } from '../helpers.js';
import { signTexture } from '../textures.js';

const JAALI_TILE = 0.35; // ek diamond pattern tile = 35 cm

/**
 * Ek gate ka palla (leaf). Hinge local x = 0 par, leaf dir * x ki taraf failta hai.
 * Neeche solid sheet, upar jaali mesh, top par spear bars.
 */
function buildLeaf(w, h, dir, mats, gateId) {
  const leaf = new THREE.Group();
  leaf.userData.gateId = gateId;
  const X = (x) => dir * x;
  const D = 0.07;

  // Frame
  addBox(leaf, 0.09, h, D, mats.gateFrame, X(0.045), h / 2, 0); // hinge stile
  addBox(leaf, 0.08, h, D, mats.gateFrame, X(w - 0.04), h / 2, 0); // lock stile
  addBox(leaf, w, 0.09, D, mats.gateFrame, X(w / 2), 0.045, 0); // bottom rail
  addBox(leaf, w, 0.08, D, mats.gateFrame, X(w / 2), 0.5, 0); // plate rail
  addBox(leaf, w, 0.09, D, mats.gateFrame, X(w / 2), h - 0.045, 0); // top rail
  const midY = 0.54 + (h - 0.62) * 0.58;
  addBox(leaf, w, 0.05, D * 0.8, mats.gateFrame, X(w / 2), midY, 0); // decorative rail

  // Bottom sheet plate
  addBox(leaf, w - 0.12, 0.38, 0.02, mats.gateFrame, X(w / 2), 0.27, 0);
  // Plate par embossed band (gold line)
  addBox(leaf, w - 0.3, 0.025, 0.03, mats.gold, X(w / 2), 0.27, 0);

  // Jaali mesh panel
  const jw = w - 0.12;
  const jh = h - 0.62;
  const jGeo = scaleUV(new THREE.PlaneGeometry(jw, jh), jw / JAALI_TILE, jh / JAALI_TILE);
  const jaali = mesh(jGeo, mats.jaali);
  jaali.position.set(X(w / 2), 0.54 + jh / 2, 0);
  leaf.add(jaali);

  // Vertical flat bars over jaali (strength + looks)
  const barGeos = [];
  for (let x = 0.5; x < w - 0.3; x += 0.5) {
    const b = new THREE.BoxGeometry(0.035, jh, 0.05);
    b.translate(X(x), 0.54 + jh / 2, 0);
    barGeos.push(b);
  }
  if (barGeos.length) leaf.add(mesh(mergeGeometries(barGeos), mats.gateFrame));

  // Spear tops
  const rods = [];
  const tips = [];
  for (let x = 0.12; x < w - 0.05; x += 0.18) {
    const r = new THREE.BoxGeometry(0.025, 0.24, 0.025);
    r.translate(X(x), h + 0.12, 0);
    rods.push(r);
    const t = new THREE.ConeGeometry(0.035, 0.12, 4);
    t.rotateY(Math.PI / 4);
    t.translate(X(x), h + 0.3, 0);
    tips.push(t);
  }
  leaf.add(mesh(mergeGeometries(rods), mats.gateFrame));
  leaf.add(mesh(mergeGeometries(tips), mats.gold));

  // Handle / lock box
  addBox(leaf, 0.12, 0.2, 0.12, mats.gateFrame, X(w - 0.1), 1.1, 0);
  addBox(leaf, 0.03, 0.18, 0.2, mats.gold, X(w - 0.12), 1.1, 0);

  // Hinge barrels
  [0.35, h - 0.35].forEach((y) => {
    const hinge = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 10), mats.gateFrame);
    hinge.position.set(0, y, 0);
    leaf.add(hinge);
  });

  // Free end par caster wheel (bade swing gates mein hota hai)
  const wheel = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), mats.gateFrame);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(X(w - 0.15), -0.0, 0.0);
  leaf.add(wheel);

  leaf.traverse((o) => {
    o.userData.gateId = gateId;
  });
  return leaf;
}

function buildGatePillar(g, x, mats, collector) {
  const { gatePillarSize: S, gatePillarHeight: PH, plinthHeight: P } = CONFIG;
  addBox(g, S + 0.12, 0.6, S + 0.12, mats.stone, x, P + 0.3, 0);
  addBox(g, S, PH - 0.6, S, mats.gatePillar, x, P + 0.6 + (PH - 0.6) / 2, 0);
  // Decorative grooves
  [1.4, 2.3].forEach((y) => addBox(g, S + 0.03, 0.04, S + 0.03, mats.coping, x, P + y, 0));
  addBox(g, S + 0.08, 0.1, S + 0.08, mats.coping, x, P + PH - 0.35, 0);
  addBox(g, S + 0.18, 0.12, S + 0.18, mats.coping, x, P + PH + 0.06, 0);

  // Pyramid cap
  const cap = mesh(new THREE.ConeGeometry((S + 0.12) * 0.72, 0.32, 4), mats.coping);
  cap.rotation.y = Math.PI / 4;
  cap.position.set(x, P + PH + 0.12 + 0.16, 0);
  g.add(cap);

  // Lamp
  const lampBase = P + PH + 0.44;
  const stem = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 10), mats.lampBody);
  stem.position.set(x, lampBase + 0.11, 0);
  g.add(stem);
  const globe = mesh(new THREE.SphereGeometry(0.17, 20, 14), mats.lamp, { cast: false });
  globe.position.set(x, lampBase + 0.38, 0);
  g.add(globe);
  const hat = mesh(new THREE.ConeGeometry(0.2, 0.1, 16), mats.lampBody);
  hat.position.set(x, lampBase + 0.6, 0);
  g.add(hat);
  collector.lampMeshes.push(globe);
}

/**
 * Pura gate: 2 pillars, 2 jaali leaves, threshold, plaque, gate light.
 */
export function buildGate(gate, mats, collector) {
  const { gateOpening: GO, gatePillarSize: S, gatePillarHeight: PH, plinthHeight: P, gateLeafHeight: LH } = CONFIG;
  const g = new THREE.Group();
  g.name = `gate-${gate.id}`;

  buildGatePillar(g, -(GO / 2 + S / 2), mats, collector);
  buildGatePillar(g, GO / 2 + S / 2, mats, collector);

  // Gate number plaque – bahar ki taraf, left pillar par
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: signTexture(`GATE ${gate.number}`, '', { bg: '#1c2a33', w: 512, h: 256 }),
    roughness: 0.4,
    metalness: 0.3,
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), plaqueMat);
  plaque.position.set(-(GO / 2 + S / 2), P + 1.85, S / 2 + 0.012);
  g.add(plaque);
  const plaqueBack = plaque.clone();
  plaqueBack.position.x = GO / 2 + S / 2;
  g.add(plaqueBack);
  collector.ownMaterials.push(plaqueMat);

  // Threshold / gate track
  addBox(g, GO, 0.03, 0.4, mats.gateFrame, 0, P + 0.015, 0);
  // Gate stopper (centre)
  addBox(g, 0.12, 0.06, 0.12, mats.gold, 0, P + 0.03, -0.25);

  // Leaves
  const leafW = GO / 2 - 0.04;
  const left = buildLeaf(leafW, LH, 1, mats, gate.id);
  left.position.set(-GO / 2 + 0.02, P + 0.07, 0);
  const right = buildLeaf(leafW, LH, -1, mats, gate.id);
  right.position.set(GO / 2 - 0.02, P + 0.07, 0);
  g.add(left, right);

  // Gate flood light
  const light = new THREE.PointLight('#ffd49a', 0, 30, 2);
  light.position.set(0, P + PH + 0.3, 1.4);
  g.add(light);
  collector.pointLights.push({ light, night: 55 });

  return { group: g, left, right, angle: 0, target: 0 };
}
