import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox, mesh } from '../helpers.js';

/** Side profile (z-y) ko width ke along extrude karta hai, local frame mein. */
function extrudeProfile(points, width, xCenter, zStart) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // shape x -> +z, extrude -> -x
  geo.translate(xCenter + width / 2, 0, zStart);
  return geo;
}

/**
 * Gate ke bahar ka approach:
 *  - 'ramp'  : vehicle slope (plinth level se zameen tak), side kerb walls ke saath
 *  - 'steps' : pedestrian seedhiyan
 */
export function buildApproach(type, mats) {
  const { plinthHeight: P, plinthMargin: PM, gateOpening: GO, ramp } = CONFIG;
  const g = new THREE.Group();
  g.name = `approach-${type}`;

  if (type === 'ramp') {
    const L = ramp.length;
    const W = ramp.width;
    // Ramp body: triangle profile (gate par P height, aage 0)
    const rampGeo = extrudeProfile([[0, 0], [0, P], [L, 0]], W, 0, PM);
    const body = mesh(rampGeo, [mats.stone, mats.ramp]);
    g.add(body);

    // Side kerb walls
    const kH = 0.32;
    const kT = 0.25;
    const kerbProfile = [[0, 0], [0, P + kH], [L, kH], [L, 0]];
    [-1, 1].forEach((s) => {
      const geo = extrudeProfile(kerbProfile, kT, s * (W / 2 + kT / 2), PM);
      g.add(mesh(geo, [mats.pillar, mats.coping]));
    });

    // Hazard strip – gate par, aur ramp ke neeche
    addBox(g, W, 0.02, 0.3, mats.hazard, 0, P + 0.01, PM + 0.15, { cast: false });
    const slope = Math.atan2(P, L);
    const foot = addBox(g, W, 0.02, 0.3, mats.hazard, 0, 0.03, PM + L - 0.4, { cast: false });
    foot.rotation.x = slope;

    // Reflective bollards ramp ke neeche
    [-1, 1].forEach((s) => {
      const b = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 14), mats.hazard);
      b.position.set(s * (W / 2 + 0.6), 0.45, PM + L + 0.4);
      g.add(b);
      const cap = mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.gateFrame);
      cap.position.set(s * (W / 2 + 0.6), 0.9, PM + L + 0.4);
      g.add(cap);
    });
  } else {
    const rise = 0.2;
    const tread = 0.35;
    const n = Math.round(P / rise) - 1;
    const sw = GO + 1.0;
    for (let i = 0; i < n; i++) {
      const top = P - (i + 1) * rise;
      addBox(g, sw, top, tread, mats.concrete, 0, top / 2, PM + i * tread + tread / 2);
      // nosing
      addBox(g, sw, 0.03, 0.05, mats.coping, 0, top + 0.015, PM + i * tread + 0.025, { cast: false });
    }
    // Side cheek walls
    const len = n * tread;
    [-1, 1].forEach((s) => {
      addBox(g, 0.3, P + 0.2, len, mats.stone, s * (sw / 2 + 0.15), (P + 0.2) / 2, PM + len / 2);
      addBox(g, 0.36, 0.06, len + 0.06, mats.coping, s * (sw / 2 + 0.15), P + 0.23, PM + len / 2);
    });
  }
  return g;
}
