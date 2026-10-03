import * as THREE from 'three';
import { addBox, mesh, scaleUV } from '../helpers.js';

/*
 * HALL KE ANDAR KA FRONT HISSA (entrance ki taraf)
 *
 *  Entrance se andar aate hi:
 *   - Saamne-left: curved RECEPTION desk + logo wall + waiting sofa
 *   - RIGHT side: stairs (flight 1 -> first floor, flight 2 -> second floor)
 *   - Right side ground floor: MANAGER room (andar glass CABIN) + OWNER room
 *   - First floor: corridor + 2 rooms (Coaches room, Physio room)
 *   - Second floor: corridor + Girls toilet + Boys toilet
 *   - Left (west) front corner: 5 ft (1.52 m) deep FOAM PIT + tumbling track
 *
 * Saare coordinates hall floor ke local frame mein (y = 0 floor).
 */

export const PIT = { x0: -38.64, x1: -29.4, z0: 19.6, z1: 27.62, depth: 1.524 }; // 5 ft
export const BLOCK = { x0: 9.5, x1: 38.64, z0: 19.0, z1: 27.62, corridor: 20.8, levels: [0, 3.5, 7.0], top: 10.6 };

const SLAB = 0.22;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- Canvas helpers ---------- */
function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const tileTex = (base, line) => canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.fillStyle = line;
  for (let k = 0; k < 4; k++) {
    ctx.fillRect(k * 64, 0, 2, h);
    ctx.fillRect(0, k * 64, w, 2);
  }
}, { repeat: true });

