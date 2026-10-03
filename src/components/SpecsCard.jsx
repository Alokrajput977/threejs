import { CONFIG } from '../three/config.js';
import './SpecsCard.css';

const fmt = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} m`;

export default function SpecsCard() {
  const perimeter = 2 * (CONFIG.plotWidth + CONFIG.plotDepth);
  const rows = [
    ['Perimeter', fmt(perimeter)],
    ['Wall height', `${fmt(CONFIG.wallHeight)} + 1.2 m fence`],
    ['Wall thickness', `${CONFIG.wallThickness * 1000} mm`],
    ['Gate opening', fmt(CONFIG.gateOpening)],
    ['Plinth level', `+${fmt(CONFIG.plinthHeight)}`],
    ['Ramp slope', `1 : ${Math.round(CONFIG.ramp.length / CONFIG.plinthHeight)}`],
  ];

  return (
    <aside className="specs" aria-label="Wall specifications">
      <h2 className="specs__title">Specifications</h2>
      <dl className="specs__list">
        {rows.map(([k, v]) => (
          <div className="specs__row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
