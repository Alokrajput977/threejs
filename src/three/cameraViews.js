import * as THREE from 'three';
import { CONFIG, GATES, sideFrame, localToWorld } from './config.js';
import { hallDims } from './builders/interior.js';

/** Building ke andar ke camera presets (floor-local coordinates). */
const HALL_VIEWS = {
  'hall:entrance': { pos: [0, 3.4, 25.5], target: [0, 2.2, 2] },
  'hall:west': { pos: [-22, 3.4, 3], target: [-38.6, 3.9, -8] },
  'hall:east': { pos: [22, 3.4, -3], target: [38.6, 3.9, 8] },
  'hall:roof': { pos: [-12, 1.9, 19], target: [4, 11.5, -6] },
  'hall:overview': { pos: [34, 9, 25], target: [-6, 1, -6] },
  'hall:reception': { pos: [0.5, 1.9, 27.0], target: [-4, 1.0, 20.6] },
  'hall:manager': { pos: [14.4, 1.9, 20.0], target: [24, 1.1, 26] },
  'hall:owner': { pos: [28.4, 1.9, 20.0], target: [35, 1.1, 25.5] },
  'hall:pit': { pos: [-24, 3.2, 17.5], target: [-33.5, -0.9, 23.4] },
  'hall:stairs': { pos: [4.5, 2.3, 25.6], target: [11.3, 3.6, 22.6] },
  'hall:first': { pos: [10.4, 5.2, 19.9], target: [30, 4.9, 20.6] },
  'hall:coaches': { pos: [14.4, 5.3, 21.5], target: [20, 4.1, 25.5] },
  'hall:physio': { pos: [27.4, 5.3, 21.5], target: [33, 4.1, 25.5] },
  'hall:second': { pos: [10.4, 8.7, 19.9], target: [30, 8.4, 20.6] },
  'hall:girls': { pos: [14.4, 8.7, 21.4], target: [20, 7.7, 25.6] },
  'hall:boys': { pos: [27.4, 8.7, 21.4], target: [33, 7.7, 25.6] },
};

/** Camera presets: { pos, target } world coordinates mein. */
export function getView(id) {
  const { plotWidth: W, plotDepth: D, plinthHeight: P, plinthMargin: PM, ramp, guardRoom: GR } = CONFIG;

  if (HALL_VIEWS[id]) {
    const { floorY, centerZ } = hallDims();
    const v = HALL_VIEWS[id];
    return {
      pos: new THREE.Vector3(v.pos[0], v.pos[1] + floorY, v.pos[2] + centerZ),
      target: new THREE.Vector3(v.target[0], v.target[1] + floorY, v.target[2] + centerZ),
    };
  }
  if (id === 'aerial') return { pos: new THREE.Vector3(82, 64, 112), target: new THREE.Vector3(0, 0, 4) };
  if (id === 'top') return { pos: new THREE.Vector3(0, 175, 0.1), target: new THREE.Vector3(0, 0, 0) };
  if (id === 'fence') {
    return {
      pos: new THREE.Vector3(W / 2 + 7, P + 4.2, D / 2 + 7),
      target: new THREE.Vector3(W / 2 - 9, P + 2.8, D / 2 - 3),
    };
  }

  const [kind, gateId] = id.split(':');
  const gate = GATES.find((g) => g.id === gateId) || GATES[0];
  const f = sideFrame(gate.side);

  if (kind === 'gate') {
    const out = PM + (gate.type === 'ramp' ? ramp.length : 2) + 15;
    return { pos: localToWorld(f, 4, P + 4.5, out), target: localToWorld(f, 0, P + 1.6, -2) };
  }
  if (kind === 'guard') {
    return {
      pos: localToWorld(f, 5, P + 3.0, GR.offsetZ - 5.5), // warehouse chaudi hai, camera uske bahar rahe
      target: localToWorld(f, GR.offsetX, P + 1.4, GR.offsetZ),
    };
  }
  return getView('aerial');
}