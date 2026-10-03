import * as THREE from 'three';

export function createMaterials(tx) {
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const mats = {
    // Wall panel – brick ya plaster (setWallStyle se badalta hai)
    wall: std({ map: tx.brick, bumpMap: tx.brickBump, bumpScale: 2.2, roughness: 0.92, metalness: 0 }),
    pillar: std({ map: tx.plaster, color: '#eadbbd', roughness: 0.88 }),
    gatePillar: std({ map: tx.plaster, color: '#e2cfa8', roughness: 0.85 }),
    stone: std({ map: tx.stone, roughness: 0.95 }),
    coping: std({ map: tx.concrete, color: '#d7d3cb', roughness: 0.8 }),
    concrete: std({ map: tx.concrete, roughness: 0.9 }),
    ramp: std({ map: tx.ramp, roughness: 0.9 }),
    paver: std({ map: tx.paver, roughness: 0.88 }),
    asphalt: std({ map: tx.asphalt, roughness: 0.96, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    pathPaver: std({ map: tx.paver, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    grass: std({ map: tx.grass, roughness: 1 }),
    lawn: std({ map: tx.lawn, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    hazard: std({ map: tx.hazard, roughness: 0.6 }),
    roadPaint: std({ color: '#f1efe6', roughness: 0.6 }),

    // Gate metal
    gateFrame: std({ color: '#23272b', metalness: 0.75, roughness: 0.38 }),
    jaali: std({
      map: tx.jaali,
      color: '#2c3136',
      metalness: 0.7,
      roughness: 0.42,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    }),
    gold: std({ color: '#c9a03a', metalness: 0.9, roughness: 0.28 }),

    // Fencing (galvanised steel)
    fence: std({ color: '#8d969c', metalness: 0.85, roughness: 0.35 }),
    wire: std({ color: '#b4bcc1', metalness: 0.9, roughness: 0.3 }),

    // Guard room
    guardWall: std({ map: tx.plaster, color: '#efe0b0', roughness: 0.9 }),
    guardBand: std({ map: tx.plaster, color: '#8a3d2b', roughness: 0.85 }),
    roof: std({ map: tx.concrete, color: '#cfcac0', roughness: 0.85 }),
    windowFrame: std({ color: '#3b4146', metalness: 0.6, roughness: 0.4 }),
    glass: std({
      color: '#9fc3d6',
      metalness: 0.2,
      roughness: 0.05,
      transparent: true,
      opacity: 0.38,
      emissive: '#ffc977',
      emissiveIntensity: 0,
    }),
    wood: std({ map: tx.wood, roughness: 0.7 }),
    tank: std({ color: '#1f2326', roughness: 0.55 }),
    desk: std({ color: '#7a5a3c', roughness: 0.7 }),

    // Lamps
    lamp: std({ color: '#fff4dc', emissive: '#ffcf7a', emissiveIntensity: 0.05, roughness: 0.3 }),
    lampBody: std({ color: '#1e2124', metalness: 0.6, roughness: 0.45 }),

    // Trees
    bark: std({ color: '#5a4330', roughness: 0.95 }),
    leaves: [
      std({ color: '#3f6b2a', roughness: 0.9, flatShading: true }),
      std({ color: '#4d7a33', roughness: 0.9, flatShading: true }),
      std({ color: '#355c24', roughness: 0.9, flatShading: true }),
    ],
  };

  mats.setWallStyle = (style) => {
    const m = mats.wall;
    if (style === 'plaster') {
      m.map = tx.plaster;
      m.bumpMap = null;
      m.color.set('#e4d1a9');
    } else {
      m.map = tx.brick;
      m.bumpMap = tx.brickBump;
      m.color.set('#ffffff');
    }
    m.needsUpdate = true;
  };

  mats.dispose = () => {
    Object.values(mats).forEach((m) => {
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else if (m && m.isMaterial) m.dispose();
    });
  };

  return mats;
}
