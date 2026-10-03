import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox, mesh } from '../helpers.js';
import { signTexture } from '../textures.js';

/** Window glass + aluminium frame (glass plane wall ke plane mein). */
function addWindow(g, mats, w, h, cx, cy, cz, alongX) {
  const t = 0.05;
  const gw = alongX ? w : 0.02;
  const gd = alongX ? 0.02 : w;
  const glass = mesh(new THREE.BoxGeometry(gw, h, gd), mats.glass, { cast: false, receive: false });
  glass.position.set(cx, cy, cz);
  g.add(glass);

  const fw = (len) => (alongX ? [len, t, 0.08] : [0.08, t, len]);
  const [aw, ah, ad] = fw(w + t * 2);
  addBox(g, aw, ah, ad, mats.windowFrame, cx, cy + h / 2 + t / 2, cz);
  addBox(g, aw, ah, ad, mats.windowFrame, cx, cy - h / 2 - t / 2, cz);
  const sideOff = w / 2 + t / 2;
  const sx = alongX ? sideOff : 0;
  const sz = alongX ? 0 : sideOff;
  const vs = alongX ? [t, h, 0.08] : [0.08, h, t];
  addBox(g, ...vs, mats.windowFrame, cx + sx, cy, cz + sz);
  addBox(g, ...vs, mats.windowFrame, cx - sx, cy, cz - sz);
  // centre mullion
  addBox(g, ...(alongX ? [0.04, h, 0.06] : [0.06, h, 0.04]), mats.windowFrame, cx, cy, cz);
  // Sill
  addBox(g, ...(alongX ? [w + 0.2, 0.05, 0.22] : [0.22, 0.05, w + 0.2]), mats.coping, cx, cy - h / 2 - 0.08, cz);
}

/**
 * Guard room – gate ke left side, andar ki taraf, boundary wall se attached.
 * Local frame: +x = gate road ki taraf (badi window), +z = boundary wall (back wall chipki hui),
 * -z = compound (door).
 */
