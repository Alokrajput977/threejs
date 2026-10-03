import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mesh } from '../helpers.js';

/** Razor wire coil ke liye helix curve (x axis ke along). */
class HelixCurve extends THREE.Curve {
  constructor(length, radius, pitch) {
    super();
    this.length = length;
    this.radius = radius;
    this.turns = length / pitch;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    // halka sa irregular – real concertina jaisa
    const r = this.radius * (1 + 0.06 * Math.sin(a * 3.0));
    return target.set(t * this.length - this.length / 2, Math.sin(a) * r, Math.cos(a) * r);
  }
}

const postGeo = new THREE.BoxGeometry(0.05, 1, 0.05);
const armGeo = new THREE.BoxGeometry(0.04, 1, 0.04);

/**
 * Wall ke upar security fencing:
 * Y-shaped angle posts + barbed wire strands + concertina coil.
 */
export function buildFenceRun(x0, x1, postXs, mats) {
  const { wallHeight: H, plinthHeight: P } = CONFIG;
  const g = new THREE.Group();
  g.name = 'fence-run';

  const len = x1 - x0;
  const cx = x0 + len / 2;
  const y0 = P + H + 0.08; // coping ka top
  const postH = 0.75;
  const armLen = 0.55;
  const armTilt = THREE.MathUtils.degToRad(40);

  // Posts (InstancedMesh – fast)
  const posts = new THREE.InstancedMesh(postGeo, mats.fence, postXs.length);
  const arms = new THREE.InstancedMesh(armGeo, mats.fence, postXs.length * 2);
  const dummy = new THREE.Object3D();
  postXs.forEach((x, i) => {
    dummy.position.set(x, y0 + postH / 2, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, postH, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);

    [1, -1].forEach((s, j) => {
      const tilt = s * armTilt; // +z bahar, -z andar
      dummy.rotation.set(tilt, 0, 0);
      dummy.scale.set(1, armLen, 1);
      dummy.position.set(x, y0 + postH + Math.cos(tilt) * armLen / 2, Math.sin(tilt) * armLen / 2);
      dummy.updateMatrix();
      arms.setMatrixAt(i * 2 + j, dummy.matrix);
    });
  });
  posts.castShadow = arms.castShadow = true;
  g.add(posts, arms);

  // Barbed wire strands
  const wireGeo = new THREE.CylinderGeometry(0.007, 0.007, len, 4, 1);
  wireGeo.rotateZ(Math.PI / 2);
  const addWire = (y, z) => {
    const w = mesh(wireGeo, mats.wire, { cast: false, receive: false });
    w.position.set(cx, y, z);
    g.add(w);
  };
  [0.18, 0.36, 0.54, 0.72].forEach((h) => addWire(y0 + h, 0));
  [0.25, 0.5].forEach((d) => {
    [1, -1].forEach((s) => {
      const tilt = s * armTilt;
      addWire(y0 + postH + Math.cos(tilt) * d, Math.sin(tilt) * d);
    });
  });

  // Barbs – chhote crosses wire par (instanced)
  const barbGeo = new THREE.BoxGeometry(0.004, 0.07, 0.004);
  const barbCount = Math.floor(len / 0.25) * 4;
  const barbs = new THREE.InstancedMesh(barbGeo, mats.wire, barbCount);
  let bi = 0;
  const strandYs = [0.18, 0.36, 0.54, 0.72];
  for (let x = x0 + 0.1; x < x1 - 0.1 && bi < barbCount; x += 0.25) {
    for (const h of strandYs) {
      if (bi >= barbCount) break;
      dummy.position.set(x, y0 + h, 0);
      dummy.rotation.set(Math.random(), 0, Math.PI / 4);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      barbs.setMatrixAt(bi++, dummy.matrix);
    }
  }
  barbs.count = bi;
  g.add(barbs);

  // Concertina coil – Y ke beech mein
  const curve = new HelixCurve(len, 0.3, 0.32);
  const coilGeo = new THREE.TubeGeometry(curve, Math.ceil(curve.turns * 14), 0.009, 4, false);
  const coil = mesh(coilGeo, mats.wire, { cast: true, receive: false });
  coil.position.set(cx, y0 + postH + 0.3, 0);
  g.add(coil);

  return g;
}
