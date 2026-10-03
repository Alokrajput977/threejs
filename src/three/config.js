import * as THREE from 'three';

/**
 * Saare measurements meters mein hain.
 * Apne map ke hisaab se plotWidth / plotDepth yahan change karein.
 */
export const CONFIG = {
  plotWidth: 100, // X direction (east-west)
  plotDepth: 80, // Z direction (north-south)

  wallHeight: 2.4,
  wallThickness: 0.3,
  pillarSize: 0.45,
  pillarSpacing: 3.0,

  plinthHeight: 1.0, // compound ka level bahar ki zameen se itna upar hai
  plinthMargin: 2.0, // wall ke bahar plinth ka hissa

  gateOpening: 6.0, // gate ki clear width
  gatePillarSize: 0.9,
  gatePillarHeight: 3.6,
  gateLeafHeight: 2.55,
  gateOpenAngle: 1.45, // radians (~83°)

  ramp: { length: 10, width: 7.5 }, // 1:10 slope, vehicle ramp

  guardRoom: {
    width: 3.6,
    depth: 3.2,
    height: 2.9,
    offsetX: -8.6, // gate ke left side (andar aate waqt)
    // Room ki back wall boundary wall ke andar wale face se chipki hui:
    // -(wallThickness / 2 + depth / 2) = -(0.15 + 1.6)
    offsetZ: -1.75,
  },
};

/**
 * 4 gates – har side par ek.
 * type: 'ramp' = vehicle slope, 'steps' = seedhiyan.
 * Kisi bhi gate ko ramp banana ho to type: 'ramp' kar dein.
 */
export const GATES = [
  { id: 'south', number: 1, name: 'Main gate', detail: 'South side, vehicle ramp', side: 'south', type: 'ramp' },
  { id: 'east', number: 2, name: 'East gate', detail: 'East side, steps', side: 'east', type: 'steps' },
  { id: 'north', number: 3, name: 'North gate', detail: 'North side, steps', side: 'north', type: 'steps' },
  { id: 'west', number: 4, name: 'West gate', detail: 'West side, steps', side: 'west', type: 'steps' },
];

/**
 * Har side ka local frame: local +z = bahar, local -z = compound ke andar,
 * local x = wall ki lambai.
 */
export function sideFrame(side) {
  const { plotWidth: W, plotDepth: D } = CONFIG;
  switch (side) {
    case 'south':
      return { pos: new THREE.Vector3(0, 0, D / 2), rotY: 0, length: W };
    case 'north':
      return { pos: new THREE.Vector3(0, 0, -D / 2), rotY: Math.PI, length: W };
    case 'east':
      return { pos: new THREE.Vector3(W / 2, 0, 0), rotY: Math.PI / 2, length: D };
    case 'west':
    default:
      return { pos: new THREE.Vector3(-W / 2, 0, 0), rotY: -Math.PI / 2, length: D };
  }
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
export function localToWorld(frame, x, y, z) {
  return new THREE.Vector3(x, y, z).applyAxisAngle(Y_AXIS, frame.rotY).add(frame.pos);
}