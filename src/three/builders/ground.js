import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox, groundPlane, worldUVBox, mesh } from '../helpers.js';

/** Bahar ki zameen, raised plinth, andar ka lawn, aur bahar ki sadak. */
export function buildGround(mats) {
  const { plotWidth: W, plotDepth: D, plinthHeight: P, plinthMargin: PM, ramp, wallThickness: T } = CONFIG;
  const g = new THREE.Group();
  g.name = 'ground';

  // Bahar ki zameen
  const outer = groundPlane(900, 900, mats.grass, 4);
  g.add(outer);

  // Raised plinth (sides stone, top paver walkway)
  const plinth = mesh(worldUVBox(W + 2 * PM, P, D + 2 * PM), [
    mats.stone, mats.stone, mats.paver, mats.stone, mats.stone, mats.stone,
  ]);
  plinth.position.y = P / 2;
  g.add(plinth);
  // Plinth ke upar kinare par coping
  const edge = 0.12;
  addBox(g, W + 2 * PM + 0.1, edge, 0.25, mats.coping, 0, P + edge / 2 - 0.05, D / 2 + PM - 0.1, { cast: false });
  addBox(g, W + 2 * PM + 0.1, edge, 0.25, mats.coping, 0, P + edge / 2 - 0.05, -D / 2 - PM + 0.1, { cast: false });
  addBox(g, 0.25, edge, D + 2 * PM, mats.coping, W / 2 + PM - 0.1, P + edge / 2 - 0.05, 0, { cast: false });
  addBox(g, 0.25, edge, D + 2 * PM, mats.coping, -W / 2 - PM + 0.1, P + edge / 2 - 0.05, 0, { cast: false });

  // Andar ka lawn
  const lawn = groundPlane(W - T, D - T, mats.lawn, 4);
  lawn.position.y = P + 0.015;
  g.add(lawn);

  // Sadak: main gate ramp se main road tak
  const roadStart = D / 2 + PM + ramp.length;
  const mainRoadZ = roadStart + 40;
  const access = groundPlane(ramp.width, mainRoadZ - roadStart + 0.5, mats.asphalt, 4);
  access.position.set(0, 0.02, (roadStart + mainRoadZ) / 2);
  g.add(access);

  const roadW = 12;
  const main = groundPlane(900, roadW, mats.asphalt, 4);
  main.position.set(0, 0.025, mainRoadZ + roadW / 2);
  g.add(main);

  // Lane dashes (instanced)
  const dashGeo = new THREE.PlaneGeometry(3, 0.15);
  dashGeo.rotateX(-Math.PI / 2);
  const count = 120;
  const dashes = new THREE.InstancedMesh(dashGeo, mats.roadPaint, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    d.position.set(-420 + i * 7, 0.032, mainRoadZ + roadW / 2);
    d.updateMatrix();
    dashes.setMatrixAt(i, d.matrix);
  }
  dashes.receiveShadow = true;
  g.add(dashes);

  // Edge lines
  [mainRoadZ + 0.4, mainRoadZ + roadW - 0.4].forEach((z) => {
    const line = groundPlane(900, 0.12, mats.roadPaint, 1);
    line.position.set(0, 0.031, z);
    g.add(line);
  });

  // Road kerbs (access road ke liye gap)
  const kerbLen = 450 - ramp.width / 2;
  [-1, 1].forEach((s) => {
    addBox(g, kerbLen, 0.18, 0.2, mats.coping, s * (ramp.width / 2 + kerbLen / 2), 0.09, mainRoadZ - 0.1, { cast: false });
  });
  addBox(g, 900, 0.18, 0.2, mats.coping, 0, 0.09, mainRoadZ + roadW + 0.1, { cast: false });

  return { group: g, mainRoadZ, roadW };
}
