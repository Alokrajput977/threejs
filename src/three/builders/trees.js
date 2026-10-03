import * as THREE from 'three';
import { mesh } from '../helpers.js';

const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 7);
trunkGeo.translate(0, 1.2, 0);
const crownGeo = new THREE.IcosahedronGeometry(1, 1);

/** Simple low-poly ped – shadows ke saath realistic lagta hai. */
export function makeTree(mats, rand) {
  const t = new THREE.Group();
  t.add(mesh(trunkGeo, mats.bark));
  const leafMat = mats.leaves[Math.floor(rand() * mats.leaves.length)];
  const blobs = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < blobs; i++) {
    const c = mesh(crownGeo, leafMat);
    const s = 1.0 + rand() * 0.8;
    c.scale.set(s, s * (0.8 + rand() * 0.3), s);
    c.position.set((rand() - 0.5) * 1.6, 2.6 + rand() * 1.4, (rand() - 0.5) * 1.6);
    c.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    t.add(c);
  }
  const sc = 0.85 + rand() * 0.6;
  t.scale.setScalar(sc);
  t.rotation.y = rand() * Math.PI * 2;
  return t;
}
