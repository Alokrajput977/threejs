import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { addBox, groundPlane, mesh, scaleUV, worldUVBox } from '../helpers.js';

/*
 * ATHLETE TRAINING HALL (warehouse) – sirf bahar ka design.
 *
 * Compound ke beech mein. Front (glass facade) main gate (south) ki taraf.
 * Lambai north-south, isliye LEFT (west) aur RIGHT (east) side par
 * 6-6 exposed steel I-beam pillars, jo roof ke upar arch ban kar mil jaate hain.
 *
 * Size: 78 m (chaudai, guard rooms tak) x 56 m (lambai, gate 1 se gate 3 ki taraf).
 * Height: 3 floor (3 x 3.6 m = 10.8 m eave) + curved barrel roof.
 * Facade bands = 3 floors: brick (ground), navy cladding (1st), glass ribbon + charcoal (2nd).
 */

export const HALL = {
  width: 78, // east-west – east/west guard rooms tak (~6 m gap)
  length: 56, // north-south – gate 1 (south) se gate 3 (north) ki taraf, 5 bays x 11.2 m
  floorH: 3.6,
  floors: 3,
  roofRise: 5.0,
  podium: 0.45,
  centerZ: 0,
  pillarsPerSide: 6,
};

const T = 0.3; // wall thickness

