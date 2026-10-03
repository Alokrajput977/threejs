import * as THREE from 'three';
import { CONFIG, GATES, sideFrame } from './config.js';
import { createMaterials } from './materials.js';
import { groundPlane, seededRandom } from './helpers.js';
import { buildWallRun } from './builders/wall.js';
import { buildFenceRun } from './builders/fence.js';
import { buildGate } from './builders/gate.js';
import { buildGuardRoom } from './builders/guardRoom.js';
import { buildApproach } from './builders/approach.js';
import { buildGround } from './builders/ground.js';
import { buildParking } from './builders/parking.js';
import { buildWarehouse, HALL } from './builders/warehouse.js';
import { buildDrivewayPlanters } from './builders/flowerPots.js';
import { buildGateBanner } from './builders/banner.js';
import { buildInterior, createInteriorLights } from './builders/interior.js';

/**
 * Poora compound banata hai aur control API return karta hai.
 */
export function buildCampus(textures) {
  const mats = createMaterials(textures);
  const { plinthHeight: P, gateOpening: GO, gatePillarSize: GPS } = CONFIG;

  const root = new THREE.Group();
  root.name = 'campus';
  const fenceGroup = new THREE.Group();
  fenceGroup.name = 'fencing';

  const collector = { pointLights: [], lampMeshes: [], ownMaterials: [], signMaterials: [] };
  const gates = {};
  const gateLeaves = [];
  const rand = seededRandom(20261002);

  const ground = buildGround(mats);
  root.add(ground.group);

  GATES.forEach((gate) => {
    const f = sideFrame(gate.side);
    const side = new THREE.Group();
    side.name = `side-${gate.side}`;
    side.position.copy(f.pos);
    side.rotation.y = f.rotY;

    const isNS = gate.side === 'south' || gate.side === 'north';
    const L = f.length;
    const gEdge = GO / 2 + GPS - 0.05;

    // Wall runs (gate ke dono taraf)
    const leftRun = buildWallRun(-L / 2, -gEdge,
      { startPillar: isNS, startPost: isNS, endPillar: false, endPost: true }, mats);
    const rightRun = buildWallRun(gEdge, L / 2,
      { startPillar: false, startPost: true, endPillar: isNS, endPost: isNS }, mats);
    side.add(leftRun.group, rightRun.group);

    // Fencing (alag group taaki toggle ho sake)
    const fenceSide = new THREE.Group();
    fenceSide.position.copy(f.pos);
    fenceSide.rotation.y = f.rotY;
    fenceSide.add(
      buildFenceRun(-L / 2, -gEdge, leftRun.postXs, mats),
      buildFenceRun(gEdge, L / 2, rightRun.postXs, mats),
    );
    fenceGroup.add(fenceSide);

    // Gate
    const g = buildGate(gate, mats, collector);
    side.add(g.group);
    gates[gate.id] = g;
    gateLeaves.push(g.left, g.right);

    // Gate ke upar Gymnastics Academy banner
    side.add(buildGateBanner(gate, mats, collector));

    // Wall ke bahar grass ki patti (wall se plinth ke kinare tak)
    const PM = CONFIG.plinthMargin;
    const vz0 = 0.2;
    const vz1 = PM - 0.2;
    const vEnd = isNS ? L / 2 + PM - 0.2 : L / 2;
    [[-vEnd, -(gEdge + 0.2)], [gEdge + 0.2, vEnd]].forEach(([a, b]) => {
      const verge = groundPlane(b - a, vz1 - vz0, mats.lawn, 4);
      verge.position.set((a + b) / 2, P + 0.02, (vz0 + vz1) / 2);
      side.add(verge);
    });

    // Approach (ramp / steps)
    side.add(buildApproach(gate.type, mats));

    // Andar ki driveway + guard room path
    // Driveway warehouse ke podium tak (chaudi building ki wajah se east/west par chhoti)
    const hallHalf = (isNS ? HALL.length : HALL.width) / 2 + 1.5;
    const driveLen = Math.min(20, (isNS ? CONFIG.plotDepth : CONFIG.plotWidth) / 2 - hallHalf - 0.2);
    const drive = groundPlane(GO + 1.2, driveLen, mats.asphalt, 4);
    drive.position.set(0, P + 0.03, -driveLen / 2);
    side.add(drive);
    const apron = groundPlane(GO + 1.2, 0.6, mats.pathPaver, 1);
    apron.position.set(0, P + 0.035, -0.3);
    side.add(apron);

    const gr = CONFIG.guardRoom;
    const doorX = gr.offsetX + gr.width / 2 - 0.9;
    const pathZ = gr.offsetZ - gr.depth / 2 - 0.75;
    const pathX0 = doorX - 0.7;
    const pathX1 = -(GO + 1.2) / 2;
    const path = groundPlane(pathX1 - pathX0, 1.3, mats.pathPaver, 1);
    path.position.set((pathX0 + pathX1) / 2, P + 0.032, pathZ);
    side.add(path);

    // Guard room – gate ke left side, andar, wall se attached
    side.add(buildGuardRoom(gate.number, mats, collector));

    root.add(side);
  });

  root.add(fenceGroup);

  // Compound ke beech athlete training hall (warehouse)
  const hall = buildWarehouse(mats, collector);
  root.add(hall);

  // Hall ka andar: lights abhi (intensity 0), meshes pehli baar andar jaane par
  const interiorLights = createInteriorLights();
  root.add(interiorLights.group);
  let interior = null;

  // Main gate -> warehouse road ke dono taraf decorative gamle
  root.add(buildDrivewayPlanters(collector, rand));

  // Main gate ke saamne, road ke left + right parking
  root.add(buildParking(mats, collector, rand, {
    roadStart: CONFIG.plotDepth / 2 + CONFIG.plinthMargin + CONFIG.ramp.length,
    mainRoadZ: ground.mainRoadZ,
    roadWidth: CONFIG.ramp.width,
  }));

  // ---------- API ----------
  function update(dt) {
    const k = 1 - Math.exp(-dt * 2.4);
    Object.values(gates).forEach((g) => {
      g.angle += (g.target - g.angle) * k;
      g.left.rotation.y = g.angle;
      g.right.rotation.y = -g.angle;
    });
  }

  function setGateOpen(id, open) {
    if (gates[id]) gates[id].target = open ? CONFIG.gateOpenAngle : 0;
  }

  function setNight(night) {
    mats.lamp.emissiveIntensity = night ? 5 : 0.05;
    mats.glass.emissiveIntensity = night ? 0.55 : 0;
    collector.signMaterials.forEach((m) => {
      m.emissiveIntensity = night ? 0.45 : 0;
    });
    collector.pointLights.forEach(({ light, night: n }) => {
      light.intensity = night ? n : 0;
    });
  }

  /** Building ke andar / bahar switch. */
  function setInterior(on) {
    if (on && !interior) {
      interior = buildInterior(mats, collector);
      root.add(interior.group);
    }
    if (interior) interior.group.visible = on;
    interiorLights.setOn(on);
    hall.traverse((o) => {
      if (o.userData.hideInside) o.visible = !on;
    });
  }

  function setFence(visible) {
    fenceGroup.visible = visible;
  }

  function setWallStyle(style) {
    mats.setWallStyle(style);
  }

  function dispose() {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    collector.ownMaterials.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
    mats.dispose();
  }

  return { group: root, update, setGateOpen, setNight, setFence, setWallStyle, setInterior, gateLeaves, hall, dispose };
}