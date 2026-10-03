import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox } from '../helpers.js';

export const ACADEMY_NAME = 'GYMNASTICS ACADEMY';

/** Flex banner ka design canvas par (6 : 1 ratio). */
function bannerTexture(gate) {
  const W = 2048;
  const H = 342;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#16245f');
  bg.addColorStop(0.55, '#2b2a7a');
  bg.addColorStop(1, '#5a2483');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Halki diagonal light streaks
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let x = 380; x < W; x += 260) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x - 60, H);
    ctx.lineTo(x - 150, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Emblem: gymnast leap + ribbon
  const ex = 210;
  const ey = H / 2;
  ctx.fillStyle = '#ff5fa2';
  ctx.beginPath();
  ctx.arc(ex, ey, 125, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 20;
  const hip = [ex - 5, ey + 25];
  const sh = [ex + 12, ey - 40];
  ctx.beginPath(); // torso
  ctx.moveTo(...hip);
  ctx.quadraticCurveTo(ex + 14, ey - 5, ...sh);
  ctx.stroke();
  ctx.beginPath(); // head
  ctx.arc(ex + 22, ey - 74, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.beginPath(); // arms
  ctx.moveTo(ex - 50, ey - 85);
  ctx.lineTo(...sh);
  ctx.lineTo(ex + 75, ey - 78);
  ctx.stroke();
  ctx.lineWidth = 17;
  ctx.beginPath(); // legs – split leap
  ctx.moveTo(ex - 98, ey + 38);
  ctx.lineTo(...hip);
  ctx.lineTo(ex + 92, ey + 2);
  ctx.stroke();

  // Ribbon
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(ex + 75, ey - 78);
  ctx.bezierCurveTo(ex + 160, ey - 160, ex + 200, ey + 10, ex + 150, ey + 60);
  ctx.bezierCurveTo(ex + 110, ey + 100, ex + 210, ey + 140, ex + 260, ey + 90);
  ctx.stroke();

  // Text
  const tx = 1215;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 150px Arial Black, Arial, sans-serif';
  ctx.fillText(ACADEMY_NAME, tx, 140, 1440);

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(tx - 520, 218, 1040, 6);

  ctx.font = '700 54px Arial, sans-serif';
  ctx.fillText(gate.number === 1 ? 'MAIN ENTRANCE' : `GATE ${gate.number}`, tx, 272, 1200);

  // Sitare (right side)
  ctx.fillStyle = '#ffd84a';
  [[1930, 85, 16], [1975, 140, 10], [1900, 255, 12], [440, 70, 9]].forEach(([x, y, r]) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  });

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * Gate ke upar banner (dono pillars ke beech, gate leaves ke upar).
 * Dono taraf se padha ja sakta hai – bahar aur andar.
 */
export function buildGateBanner(gate, mats, collector) {
  const { gateOpening: GO, gatePillarHeight: PH, plinthHeight: P } = CONFIG;
  const g = new THREE.Group();
  g.name = `banner-${gate.id}`;

  const w = GO - 0.1;
  const h = 1.0;
  const cy = P + PH; // neeche ~P+3.1, gate ke spears (~P+3.0) se upar

  const tex = bannerTexture(gate);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    emissive: '#ffffff',
    emissiveMap: tex,
    emissiveIntensity: 0,
  });
  collector.ownMaterials.push(mat);
  collector.signMaterials.push(mat);

  const geo = new THREE.PlaneGeometry(w, h);
  const front = new THREE.Mesh(geo, mat);
  front.position.set(0, cy, 0.035);
  front.castShadow = true;
  const back = new THREE.Mesh(geo, mat);
  back.rotation.y = Math.PI;
  back.position.set(0, cy, -0.035);
  g.add(front, back);

  // Steel frame
  const f = mats.gateFrame;
  addBox(g, w + 0.12, 0.08, 0.1, f, 0, cy + h / 2 + 0.04, 0);
  addBox(g, w + 0.12, 0.08, 0.1, f, 0, cy - h / 2 - 0.04, 0);
  addBox(g, 0.08, h + 0.16, 0.1, f, -(w / 2 + 0.02), cy, 0);
  addBox(g, 0.08, h + 0.16, 0.1, f, w / 2 + 0.02, cy, 0);
  // Pillars mein clamp
  [-1, 1].forEach((s) => {
    addBox(g, 0.12, 0.12, 0.2, mats.gold, s * (GO / 2 - 0.02), cy - 0.25, 0);
    addBox(g, 0.12, 0.12, 0.2, mats.gold, s * (GO / 2 - 0.02), cy + 0.25, 0);
  });

  return g;
}