/* ---------- Procedural textures ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Trapezoidal metal cladding – vertical ribs (1 tile = 1 m)
const claddingTex = () => canvasTex(256, 64, (ctx, w, h) => {
  ctx.fillStyle = '#d6d6d6';
  ctx.fillRect(0, 0, w, h);
  const ribs = 5;
  const rw = w / ribs;
  for (let i = 0; i < ribs; i++) {
    const x = i * rw;
    const g = ctx.createLinearGradient(x, 0, x + rw * 0.3, 0);
    g.addColorStop(0, '#9a9a9a');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#b4b4b4');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, rw * 0.3, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + rw * 0.3, 0, 3, h);
  }
});

// Roller shutter – horizontal slats
const shutterTex = () => canvasTex(64, 128, (ctx, w, h) => {
  ctx.fillStyle = '#c9cdd1';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, y + 2, w, 2);
  }
});

// Standing-seam roof – seams har 0.5 m
const roofTex = () => canvasTex(64, 256, (ctx, w, h) => {
  ctx.fillStyle = '#c4c9cc';
  ctx.fillRect(0, 0, w, h);
  [0.25, 0.75].forEach((t) => {
    const y = t * h;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + 3, w, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(0, y, w, 3);
  });
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
});

// Facade lettering (transparent background)
function letteringTex(text) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 224;
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 150px Arial Black, Arial, sans-serif';
  ctx.fillText(text, 1024, 100, 1960);
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(424, 196, 1200, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- Geometry helpers ---------- */
function arcBand(cy, rIn, rOut, halfX, depth) {
  const rm = (rIn + rOut) / 2;
  const a0 = Math.acos(Math.min(1, halfX / rm));
  const s = new THREE.Shape();
  s.absarc(0, cy, rOut, a0, Math.PI - a0, false);
  s.absarc(0, cy, rIn, Math.PI - a0, a0, true);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function rod(parent, mat, a, b, r = 0.03) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

/**
 * Ek facade segment par 3 floor ke bands.
 * alongX: segment x ke along hai (front/back) ya z ke along (sides).
 * inward: andar ki direction (glass ke peeche dark backing ke liye).
 */
function addFloorBands(g, m, { len, cx, cz, alongX, inward, H }) {
  const F = HALL.floorH;
  const box = (h, y, mat, thick = T) =>
    alongX ? addBox(g, len, h, thick, mat, cx, y, cz) : addBox(g, thick, h, len, mat, cx, y, cz);

  // Ground floor – brick (boundary wall jaisa, wall finish toggle follow karta hai)
  box(F, F / 2, m.brick);
  box(0.14, F, m.trim, T + 0.1);
  // First floor – navy cladding
  box(F * 2 - 0.2 - F, F + (F - 0.2) / 2, m.navy);
  // Second floor – ribbon glass band + charcoal top
  const gy0 = 2 * F - 0.2;
  const gy1 = gy0 + 1.9;
  const glassH = gy1 - gy0;
  box(glassH, (gy0 + gy1) / 2, m.glass, 0.04);
  const bx = cx + inward.x * 0.6;
  const bz = cz + inward.z * 0.6;
  const back = alongX
    ? addBox(g, len, glassH, 0.05, m.backing, bx, (gy0 + gy1) / 2, bz, { cast: false })
    : addBox(g, 0.05, glassH, len, m.backing, bx, (gy0 + gy1) / 2, bz, { cast: false });
  back.userData.hideInside = true; // andar jaane par chhup jaata hai (glass se bahar dikhe)
  box(0.12, gy0, m.trim, T + 0.12);
  box(0.12, gy1, m.trim, T + 0.12);
  const top = H + 0.22;
  box(top - gy1, (gy1 + top) / 2, m.charcoal);

  // Mullions
  const geos = [];
  const n = Math.max(1, Math.round(len / 1.5));
  for (let i = 1; i < n; i++) {
    const t = -len / 2 + (i * len) / n;
    const b = alongX ? new THREE.BoxGeometry(0.07, glassH, 0.16) : new THREE.BoxGeometry(0.16, glassH, 0.07);
    b.translate(alongX ? cx + t : cx, (gy0 + gy1) / 2, alongX ? cz : cz + t);
    geos.push(b);
  }
  if (geos.length) g.add(mesh(mergeGeometries(geos), m.frame));
}

/* ---------- Main builder ---------- */
export function buildWarehouse(mats, collector) {
  const P = CONFIG.plinthHeight;
  const { width: W, length: L, floorH: F, floors, roofRise: rise, podium: PH, centerZ } = HALL;
  const H = F * floors; // eave height (3 floors)

  const root = new THREE.Group();
  root.name = 'athlete-hall';
  root.position.z = centerZ;

  /* Materials */
  const cladT = claddingTex();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const m = {
    brick: mats.wall,
    navy: std({ map: cladT, color: '#25365a', metalness: 0.45, roughness: 0.5 }),
    charcoal: std({ map: cladT, color: '#3c4248', metalness: 0.45, roughness: 0.5 }),
    accent: std({ map: cladT, color: '#6a2c93', metalness: 0.35, roughness: 0.5 }),
    trim: std({ color: '#e9ebee', metalness: 0.3, roughness: 0.45 }),
    steel: std({ color: '#f1f3f5', metalness: 0.55, roughness: 0.32 }),
    frame: std({ color: '#2a2f35', metalness: 0.6, roughness: 0.35 }),
    roof: std({ map: roofTex(), color: '#b9c0c4', metalness: 0.65, roughness: 0.38, side: THREE.DoubleSide }),
    glass: std({ color: '#86aec6', metalness: 0.6, roughness: 0.05, transparent: true, opacity: 0.55 }),
    backing: std({ color: '#1b222a', roughness: 0.9, emissive: '#ffd08a', emissiveIntensity: 0 }),
    shutter: std({ map: shutterTex(), color: '#cfd4d8', metalness: 0.5, roughness: 0.45 }),
    rubber: std({ color: '#151515', roughness: 0.9 }),
    exit: std({ color: '#0f8a3c', emissive: '#22ff77', emissiveIntensity: 0.25 }),
    door: std({ color: '#6f7780', metalness: 0.5, roughness: 0.4 }),
    letters: std({
      map: letteringTex('GYMNASTICS ACADEMY'),
      transparent: true,
      alphaTest: 0.3,
      emissive: '#ffffff',
      roughness: 0.4,
      emissiveIntensity: 0,
    }),
  };
  m.letters.emissiveMap = m.letters.map;
  Object.entries(m).forEach(([k, v]) => k !== 'brick' && collector.ownMaterials.push(v));
  collector.signMaterials.push(m.backing, m.letters);

  /* ---------- Podium, steps, plaza, rear apron (ground level) ---------- */
  const podium = mesh(worldUVBox(W + 3, PH, L + 3), [
    mats.stone, mats.stone, mats.concrete, mats.stone, mats.stone, mats.stone,
  ]);
  podium.position.set(0, P + PH / 2, 0);
  root.add(podium);

  const rise1 = 0.15;
  const nSteps = Math.round(PH / rise1) - 1;
  for (let i = 0; i < nSteps; i++) {
    const top = PH - (i + 1) * rise1;
    addBox(root, 15, top, 0.35, mats.concrete, 0, P + top / 2, L / 2 + 1.5 + i * 0.35 + 0.175);
  }
  const plaza = groundPlane(20, 2.2, mats.pathPaver, 1);
  plaza.position.set(0, P + 0.03, L / 2 + 1.5 + 1.1);
  root.add(plaza);
  const apron = groundPlane(30, 2.4, mats.asphalt, 4);
  apron.position.set(0, P + 0.036, -(L / 2 + 1.5 + 1.2));
  root.add(apron);

  /* ---------- Building (floor level) ---------- */
  const b = new THREE.Group();
  b.position.y = P + PH;
  root.add(b);

  // Side walls (west -x = LEFT, east +x = RIGHT jab front se dekho)
  [-1, 1].forEach((s) => {
    addFloorBands(b, m, {
      len: L, cx: s * (W / 2 - T / 2), cz: 0, alongX: false, inward: new THREE.Vector3(-s, 0, 0), H,
    });
  });

  // Front facade: beech mein curtain wall, dono taraf bands
  const cwHalf = 9;
  const sideW = W / 2 - cwHalf;
  [-1, 1].forEach((s) => {
    addFloorBands(b, m, {
      len: sideW, cx: s * (cwHalf + sideW / 2), cz: L / 2 - T / 2, alongX: true, inward: new THREE.Vector3(0, 0, -1), H,
    });
  });

  // Lambe facade ko todne ke liye vertical white trims (front + back), har ~6 m
  {
    const geos = [];
    const step = 6;
    [L / 2 + 0.06, -L / 2 - 0.06].forEach((z) => {
      for (let x = cwHalf + step; x < W / 2 - 1.5; x += step) {
        [-1, 1].forEach((s) => {
          const g = new THREE.BoxGeometry(0.3, H + 0.2, 0.18);
          g.translate(s * x, (H + 0.2) / 2, z);
          geos.push(g);
        });
      }
    });
    if (geos.length) b.add(mesh(mergeGeometries(geos), m.trim));
  }

  // Curtain wall glass + backing + 3 floor spandrels + mullions
  addBox(b, cwHalf * 2, H, 0.04, m.glass, 0, H / 2, L / 2 - 0.2);
  addBox(b, cwHalf * 2, H, 0.05, m.backing, 0, H / 2, L / 2 - 1.4, { cast: false }).userData.hideInside = true;
  for (let f = 1; f < floors; f++) {
    addBox(b, cwHalf * 2, 0.45, 0.22, m.charcoal, 0, f * F, L / 2 - 0.1);
    // andar floor slab ka hint
    addBox(b, cwHalf * 2, 0.25, 1.2, mats.concrete, 0, f * F, L / 2 - 0.8, { cast: false }).userData.hideInside = true;
  }
  addBox(b, cwHalf * 2 + 0.2, 0.3, 0.3, m.charcoal, 0, H - 0.15, L / 2 - 0.1);
  {
    const geos = [];
    for (let k = 0; k <= 10; k++) {
      const x = -cwHalf + (k * cwHalf * 2) / 10;
      const g = new THREE.BoxGeometry(0.09, H, 0.22);
      g.translate(x, H / 2, L / 2 - 0.1);
      geos.push(g);
    }
    for (let f = 0; f < floors; f++) {
      const g = new THREE.BoxGeometry(cwHalf * 2, 0.07, 0.16);
      g.translate(0, f * F + F * 0.55, L / 2 - 0.1);
      geos.push(g);
    }
    b.add(mesh(mergeGeometries(geos), m.frame));
  }

  // Purple accent fins – curtain wall ke dono taraf (signature element)
  [-1, 1].forEach((s) => {
    addBox(b, 0.45, H + 1.2, 1.1, m.accent, s * (cwHalf + 0.25), (H + 1.2) / 2, L / 2 + 0.35);
    addBox(b, 0.5, 0.12, 1.15, m.trim, s * (cwHalf + 0.25), H + 1.26, L / 2 + 0.35);
  });

  // Entrance: double glass door frame + canopy
  addBox(b, 0.14, 2.9, 0.25, m.frame, -1.9, 1.45, L / 2 - 0.05);
  addBox(b, 0.14, 2.9, 0.25, m.frame, 1.9, 1.45, L / 2 - 0.05);
  addBox(b, 3.94, 0.16, 0.25, m.frame, 0, 2.9, L / 2 - 0.05);
  addBox(b, 0.08, 2.75, 0.2, m.frame, 0, 1.4, L / 2 - 0.05);
  [-0.18, 0.18].forEach((x) => addBox(b, 0.04, 1.2, 0.08, mats.gold, x, 1.2, L / 2 + 0.08));

  const canopyD = 3.6;
  addBox(b, 13, 0.32, canopyD, m.steel, 0, 3.35, L / 2 + canopyD / 2);
  addBox(b, 13.1, 0.08, canopyD + 0.05, m.frame, 0, 3.55, L / 2 + canopyD / 2);
  [-4.5, -1.5, 1.5, 4.5].forEach((x) => {
    const lamp = addBox(b, 0.6, 0.03, 0.6, mats.lamp, x, 3.18, L / 2 + canopyD / 2, { cast: false });
    collector.lampMeshes.push(lamp);
  });
  [-5.6, 5.6].forEach((x) => {
    rod(b, m.frame, new THREE.Vector3(x, 6.2, L / 2), new THREE.Vector3(x, 3.5, L / 2 + canopyD - 0.2), 0.035);
  });
  const entryLight = new THREE.PointLight('#ffe2b5', 0, 18, 2);
  entryLight.position.set(0, 3.0, L / 2 + 2);
  b.add(entryLight);
  collector.pointLights.push({ light: entryLight, night: 40 });

  /* ---------- Gables (arch area above eave) ---------- */
  const a = W / 2 + 0.6; // roof overhang half-span
  const Rr = (a * a + rise * rise) / (2 * rise);
  const cy = H + rise - Rr;
  const gableShape = new THREE.Shape();
  const yW = cy + Math.sqrt(Rr * Rr - (W / 2) * (W / 2));
  const aW = Math.atan2(yW - cy, W / 2);
  gableShape.moveTo(-W / 2, H);
  gableShape.lineTo(W / 2, H);
  gableShape.absarc(0, cy, Rr, aW, Math.PI - aW, false);
  gableShape.closePath();
  [1, -1].forEach((s) => {
    const geo = new THREE.ExtrudeGeometry(gableShape, { depth: T, bevelEnabled: false, curveSegments: 40 });
    geo.translate(0, 0, s > 0 ? L / 2 - T : -L / 2);
    b.add(mesh(geo, m.charcoal));
  });

  // Facade lettering on front gable
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.41), m.letters);
  letters.position.set(0, H + 1.8, L / 2 + 0.03);
  b.add(letters);

  /* ---------- Rear facade: loading bays ---------- */
  addFloorBands(b, m, { len: W, cx: 0, cz: -L / 2 + T / 2, alongX: true, inward: new THREE.Vector3(0, 0, 1), H });
  const sw = 4.6;
  const sh = 4.8;
  [-10, 0, 10].forEach((x) => {
    addBox(b, sw, sh, 0.08, m.shutter, x, sh / 2, -L / 2 - 0.06);
    addBox(b, sw + 0.3, 0.55, 0.5, m.charcoal, x, sh + 0.27, -L / 2 - 0.2); // shutter box
    [-1, 1].forEach((k) => addBox(b, 0.12, sh, 0.18, m.frame, x + k * (sw / 2 + 0.06), sh / 2, -L / 2 - 0.1));
    [-1, 1].forEach((k) => addBox(b, 0.25, 0.32, 0.18, m.rubber, x + k * 1.6, -PH / 2, -L / 2 - 1.5 - 0.09));
  });
  addBox(b, 30, 0.3, 2.6, m.steel, 0, 5.75, -L / 2 - 1.3);
  addBox(b, W + 3, 0.06, 0.25, mats.hazard, 0, 0.01, -L / 2 - 1.37, { cast: false });
  const rearLight = new THREE.PointLight('#ffe2b5', 0, 20, 2);
  rearLight.position.set(0, 5.2, -L / 2 - 2);
  b.add(rearLight);
  collector.pointLights.push({ light: rearLight, night: 45 });

  /* ---------- Side fire exits ---------- */
  [-1, 1].forEach((s) => {
    const x = s * (W / 2 + 0.03);
    addBox(b, 0.08, 2.3, 1.1, m.door, x, 1.15, 0);
    addBox(b, 0.12, 0.1, 1.3, m.frame, x, 2.35, 0);
    addBox(b, 1.0, 0.1, 1.6, m.steel, s * (W / 2 + 0.5), 2.75, 0);
    addBox(b, 0.04, 0.22, 0.5, m.exit, s * (W / 2 + 0.06), 2.55, 0, { cast: false });
  });

  /* ---------- 6 + 6 pillars (I-beam) + roof arches ---------- */
  const colX = W / 2 + 0.55;
  const colTop = H + 0.3;
  const n = HALL.pillarsPerSide;
  const bay = L / (n - 1);
  const ribGeo = arcBand(cy, Rr + 0.03, Rr + 0.45, colX, 0.36);
  const lampGeo = new THREE.BoxGeometry(0.22, 0.3, 0.16);

  for (let i = 0; i < n; i++) {
    const z = -L / 2 + i * bay;
    [-1, 1].forEach((s) => {
      const x = s * colX;
      addBox(b, 0.8, 0.5, 0.8, mats.concrete, x, 0.25, z); // pedestal
      const h = colTop - 0.5;
      const y = 0.5 + h / 2;
      addBox(b, 0.06, h, 0.46, m.steel, x - 0.22, y, z); // flange
      addBox(b, 0.06, h, 0.46, m.steel, x + 0.22, y, z); // flange
      addBox(b, 0.38, h, 0.05, m.steel, x, y, z); // web
      addBox(b, 0.56, 0.05, 0.56, m.frame, x, 0.525, z); // base plate
      // Downpipe
      const pipe = mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 10), m.charcoal);
      pipe.position.set(s * (W / 2 + 0.1), H / 2, z + (i === n - 1 ? -0.45 : 0.45));
      b.add(pipe);
      // Pillar lamp (bahar ki taraf)
      const lamp = mesh(lampGeo, mats.lamp, { cast: false });
      lamp.position.set(x + s * 0.3, 4.4, z);
      b.add(lamp);
      collector.lampMeshes.push(lamp);
    });
    // Arch rib – dono pillars ko roof ke upar jodta hai
    const rib = mesh(ribGeo, m.steel);
    rib.position.z = z;
    b.add(rib);
  }

  // End bays mein X-bracing (steel rods)
  [-1, 1].forEach((s) => {
    [[0, 1], [n - 2, n - 1]].forEach(([i0, i1]) => {
      const z0 = -L / 2 + i0 * bay;
      const z1 = -L / 2 + i1 * bay;
      const x = s * (colX - 0.05);
      rod(b, m.frame, new THREE.Vector3(x, F + 0.2, z0), new THREE.Vector3(x, H - 0.2, z1));
      rod(b, m.frame, new THREE.Vector3(x, F + 0.2, z1), new THREE.Vector3(x, H - 0.2, z0));
    });
  });

  /* ---------- Barrel roof ---------- */
  const Lr = L + 1.2;
  const phi = Math.asin(a / Rr);
  const roofGeo = new THREE.CylinderGeometry(Rr, Rr, Lr, 64, 1, true, Math.PI - phi, phi * 2);
  scaleUV(roofGeo, Rr * phi * 2, Lr);
  roofGeo.rotateX(Math.PI / 2);
  const roof = mesh(roofGeo, m.roof);
  roof.position.y = cy;
  b.add(roof);

  // Ridge skylight
  const skyGeo = new THREE.CylinderGeometry(Rr + 0.06, Rr + 0.06, L - 4, 12, 1, true, Math.PI - 0.07, 0.14);
  skyGeo.rotateX(Math.PI / 2);
  const sky = mesh(skyGeo, m.glass, { cast: false });
  sky.position.y = cy;
  b.add(sky);
  [-0.07, 0.07].forEach((t) => {
    const xx = Math.sin(Math.PI - t) * (Rr + 0.08);
    const yy = -Math.cos(Math.PI - t) * (Rr + 0.08) + cy;
    addBox(b, 0.1, 0.12, L - 4, m.frame, xx, yy, 0);
  });

  // Roof edge fascia (front/back) + eave gutters
  [L / 2 + 0.6, -L / 2 - 0.6].forEach((z) => {
    const f = mesh(arcBand(cy, Rr - 0.25, Rr + 0.04, a - 0.05, 0.08), m.charcoal);
    f.position.z = z;
    b.add(f);
  });
  [-1, 1].forEach((s) => {
    addBox(b, 0.26, 0.24, Lr, m.charcoal, s * (a - 0.05), H - 0.08, 0);
  });

  return root;
}