export function buildGuardRoom(number, mats, collector) {
  const { width: RW, depth: RD, height: RH, offsetX, offsetZ } = CONFIG.guardRoom;
  const P = CONFIG.plinthHeight;
  const T = 0.2;
  const room = new THREE.Group();
  room.name = `guard-room-${number}`;
  room.position.set(offsetX, P, offsetZ);

  const base = 0.18;
  // Plinth / floor slab with step
  addBox(room, RW + 0.5, base, RD + 0.5, mats.stone, 0, base / 2, 0);
  addBox(room, 1.3, 0.09, 0.45, mats.concrete, RW / 2 - 0.9, 0.045, -RD / 2 - 0.45);

  const y = (h) => base + h; // floor ke upar height
  const wallMat = mats.guardWall;

  // ---- +x wall: badi window (gate ki taraf) ----
  const winW = 2.0;
  const sill = 1.0;
  const head = 2.2;
  const xF = RW / 2 - T / 2;
  addBox(room, T, sill, RD, wallMat, xF, y(sill / 2), 0);
  addBox(room, T, RH - head, RD, wallMat, xF, y(head + (RH - head) / 2), 0);
  const sideW = (RD - winW) / 2;
  addBox(room, T, head - sill, sideW, wallMat, xF, y(sill + (head - sill) / 2), winW / 2 + sideW / 2);
  addBox(room, T, head - sill, sideW, wallMat, xF, y(sill + (head - sill) / 2), -(winW / 2 + sideW / 2));
  addWindow(room, mats, winW, head - sill, xF, y(sill + (head - sill) / 2), 0, false);

  // ---- -x wall: solid ----
  addBox(room, T, RH, RD, wallMat, -RW / 2 + T / 2, y(RH / 2), 0);

  // ---- +z wall: boundary wall se chipki hui (solid) ----
  const zB = RD / 2 - T / 2;
  const inner = RW - 2 * T;
  addBox(room, inner, RH, T, wallMat, 0, y(RH / 2), zB);

  // ---- -z wall (compound ki taraf): door ----
  const zD = -RD / 2 + T / 2;
  const doorW = 1.0;
  const doorH = 2.1;
  const doorCx = RW / 2 - 0.9;
  const leftEdge = doorCx - doorW / 2;
  const rightEdge = doorCx + doorW / 2;
  const lw = leftEdge - (-RW / 2 + T);
  addBox(room, lw, RH, T, wallMat, -RW / 2 + T + lw / 2, y(RH / 2), zD);
  const rw = RW / 2 - T - rightEdge;
  addBox(room, rw, RH, T, wallMat, rightEdge + rw / 2, y(RH / 2), zD);
  addBox(room, doorW, RH - doorH, T, wallMat, doorCx, y(doorH + (RH - doorH) / 2), zD);
  // Door panel + frame + handle
  addBox(room, doorW - 0.04, doorH - 0.02, 0.05, mats.wood, doorCx, y(doorH / 2), zD - 0.04);
  addBox(room, doorW + 0.1, 0.06, T + 0.04, mats.windowFrame, doorCx, y(doorH + 0.03), zD);
  addBox(room, 0.04, 0.16, 0.06, mats.gold, doorCx + doorW / 2 - 0.12, y(1.05), zD - 0.09);

  // Dado band (neeche maroon patti) – bahar ki surface par thin strips
  const dH = 0.35;
  const dT = 0.02;
  const dy = y(dH / 2);
  const o = { cast: false };
  addBox(room, dT, dH, RD + 2 * dT, mats.guardBand, RW / 2 + dT / 2, dy, 0, o);
  addBox(room, dT, dH, RD + 2 * dT, mats.guardBand, -RW / 2 - dT / 2, dy, 0, o);
  const dl = leftEdge + RW / 2;
  addBox(room, dl, dH, dT, mats.guardBand, -RW / 2 + dl / 2, dy, -RD / 2 - dT / 2, o);
  const dr = RW / 2 - rightEdge;
  addBox(room, dr, dH, dT, mats.guardBand, rightEdge + dr / 2, dy, -RD / 2 - dT / 2, o);

  // ---- Roof slab + parapet ----
  // Peeche (wall ki taraf) koi overhang/parapet nahi, taaki fencing ke neeche fit ho
  const roofY = y(RH);
  const ov = 0.3;
  const roofD = RD + ov;
  const roofZ = -ov / 2;
  addBox(room, RW + 2 * ov, 0.15, roofD, mats.roof, 0, roofY + 0.075, roofZ);
  const pH = 0.35;
  const pw = 0.12;
  const pY = roofY + 0.15 + pH / 2;
  const frontZ = -RD / 2 - ov;
  addBox(room, RW + 2 * ov, pH, pw, mats.guardWall, 0, pY, frontZ + pw / 2);
  const sideStart = frontZ + pw;
  const sideEnd = RD / 2 - 0.45;
  const sideLen = sideEnd - sideStart;
  addBox(room, pw, pH, sideLen, mats.guardWall, (RW + 2 * ov) / 2 - pw / 2, pY, sideStart + sideLen / 2);
  addBox(room, pw, pH, sideLen, mats.guardWall, -(RW + 2 * ov) / 2 + pw / 2, pY, sideStart + sideLen / 2);

  // Water tank (chhat par)
  const tank = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 20), mats.tank);
  tank.position.set(-RW / 2 + 0.75, roofY + 0.15 + 0.4, RD / 2 - 0.75);
  room.add(tank);
  const lid = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), mats.tank);
  lid.position.set(tank.position.x, roofY + 0.15 + 0.84, tank.position.z);
  room.add(lid);

  // Sign board – gate road ki taraf (+x), window ke upar
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture('SECURITY', `GUARD ROOM ${number}`),
    roughness: 0.5,
    emissive: '#ffffff',
    emissiveIntensity: 0.0,
  });
  signMat.emissiveMap = signMat.map;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), signMat);
  sign.rotation.y = Math.PI / 2;
  sign.position.set(RW / 2 + 0.012, y(2.52), 0);
  room.add(sign);
  collector.ownMaterials.push(signMat);
  collector.signMaterials.push(signMat);

  // Interior: desk + stool
  addBox(room, 0.6, 0.75, 1.6, mats.desk, RW / 2 - T - 0.35, y(0.375), 0);
  addBox(room, 0.4, 0.45, 0.4, mats.windowFrame, RW / 2 - T - 1.0, y(0.225), 0.2);
  // Ceiling tube light
  addBox(room, 0.08, 0.04, 1.0, mats.lamp, 0, y(RH - 0.05), 0, { cast: false });

  // Bahar wall light (door ke upar)
  const bulb = mesh(new THREE.SphereGeometry(0.07, 12, 8), mats.lamp, { cast: false });
  bulb.position.set(doorCx, y(doorH + 0.35), zD - 0.18);
  room.add(bulb);
  collector.lampMeshes.push(bulb);

  // Lights (sirf raat mein)
  const inside = new THREE.PointLight('#ffe2b0', 0, 9, 2);
  inside.position.set(0, y(RH - 0.3), 0);
  room.add(inside);
  collector.pointLights.push({ light: inside, night: 9 });

  return room;
}