function drawPerson(ctx, x, y, s, girl) {
  ctx.beginPath();
  ctx.arc(x, y - 52 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  if (girl) {
    ctx.beginPath();
    ctx.moveTo(x, y - 36 * s);
    ctx.lineTo(x + 24 * s, y + 14 * s);
    ctx.lineTo(x - 24 * s, y + 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 10 * s, y + 14 * s, 7 * s, 30 * s);
    ctx.fillRect(x + 3 * s, y + 14 * s, 7 * s, 30 * s);
  } else {
    ctx.fillRect(x - 15 * s, y - 36 * s, 30 * s, 46 * s);
    ctx.fillRect(x - 13 * s, y + 10 * s, 11 * s, 36 * s);
    ctx.fillRect(x + 2 * s, y + 10 * s, 11 * s, 36 * s);
  }
}

function signTex(title, { bg = '#1d2b6b', fg = '#ffffff', sub = '', icon = null, w = 512, h = 128 } = {}) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = fg;
    let tx = w / 2;
    if (icon) {
      drawPerson(ctx, h * 0.55, h * 0.56, h / 128, icon === 'girl');
      tx = w / 2 + h * 0.3;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(h * (sub ? 0.36 : 0.44))}px Arial, sans-serif`;
    ctx.fillText(title, tx, sub ? h * 0.4 : h / 2, w - (icon ? h * 1.2 : 30));
    if (sub) {
      ctx.font = `600 ${Math.round(h * 0.2)}px Arial, sans-serif`;
      ctx.fillText(sub, tx, h * 0.76, w - 30);
    }
  });
}

/* ---------- Geometry helpers ---------- */
function rodMesh(mat, a, b, r = 0.025, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

function floorPlane(mat, x0, x1, z0, z1, y, tile = 2) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  scaleUV(geo, (x1 - x0) / tile, (z1 - z0) / tile);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  return m;
}

/* =================================================================== */
export function buildHallRooms(g, { M, mats, collector }) {
  const std = (o) => {
    const m = new THREE.MeshStandardMaterial(o);
    collector.ownMaterials.push(m);
    return m;
  };

  /* ---------- Materials ---------- */
  const R = {
    wall: std({ map: mats.pillar.map, color: '#ece8e1', roughness: 0.9 }),
    tile: std({ map: tileTex('#e6e3de', 'rgba(120,115,105,0.35)'), roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    lobbyTile: std({ map: tileTex('#d9d4cc', 'rgba(90,80,70,0.35)'), roughness: 0.18, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    toiletTile: std({ map: tileTex('#f1f3f4', 'rgba(140,150,160,0.5)'), roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    carpet: std({ map: M.matBlue.map, color: '#5c6470', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    slabEdge: std({ color: '#f4f4f2', roughness: 0.6 }),
    stepTop: std({ color: '#cfcac2', roughness: 0.35 }),
    nosing: std({ color: '#2b2f35', roughness: 0.6 }),
    glass: std({ color: '#cfe6f2', transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    frosted: std({ color: '#eef4f7', transparent: true, opacity: 0.7, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    woodDark: std({ color: '#5b3a24', roughness: 0.45 }),
    woodLight: std({ color: '#b98a5a', roughness: 0.5 }),
    door: std({ color: '#8a5a36', roughness: 0.5 }),
    leather: std({ color: '#1f1f22', roughness: 0.45 }),
    fabricBlue: std({ color: '#2f4f8f', roughness: 0.9 }),
    fabricGrey: std({ color: '#6b7280', roughness: 0.9 }),
    white: std({ color: '#f6f6f4', roughness: 0.3 }),
    ceramic: std({ color: '#fbfbfb', roughness: 0.12 }),
    mirror: std({ color: '#ffffff', metalness: 1, roughness: 0.03 }),
    screen: std({ color: '#0b1220', emissive: '#5ab4f0', emissiveIntensity: 0.6 }),
    teal: std({ color: '#147d84', roughness: 0.6 }),
    leaf: std({ color: '#2f6b2a', roughness: 0.8, flatShading: true }),
    potWhite: std({ color: '#e6e1d8', roughness: 0.5 }),
    stall: std({ color: '#6a2c93', roughness: 0.4 }),
    stallBlue: std({ color: '#1d4ed8', roughness: 0.4 }),
    panelLight: std({ color: '#ffffff', emissive: '#fff6e6', emissiveIntensity: 1.4 }),
    pitPad: std({ map: M.matBlue.map, color: '#1f4fa8', roughness: 0.6 }),
    pitFloor: std({ color: '#2a2f38', roughness: 0.9 }),
  };
  const chrome = M.chrome;
  const gold = mats.gold;

  const sign = (text, opts, w, h, x, y, z, rotY = 0) => {
    const tex = signTex(text, opts);
    const m = std({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25, roughness: 0.5 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    g.add(p);
    return p;
  };

  /* ---------- Furniture ---------- */
  const place = (obj, x, y, z, rotY = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = rotY;
    g.add(obj);
    return obj;
  };

  function officeChair(mat = R.leather) {
    const c = new THREE.Group();
    addBox(c, 0.52, 0.09, 0.5, mat, 0, 0.5, 0);
    addBox(c, 0.5, 0.62, 0.07, mat, 0, 0.88, -0.23);
    addBox(c, 0.06, 0.05, 0.36, chrome, 0.27, 0.68, -0.02);
    addBox(c, 0.06, 0.05, 0.36, chrome, -0.27, 0.68, -0.02);
    c.add(rodMesh(chrome, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.46, 0), 0.03));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.add(rodMesh(chrome, new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3), 0.02));
    }
    return c;
  }

  function desk(w, d, top = R.woodDark, withPc = true) {
    const k = new THREE.Group();
    addBox(k, w, 0.05, d, top, 0, 0.75, 0);
    addBox(k, 0.05, 0.73, d - 0.05, top, -w / 2 + 0.03, 0.365, 0);
    addBox(k, 0.05, 0.73, d - 0.05, top, w / 2 - 0.03, 0.365, 0);
    addBox(k, w - 0.1, 0.45, 0.03, top, 0, 0.5, d / 2 - 0.05);
    if (withPc) {
      addBox(k, 0.62, 0.38, 0.04, R.leather, 0, 1.03, -d / 2 + 0.25);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), R.screen);
      scr.position.set(0, 1.03, -d / 2 + 0.272);
      k.add(scr);
      addBox(k, 0.05, 0.2, 0.05, chrome, 0, 0.86, -d / 2 + 0.22);
      addBox(k, 0.45, 0.02, 0.15, R.leather, 0, 0.785, -d / 2 + 0.5);
    }
    return k;
  }

  function sofa(w, mat = R.fabricBlue) {
    const s = new THREE.Group();
    addBox(s, w, 0.42, 0.88, mat, 0, 0.21, 0);
    addBox(s, w, 0.5, 0.2, mat, 0, 0.62, -0.34);
    addBox(s, 0.2, 0.62, 0.88, mat, -w / 2 + 0.1, 0.31, 0);
    addBox(s, 0.2, 0.62, 0.88, mat, w / 2 - 0.1, 0.31, 0);
    const n = Math.max(1, Math.round((w - 0.4) / 0.75));
    for (let i = 0; i < n; i++) {
      const cw = (w - 0.4) / n;
      addBox(s, cw - 0.04, 0.12, 0.62, mat, -w / 2 + 0.2 + cw * (i + 0.5), 0.48, 0.06);
    }
    return s;
  }

  function coffeeTable(w = 1.1, d = 0.6) {
    const t = new THREE.Group();
    addBox(t, w, 0.04, d, R.glass, 0, 0.42, 0, { cast: false });
    addBox(t, w - 0.1, 0.03, d - 0.1, R.woodDark, 0, 0.12, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      addBox(t, 0.04, 0.4, 0.04, chrome, a * (w / 2 - 0.05), 0.2, b * (d / 2 - 0.05));
    });
    return t;
  }

  function plant(h = 1.2) {
    const p = new THREE.Group();
    const pot = mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 18), R.potWhite);
    pot.position.y = 0.21;
    p.add(pot);
    [[0, h * 0.75, 0, 0.32], [0.12, h * 0.95, 0.05, 0.25], [-0.1, h * 0.6, -0.08, 0.28]].forEach(([x, y, z, s]) => {
      const b = mesh(new THREE.IcosahedronGeometry(s, 1), R.leaf);
      b.position.set(x, y, z);
      p.add(b);
    });
    p.add(rodMesh(R.woodDark, new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, h * 0.7, 0), 0.025));
    return p;
  }

  function shelf(w, h, d = 0.35, withBooks = true) {
    const s = new THREE.Group();
    addBox(s, w, h, 0.03, R.woodLight, 0, h / 2, -d / 2 + 0.015);
    addBox(s, 0.03, h, d, R.woodLight, -w / 2, h / 2, 0);
    addBox(s, 0.03, h, d, R.woodLight, w / 2, h / 2, 0);
    const rows = Math.floor(h / 0.4);
    const bookCols = ['#7f1d1d', '#1e3a8a', '#065f46', '#92400e', '#4c1d95', '#d4d4d4'];
    for (let i = 0; i <= rows; i++) {
      const y = i * (h / rows);
      addBox(s, w, 0.025, d, R.woodLight, 0, Math.min(y, h - 0.012), 0);
      if (withBooks && i < rows) {
        let x = -w / 2 + 0.06;
        while (x < w / 2 - 0.1) {
          const bw = 0.03 + Math.random() * 0.04;
          const bh = 0.22 + Math.random() * 0.1;
          const bm = std({ color: bookCols[Math.floor(Math.random() * bookCols.length)], roughness: 0.8 });
          addBox(s, bw, bh, d * 0.7, bm, x + bw / 2, y + bh / 2 + 0.015, 0.02);
          x += bw + 0.005;
          if (Math.random() > 0.85) x += 0.15;
        }
      }
    }
    return s;
  }

  function trophyCabinet(w = 1.8, h = 2.0) {
    const t = shelf(w, h, 0.45, false);
    addBox(t, w, h, 0.02, R.glass, 0, h / 2, 0.23, { cast: false });
    const rows = Math.floor(h / 0.4);
    for (let i = 0; i < rows; i++) {
      const y = i * (h / rows) + 0.03;
      for (let x = -w / 2 + 0.25; x < w / 2 - 0.15; x += 0.38) {
        const base = mesh(new THREE.BoxGeometry(0.12, 0.05, 0.12), R.woodDark);
        base.position.set(x, y + 0.025, 0);
        const stem = mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.12, 8), gold);
        stem.position.set(x, y + 0.11, 0);
        const cup = mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.11, 14), gold);
        cup.position.set(x, y + 0.22, 0);
        t.add(base, stem, cup);
      }
    }
    return t;
  }

  /* ---------- Walls with door/window openings ---------- */
  // axis 'z': wall x ke along, z = fixed par.  axis 'x': wall z ke along, x = fixed par.
  function wall(axis, fixed, from, to, yBase, height, openings = [], mat = R.wall, th = 0.12) {
    const put = (a, b, y0, y1) => {
      if (b - a < 0.005 || y1 - y0 < 0.005) return;
      const len = b - a;
      const mid = (a + b) / 2;
      const h = y1 - y0;
      if (axis === 'z') addBox(g, len, h, th, mat, mid, yBase + y0 + h / 2, fixed);
      else addBox(g, th, h, len, mat, fixed, yBase + y0 + h / 2, mid);
    };
    let cur = from;
    [...openings].sort((p, q) => p.a - q.a).forEach((op) => {
      put(cur, op.a, 0, height);
      put(op.a, op.b, 0, op.y0);
      put(op.a, op.b, op.y1, height);
      const len = op.b - op.a;
      const mid = (op.a + op.b) / 2;
      const oh = op.y1 - op.y0;
      const yc = yBase + op.y0 + oh / 2;
      const fill = op.type === 'door' ? (op.glass ? R.glass : R.door) : R.glass;
      const thick = op.type === 'door' ? 0.05 : 0.02;
      if (axis === 'z') addBox(g, len - 0.04, oh - 0.02, thick, fill, mid, yc, fixed, { cast: false });
      else addBox(g, thick, oh - 0.02, len - 0.04, fill, fixed, yc, mid, { cast: false });
      // frame
      const f = R.nosing;
      if (axis === 'z') {
        addBox(g, len + 0.08, 0.06, th + 0.04, f, mid, yBase + op.y1 + 0.03, fixed, { cast: false });
        addBox(g, 0.05, oh, th + 0.04, f, op.a, yc, fixed, { cast: false });
        addBox(g, 0.05, oh, th + 0.04, f, op.b, yc, fixed, { cast: false });
      } else {
        addBox(g, th + 0.04, 0.06, len + 0.08, f, fixed, yBase + op.y1 + 0.03, mid, { cast: false });
        addBox(g, th + 0.04, oh, 0.05, f, fixed, yc, op.a, { cast: false });
        addBox(g, th + 0.04, oh, 0.05, f, fixed, yc, op.b, { cast: false });
      }
      if (op.type === 'door') {
        const hx = axis === 'z' ? op.b - 0.12 : fixed;
        const hz = axis === 'z' ? fixed : op.b - 0.12;
        addBox(g, axis === 'z' ? 0.03 : 0.16, 0.03, axis === 'z' ? 0.16 : 0.03, gold, hx, yBase + 1.05, hz, { cast: false });
      }
      cur = op.b;
    });
    put(cur, to, 0, height);
  }

  // Glass railing: a -> b (bottom line, slope allowed), height h
  function glassRail(a, b, h = 1.05) {
    const geo = new THREE.BufferGeometry();
    const p = [a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y + h, b.z, a.x, a.y + h, a.z];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, R.glass));
    const top = new THREE.Vector3(0, h, 0);
    g.add(rodMesh(chrome, a.clone().add(top), b.clone().add(top), 0.025));
    g.add(rodMesh(chrome, a.clone(), a.clone().add(top), 0.02));
    g.add(rodMesh(chrome, b.clone(), b.clone().add(top), 0.02));
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const slabMat = [R.slabEdge, R.slabEdge, R.tile, R.slabEdge, R.slabEdge, R.slabEdge];
  const slab = (x0, x1, z0, z1, yTop) => addBox(g, x1 - x0, SLAB, z1 - z0, slabMat, (x0 + x1) / 2, yTop - SLAB / 2, (z0 + z1) / 2);
  const ceilingLight = (x, z, y, w = 1.2, d = 0.6) => addBox(g, w, 0.03, d, R.panelLight, x, y, z, { cast: false });

  const { x0: BX0, x1: BX1, z0: BZ0, z1: BZ1, corridor: CZ } = BLOCK;
  const [L0, L1, L2] = BLOCK.levels;
  const WH = 3.5 - SLAB; // room wall height per floor

  /* ================== LOBBY + RECEPTION ================== */
  g.add(floorPlane(R.lobbyTile, -9, BX0, 19.2, BZ1, 0.022, 2));
  {
    // Curved desk (front entrance ki taraf convex)
    const cx = -4;
    const cz = 20.2;
    const ring = (rIn, rOut, a0, a1, depth) => {
      const s = new THREE.Shape();
      s.absarc(0, 0, rOut, a0, a1, false);
      s.absarc(0, 0, rIn, a1, a0, true);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 });
      geo.rotateX(-Math.PI / 2);
      return geo;
    };
    const a0 = (228 * Math.PI) / 180;
    const a1 = (312 * Math.PI) / 180;
    const body = mesh(ring(2.6, 3.2, a0, a1, 1.08), R.white);
    body.position.set(cx, 0, cz);
    g.add(body);
    const top = mesh(ring(2.5, 3.32, a0 - 0.02, a1 + 0.02, 0.05), R.woodDark);
    top.position.set(cx, 1.08, cz);
    g.add(top);
    const band = mesh(ring(3.2, 3.24, a0 + 0.02, a1 - 0.02, 0.28), M.purple);
    band.position.set(cx, 0.32, cz);
    g.add(band);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), M.emblem);
    logo.position.set(cx, 0.68, cz + 3.25);
    g.add(logo);
    // Receptionist side
    place(desk(2.2, 0.7, R.white, true), cx, 0, cz + 1.75, Math.PI);
    place(officeChair(), cx, 0, cz + 0.9, 0);
    place(officeChair(), cx + 1.5, 0, cz + 1.1, 0.3);

    // Hanging RECEPTION sign
    const sy = 3.1;
    sign('RECEPTION', { bg: '#5a2483', sub: 'Gymnastics Academy' }, 2.6, 0.65, cx, sy, cz + 2.6);
    g.add(rodMesh(chrome, V(cx - 1.1, sy + 0.32, cz + 2.6), V(cx - 1.1, sy + 2.2, cz + 2.6), 0.008));
    g.add(rodMesh(chrome, V(cx + 1.1, sy + 0.32, cz + 2.6), V(cx + 1.1, sy + 2.2, cz + 2.6), 0.008));

    // Logo / backdrop wall
    addBox(g, 7.4, 3.2, 0.25, M.liningNavy, cx, 1.6, 19.15);
    sign('GYMNASTICS ACADEMY', { bg: '#22325a', fg: '#ffd84a', sub: 'Train hard, fly high', w: 1024, h: 200 }, 5.6, 1.1, cx, 2.2, 19.29);
    const em = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), M.emblem);
    em.position.set(cx, 1.05, 19.29);
    g.add(em);

    // Waiting area
    place(sofa(2.4, R.fabricGrey), -8.2, 0, 25.6, Math.PI / 2);
    place(coffeeTable(1.0, 0.55), -6.9, 0, 25.6, Math.PI / 2);
    place(plant(1.3), -8.4, 0, 27.1);
    place(plant(1.5), 2.8, 0, 27.0);
    place(plant(1.5), -2.8, 0, 27.0);
  }

  /* ================== FOAM PIT – 5 ft deep (front-left corner) ================== */
  {
    const { x0, x1, z0, z1, depth } = PIT;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    // Andar ki padded deewarein
    addBox(g, w, depth, 0.12, R.pitPad, cx, -depth / 2, z0 + 0.06);
    addBox(g, w, depth, 0.12, R.pitPad, cx, -depth / 2, z1 - 0.06);
    addBox(g, 0.12, depth, d, R.pitPad, x0 + 0.06, -depth / 2, cz);
    addBox(g, 0.12, depth, d, R.pitPad, x1 - 0.06, -depth / 2, cz);
    g.add(floorPlane(R.pitFloor, x0, x1, z0, z1, -depth + 0.01, 2));
    // Depth markings (har 1 ft par line) – x1 wali deewar par
    for (let k = 1; k <= 5; k++) {
      addBox(g, 0.02, 0.025, 0.6, M.matYellow, x1 - 0.13, -k * 0.3048, cz - 2.4, { cast: false });
    }
    sign('DEPTH 5 FT', { bg: '#c0392b', sub: 'Foam pit – land feet first' }, 2.2, 0.55, cx, 1.9, z1 - 0.1, Math.PI);
    // Padded coping (do khule kinaare)
    addBox(g, w + 0.5, 0.14, 0.5, M.matRed, cx + 0.25, 0.07, z0 - 0.25);
    addBox(g, 0.5, 0.14, d, M.matRed, x1 + 0.25, 0.07, cz);
    // Ladder
    [cz + 2.6, cz + 3.1].forEach((z) => g.add(rodMesh(chrome, V(x1 - 0.18, -depth, z), V(x1 - 0.18, 0.9, z), 0.025)));
    for (let y = -depth + 0.3; y < 0; y += 0.3) g.add(rodMesh(chrome, V(x1 - 0.18, y, cz + 2.6), V(x1 - 0.18, y, cz + 3.1), 0.02));
    // Foam cubes – neeche 3 layer, upar ~0.6 m deewar dikhti hai (depth samajh aaye)
    const cols = ['#1f5fbf', '#f2c230', '#e53935', '#ffffff', '#43a047', '#ff8f00', '#8e24aa'];
    const items = [];
    for (let layer = 0; layer < 3; layer++) {
      for (let x = x0 + 0.35; x < x1 - 0.3; x += 0.37) {
        for (let z = z0 + 0.35; z < z1 - 0.3; z += 0.37) {
          items.push([x + (Math.random() - 0.5) * 0.1, -depth + 0.2 + layer * 0.3 + Math.random() * 0.08, z + (Math.random() - 0.5) * 0.1]);
        }
      }
    }
    const foam = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), M.foam, items.length);
    const dm = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((p, i) => {
      dm.position.set(p[0], p[1], p[2]);
      dm.rotation.set(Math.random() * 0.8 - 0.4, Math.random() * 3, Math.random() * 0.8 - 0.4);
      dm.updateMatrix();
      foam.setMatrixAt(i, dm.matrix);
      foam.setColorAt(i, c.set(cols[Math.floor(Math.random() * cols.length)]));
    });
    foam.instanceColor.needsUpdate = true;
    foam.receiveShadow = true;
    g.add(foam);

    // Tumbling track – seedha pit mein
    const tz = 23.6;
    const len = -11 - x1; // pit ke kinare se lobby tak
    addBox(g, len, 0.14, 1.6, M.matBlue, (x1 - 11) / 2, 0.07, tz);
    [tz - 0.75, tz + 0.75].forEach((z) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.05), M.lineWhite);
      l.rotation.x = -Math.PI / 2;
      l.position.set((x1 - 11) / 2, 0.142, z);
      g.add(l);
    });
    addBox(g, 1.6, 0.25, 2.0, M.matRed, -10.2, 0.125, tz);

    // STENCIL: pit ke opening mein podium / plinth / ground ki top surfaces na dikhein
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      }),
    );
    marker.position.set(cx, 0.004, cz);
    marker.renderOrder = -10;
    g.add(marker);
    collector.ownMaterials.push(marker.material);
    [mats.concrete, mats.paver, mats.lawn, mats.grass].forEach((m) => {
      m.stencilWrite = true;
      m.stencilRef = 1;
      m.stencilFunc = THREE.NotEqualStencilFunc;
      m.stencilFail = THREE.KeepStencilOp;
      m.stencilZFail = THREE.KeepStencilOp;
      m.stencilZPass = THREE.KeepStencilOp;
    });
  }

  /* ================== FRONT BLOCK: STRUCTURE ================== */
  // Slabs
  slab(11.25, BX1, BZ0, BZ1, L1); // first floor
  slab(BX0, 11.25, BZ0, 21.4, L1); // stair landing
  slab(13.1, BX1, BZ0, BZ1, L2); // second floor
  slab(BX0, 11.35, BZ0, BZ1, L2);
  slab(11.35, 13.1, BZ0, 21.4, L2);
  slab(11.35, 13.1, 26.8, BZ1, L2);
  slab(BX0, BX1, BZ0, BZ1, BLOCK.top); // top

  // Columns (hall side)
  [BX0 + 0.15, 17, 24.5, 32].forEach((x) => {
    const c = mesh(new THREE.CylinderGeometry(0.16, 0.16, BLOCK.top - SLAB, 20), R.slabEdge);
    c.position.set(x, (BLOCK.top - SLAB) / 2, BZ0 + 0.18);
    g.add(c);
  });

  /* ---------- Stairs ---------- */
  const stepMat = [M.liningNavy, M.liningNavy, R.stepTop, M.liningNavy, M.liningNavy, M.liningNavy];
  // Flight 1: ground -> first floor (front se hall ki taraf chadhte hain)
  {
    const n = 20;
    const rise = 3.5 / n;
    const zStart = 27.3;
    const tread = (zStart - 21.4) / n;
    const xa = 9.55;
    const xb = 11.2;
    for (let i = 0; i < n; i++) {
      const top = (i + 1) * rise;
      const zf = zStart - (i + 1) * tread;
      addBox(g, xb - xa, top, tread, stepMat, (xa + xb) / 2, top / 2, zf + tread / 2);
      addBox(g, xb - xa, 0.015, 0.05, R.nosing, (xa + xb) / 2, top + 0.008, zf + 0.025, { cast: false });
    }
    glassRail(V(9.52, 0, zStart), V(9.52, 3.5, 21.4));
    // stair wall (flight 1 aur manager room ke beech)
    addBox(g, 0.12, WH, BZ1 - BZ0, R.wall, 11.3, WH / 2, (BZ0 + BZ1) / 2);
    sign('STAIRS', { bg: '#22325a', sub: 'First floor, second floor' }, 1.4, 0.35, 9.45, 2.4, 26.6, -Math.PI / 2);
  }
  // Flight 2: first -> second floor (ulti disha mein)
  {
    const n = 20;
    const rise = 3.5 / n;
    const z0 = 21.4;
    const tread = (26.8 - z0) / n;
    const xa = 11.35;
    const xb = 13.05;
    for (let i = 0; i < n; i++) {
      const top = (i + 1) * rise;
      const zn = z0 + i * tread;
      addBox(g, xb - xa, top, tread, stepMat, (xa + xb) / 2, L1 + top / 2, zn + tread / 2);
      addBox(g, xb - xa, 0.015, 0.05, R.nosing, (xa + xb) / 2, L1 + top + 0.008, zn + tread - 0.025, { cast: false });
    }
    glassRail(V(11.33, L1, z0), V(11.33, L2, 26.8));
  }

  // Railings
  glassRail(V(BX0 + 0.02, L1, BZ0 + 0.02), V(BX0 + 0.02, L1, 21.4)); // landing west
  glassRail(V(BX0, L1, BZ0 + 0.02), V(BX1, L1, BZ0 + 0.02)); // first floor corridor
  glassRail(V(BX0 + 0.02, L2, BZ0 + 0.02), V(BX0 + 0.02, L2, BZ1)); // second floor west
  glassRail(V(BX0, L2, BZ0 + 0.02), V(BX1, L2, BZ0 + 0.02)); // second floor corridor
  glassRail(V(11.37, L2, 21.4), V(11.37, L2, 26.8)); // flight 2 opening
  glassRail(V(11.35, L2, 21.42), V(13.1, L2, 21.42));

  /* ================== GROUND FLOOR: MANAGER (with cabin) + OWNER ================== */
  // Manager suite x 11.3 .. 27.0
  {
    const xa = 11.36;
    const xb = 27.0;
    g.add(floorPlane(R.carpet, xa, xb, 19.1, BZ1, 0.022, 2));
    // Glass storefront (hall side)
    addBox(g, xb - xa, 2.75, 0.02, R.glass, (xa + xb) / 2, 1.375, 19.06, { cast: false });
    addBox(g, xb - xa, WH - 2.75, 0.14, R.wall, (xa + xb) / 2, 2.75 + (WH - 2.75) / 2, 19.06);
    for (let x = xa; x <= xb + 0.01; x += (xb - xa) / 9) addBox(g, 0.06, 2.75, 0.1, R.nosing, x, 1.375, 19.06, { cast: false });
    addBox(g, xb - xa, 0.08, 0.1, R.nosing, (xa + xb) / 2, 0.04, 19.06, { cast: false });
    // frosted privacy band
    addBox(g, xb - xa, 0.35, 0.025, R.frosted, (xa + xb) / 2, 1.3, 19.075, { cast: false });
    // door handles (glass door)
    [12.95, 13.1].forEach((x) => addBox(g, 0.03, 1.0, 0.05, chrome, x, 1.1, 19.0, { cast: false }));
    sign('MANAGER', { bg: '#22325a', fg: '#ffd84a' }, 2.2, 0.42, (xa + xb) / 2, 3.0, 18.98, Math.PI);
    // partition to owner
    addBox(g, 0.14, WH, BZ1 - 19.06, R.wall, xb, WH / 2, (19.06 + BZ1) / 2);

    // Inner glass CABIN
    const cx0 = 20.6;
    const cz0 = 23.3;
    wall('z', cz0, cx0, xb - 0.07, 0, 2.6, [{ a: 21.2, b: 22.2, y0: 0, y1: 2.2, type: 'door', glass: true }], R.glass, 0.03);
    wall('x', cx0, cz0, BZ1, 0, 2.6, [], R.glass, 0.03);
    addBox(g, xb - cx0, 0.08, 0.08, R.nosing, (cx0 + xb) / 2, 2.62, cz0, { cast: false });
    addBox(g, 0.08, 0.08, BZ1 - cz0, R.nosing, cx0, 2.62, (cz0 + BZ1) / 2, { cast: false });
    for (let x = cx0; x < xb; x += 1.6) addBox(g, 0.05, 2.6, 0.06, R.nosing, x, 1.3, cz0, { cast: false });
    addBox(g, xb - cx0, 0.3, 0.035, R.frosted, (cx0 + xb) / 2, 1.25, cz0 - 0.005, { cast: false });
    sign('CABIN', { bg: '#5a2483' }, 0.9, 0.25, 21.7, 2.4, cz0 - 0.03, Math.PI);
    // Cabin furniture
    place(desk(2.2, 0.95, R.woodDark, true), 23.8, 0, 25.9, 0);
    place(officeChair(), 23.8, 0, 26.8, Math.PI);
    place(officeChair(R.fabricGrey), 23.3, 0, 24.6, 0);
    place(officeChair(R.fabricGrey), 24.4, 0, 24.6, 0);
    place(shelf(2.2, 2.0), 26.7, 0, 25.6, -Math.PI / 2);
    place(plant(1.4), 21.1, 0, 27.1);
    // Outer area: staff desks + sofa
    place(desk(1.6, 0.75, R.white, true), 15.0, 0, 25.8, 0);
    place(officeChair(), 15.0, 0, 26.6, Math.PI);
    place(desk(1.6, 0.75, R.white, true), 17.6, 0, 25.8, 0);
    place(officeChair(), 17.6, 0, 26.6, Math.PI);
    place(sofa(2.2, R.fabricBlue), 12.0, 0, 21.9, Math.PI / 2);
    place(coffeeTable(), 13.3, 0, 21.9, Math.PI / 2);
    place(plant(1.2), 19.9, 0, 19.5);
    [[15, 21.5], [19, 21.5], [15, 25], [24, 21.5], [23.8, 25.6]].forEach(([x, z]) => ceilingLight(x, z, WH - 0.02));
  }

  // Owner room x 27.0 .. 38.64
  {
    const xa = 27.07;
    const xb = BX1;
    g.add(floorPlane(R.carpet, xa, xb, 19.1, BZ1, 0.022, 2));
    wall('z', 19.06, xa, xb, 0, WH, [
      { a: 28.0, b: 29.1, y0: 0, y1: 2.2, type: 'door' },
      { a: 30.6, b: 37.6, y0: 0.9, y1: 2.45, type: 'window' },
    ], R.wall, 0.14);
    sign('OWNER', { bg: '#5a2483', fg: '#ffd84a' }, 1.8, 0.42, 28.55, 2.7, 18.98, Math.PI);
    // Furniture
    place(desk(2.6, 1.1, R.woodDark, true), 33.0, 0, 25.4, 0);
    place(officeChair(), 33.0, 0, 26.4, Math.PI);
    place(officeChair(R.leather), 32.4, 0, 24.0, 0);
    place(officeChair(R.leather), 33.6, 0, 24.0, 0);
    place(sofa(2.6, R.leather), 37.9, 0, 22.6, -Math.PI / 2);
    place(coffeeTable(), 36.6, 0, 22.6, -Math.PI / 2);
    place(trophyCabinet(2.4, 2.1), 27.45, 0, 23.2, Math.PI / 2);
    place(shelf(2.4, 2.1), 35.6, 0, 27.3, Math.PI);
    place(plant(1.6), 38.1, 0, 27.0);
    g.add(floorPlane(R.fabricBlue, 31.0, 35.0, 23.0, 26.8, 0.03, 2));
    [[30, 21.5], [34, 21.5], [33, 25.4], [37, 25]].forEach(([x, z]) => ceilingLight(x, z, WH - 0.02));
  }

  /* ================== FIRST FLOOR: 2 ROOMS ================== */
  {
    const y = L1;
    wall('z', CZ, 13.2, BX1, y, WH, [
      { a: 14.1, b: 15.1, y0: 0, y1: 2.2, type: 'door' },
      { a: 16.6, b: 24.6, y0: 1.0, y1: 2.4, type: 'window' },
      { a: 27.0, b: 28.0, y0: 0, y1: 2.2, type: 'door' },
      { a: 29.6, b: 37.6, y0: 1.0, y1: 2.4, type: 'window' },
    ]);
    wall('x', 13.2, CZ, BZ1, y, WH);
    wall('x', 26.1, CZ, BZ1, y, WH);
    sign('COACHES ROOM', { bg: '#22325a' }, 1.8, 0.36, 14.6, y + 2.55, CZ - 0.07, Math.PI);
    sign('PHYSIO ROOM', { bg: '#0f766e' }, 1.8, 0.36, 27.5, y + 2.55, CZ - 0.07, Math.PI);

    // Coaches room: meeting table + chairs + whiteboard
    const mt = new THREE.Group();
    addBox(mt, 4.2, 0.06, 1.4, R.woodLight, 0, 0.75, 0);
    [[-1.8, 0], [1.8, 0]].forEach(([x]) => addBox(mt, 0.1, 0.72, 1.0, chrome, x, 0.36, 0));
    place(mt, 19.6, y, 24.3);
    [-1.4, 0, 1.4].forEach((dx) => {
      place(officeChair(R.fabricBlue), 19.6 + dx, y, 23.25, 0);
      place(officeChair(R.fabricBlue), 19.6 + dx, y, 25.35, Math.PI);
    });
    addBox(g, 3.6, 1.3, 0.04, R.white, 19.6, y + 1.6, BZ1 - 0.04);
    addBox(g, 3.7, 1.4, 0.03, R.nosing, 19.6, y + 1.6, BZ1 - 0.02, { cast: false });
    place(shelf(1.8, 2.0), 13.45, y, 25.5, Math.PI / 2);
    // Physio room: treatment beds + wall bars + ball + cabinet
    [29.2, 33.0].forEach((x) => {
      const bed = new THREE.Group();
      addBox(bed, 0.75, 0.12, 1.95, R.teal, 0, 0.72, 0);
      addBox(bed, 0.72, 0.62, 0.06, chrome, 0, 0.35, -0.85);
      addBox(bed, 0.72, 0.62, 0.06, chrome, 0, 0.35, 0.85);
      addBox(bed, 0.5, 0.08, 0.35, R.white, 0, 0.82, -0.7);
      place(bed, x, y, 24.6);
    });
    for (let k = 0; k < 4; k++) {
      const x = 35.6 + k * 0.85;
      g.add(rodMesh(R.woodLight, V(x - 0.4, y, BZ1 - 0.12), V(x - 0.4, y + 2.6, BZ1 - 0.12), 0.03));
      for (let r = 0.25; r < 2.6; r += 0.25) g.add(rodMesh(R.woodLight, V(x - 0.4, y + r, BZ1 - 0.12), V(x + 0.4, y + r, BZ1 - 0.12), 0.018));
    }
    const ball = mesh(new THREE.SphereGeometry(0.33, 24, 16), M.purple);
    ball.position.set(36.8, y + 0.33, 23.0);
    g.add(ball);
    place(shelf(1.6, 1.8, 0.4, false), 26.35, y, 24.0, Math.PI / 2);
    [[17, 22.5], [22, 22.5], [19.6, 26], [30, 23], [35, 23], [32, 26.3]].forEach(([x, z]) => ceilingLight(x, z, y + WH - 0.02));
  }

  /* ================== SECOND FLOOR: TOILETS (Girls + Boys) ================== */
  {
    const y = L2;
    const H2 = BLOCK.top - SLAB - L2;
    g.add(floorPlane(R.toiletTile, 13.26, BX1, CZ + 0.06, BZ1, y + 0.012, 1));
    wall('z', CZ, 13.2, BX1, y, H2, [
      { a: 14.1, b: 15.1, y0: 0, y1: 2.2, type: 'door' },
      { a: 27.0, b: 28.0, y0: 0, y1: 2.2, type: 'door' },
    ]);
    wall('x', 13.2, CZ, BZ1, y, H2);
    wall('x', 26.1, CZ, BZ1, y, H2);
    sign('GIRLS', { bg: '#db2777', icon: 'girl' }, 1.6, 0.4, 14.6, y + 2.55, CZ - 0.07, Math.PI);
    sign('BOYS', { bg: '#1d4ed8', icon: 'boy' }, 1.6, 0.4, 27.5, y + 2.55, CZ - 0.07, Math.PI);

    // Corridor wall par academy mural strip
    const strip = std({ map: signTex('BELIEVE  ACHIEVE  INSPIRE', { bg: '#5a2483', fg: '#ffd84a', w: 1024, h: 128 }), roughness: 0.6 });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), strip);
    sp.position.set(20.6, y + 2.35, CZ - 0.07);
    sp.rotation.y = Math.PI;
    g.add(sp);
    const sp2 = sp.clone();
    sp2.position.x = 33.2;
    g.add(sp2);

    const toilet = (xa, xb, stallMat, boys) => {
      // 3 stalls back wall ke saath
      const sw = 1.1;
      const sd = 1.6;
      const zb = BZ1 - sd;
      const start = xb - 3 * sw - 0.1;
      for (let i = 0; i <= 3; i++) addBox(g, 0.04, 2.0, sd, stallMat, start + i * sw, y + 1.15, zb + sd / 2);
      for (let i = 0; i < 3; i++) {
        const x = start + i * sw + sw / 2;
        addBox(g, sw - 0.12, 1.85, 0.04, stallMat, x, y + 1.08, zb + 0.02);
        addBox(g, 0.02, 0.12, 0.08, chrome, x + sw / 2 - 0.15, y + 1.0, zb - 0.02);
        // WC
        const bowl = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.4, 18), R.ceramic);
        bowl.position.set(x, y + 0.2, BZ1 - 0.5);
        g.add(bowl);
        addBox(g, 0.42, 0.04, 0.48, R.ceramic, x, y + 0.42, BZ1 - 0.48);
        addBox(g, 0.45, 0.4, 0.18, R.ceramic, x, y + 0.65, BZ1 - 0.12);
      }
      // Wash basin counter + mirror (partition wall ke saath)
      const cxW = xa + 0.35;
      const len = 3.2;
      const cz = CZ + 0.4 + len / 2 + 0.3;
      addBox(g, 0.6, 0.1, len, R.white, cxW, y + 0.85, cz);
      addBox(g, 0.55, 0.75, len - 0.1, R.woodLight, cxW - 0.02, y + 0.4, cz);
      [-1, 0, 1].forEach((k) => {
        const z = cz + k * 1.0;
        const basin = mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.06, 20), R.ceramic);
        basin.position.set(cxW + 0.02, y + 0.92, z);
        g.add(basin);
        g.add(rodMesh(chrome, V(xa + 0.12, y + 0.92, z), V(xa + 0.12, y + 1.12, z), 0.015));
        g.add(rodMesh(chrome, V(xa + 0.12, y + 1.12, z), V(xa + 0.28, y + 1.08, z), 0.012));
      });
      addBox(g, 0.02, 1.0, len, R.mirror, xa + 0.08, y + 1.65, cz, { cast: false });
      if (boys) {
        [-0.9, 0, 0.9].forEach((k) => {
          const x = (xa + start) / 2 + k * 0.8 + 0.6;
          addBox(g, 0.4, 0.6, 0.3, R.ceramic, x, y + 0.85, BZ1 - 0.16);
        });
      }
      [[xa + 2.5, 23], [xa + 7, 23], [start + 1.6, BZ1 - 0.8]].forEach(([x, z]) => ceilingLight(x, z, y + H2 - 0.02, 1.0, 0.5));
    };
    toilet(13.26, 26.04, R.stall, false);
    toilet(26.16, BX1, R.stallBlue, true);
  }

  // Second floor ki bahar wali glass band – toilets ke liye frosted
  addBox(g, BX1 - BX0, 2.0, 0.03, R.frosted, (BX0 + BX1) / 2, 8.0, BZ1 - 0.05, { cast: false });
  addBox(g, 0.03, 2.0, BZ1 - CZ, R.frosted, BX1 - 0.05, 8.0, (CZ + BZ1) / 2, { cast: false });

  // Corridor ceiling lights (first + second)
  for (let x = 14; x < BX1; x += 4) {
    ceilingLight(x, 19.9, L1 + WH - 0.02, 0.6, 0.6);
    ceilingLight(x, 19.9, BLOCK.top - SLAB - 0.02, 0.6, 0.6);
  }
}