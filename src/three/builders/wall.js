import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { addBox } from '../helpers.js';

/**
 * Ek seedhi wall run (local frame mein x0 -> x1, z = 0).
 * Stone base band + brick/plaster panel + concrete coping + pillars.
 * Return: group aur fence posts ki x positions.
 */
export function buildWallRun(x0, x1, opts, mats) {
  const { wallHeight: H, wallThickness: T, pillarSize: PS, pillarSpacing: SP, plinthHeight: P } = CONFIG;
  const { startPillar = true, endPillar = true, startPost = true, endPost = true } = opts;

  const g = new THREE.Group();
  g.name = 'wall-run';
  const len = x1 - x0;
  const cx = x0 + len / 2;
  const baseH = 0.45;

  // Stone base band (thoda mota)
  addBox(g, len, baseH, T + 0.06, mats.stone, cx, P + baseH / 2, 0);
  // Main panel
  const panelH = H - baseH;
  addBox(g, len, panelH, T, mats.wall, cx, P + baseH + panelH / 2, 0);
  // Coping (top)
  addBox(g, len, 0.08, T + 0.1, mats.coping, cx, P + H + 0.04, 0);
  // Drip line / plaster band just below coping
  addBox(g, len, 0.12, T + 0.03, mats.pillar, cx, P + H - 0.06, 0);

  const n = Math.max(1, Math.round(len / SP));
  const step = len / n;
  const postXs = [];

  for (let i = 0; i <= n; i++) {
    const x = x0 + i * step;
    const isStart = i === 0;
    const isEnd = i === n;
    const hasPillar = (!isStart && !isEnd) || (isStart && startPillar) || (isEnd && endPillar);
    const hasPost = (!isStart && !isEnd) || (isStart && startPost) || (isEnd && endPost);

    if (hasPillar) {
      const ph = H + 0.18;
      addBox(g, PS + 0.06, 0.5, PS + 0.06, mats.stone, x, P + 0.25, 0);
      addBox(g, PS, ph - 0.5, PS, mats.pillar, x, P + 0.5 + (ph - 0.5) / 2, 0);
      addBox(g, PS + 0.1, 0.07, PS + 0.1, mats.coping, x, P + ph + 0.035, 0);
    }
    if (hasPost) postXs.push(x);
  }

  return { group: g, postXs };
}
