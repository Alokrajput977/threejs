import { useState } from 'react';
import { GATES } from '../three/config.js';
import './ControlPanel.css';

const VIEWS = [
  { id: 'aerial', label: 'Aerial' },
  { id: 'top', label: 'Plan view' },
  { id: 'fence', label: 'Fencing close-up' },
  { id: 'gate:south', label: 'Ramp' },
];

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`seg__btn ${value === o.value ? 'is-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}

export default function ControlPanel({
  activeView, onView, gates, onToggleGate, onAllGates,
  night, onNight, wallStyle, onWallStyle, fence, onFence,
}) {
  const [open, setOpen] = useState(true);
  const openCount = Object.values(gates).filter(Boolean).length;

  return (
    <section className={`panel ${open ? '' : 'panel--collapsed'}`} aria-label="Model controls">
      <button type="button" className="panel__handle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Hide controls' : 'Show controls'}
      </button>

      <div className="panel__scroll">
        <div className="panel__group">
          <h2 className="panel__heading">Camera</h2>
          <div className="views">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`chip ${activeView === v.id ? 'is-on' : ''}`}
                onClick={() => onView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel__group">
          <div className="panel__row">
            <h2 className="panel__heading">Gates</h2>
            <span className="panel__count">{openCount} of {GATES.length} open</span>
          </div>

          <ul className="gates">
            {GATES.map((g) => (
              <li key={g.id} className={`gate ${gates[g.id] ? 'is-open' : ''}`}>
                <span className="gate__num" aria-hidden="true">{g.number}</span>
                <div className="gate__info">
                  <span className="gate__name">{g.name}</span>
                  <span className="gate__detail">{g.detail}</span>
                  <div className="gate__links">
                    <button type="button" onClick={() => onView(`gate:${g.id}`)}>View gate</button>
                    <button type="button" onClick={() => onView(`guard:${g.id}`)}>Guard room {g.number}</button>
                  </div>
                </div>
                <Switch checked={gates[g.id]} onChange={() => onToggleGate(g.id)} label={`${g.name} open`} />
              </li>
            ))}
          </ul>

          <div className="pair">
            <button type="button" className="ghost" onClick={() => onAllGates(true)}>Open all</button>
            <button type="button" className="ghost" onClick={() => onAllGates(false)}>Close all</button>
          </div>
        </div>

        <div className="panel__group">
          <h2 className="panel__heading">Wall finish</h2>
          <Segmented
            label="Wall finish"
            value={wallStyle}
            onChange={onWallStyle}
            options={[
              { value: 'brick', label: 'Exposed brick' },
              { value: 'plaster', label: 'Plastered' },
            ]}
          />
        </div>

        <div className="panel__group">
          <h2 className="panel__heading">Lighting</h2>
          <Segmented
            label="Time of day"
            value={night ? 'night' : 'day'}
            onChange={(v) => onNight(v === 'night')}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'night', label: 'Night' },
            ]}
          />
        </div>

        <div className="panel__group panel__group--last">
          <div className="panel__row">
            <div>
              <h2 className="panel__heading">Razor-wire fencing</h2>
              <span className="gate__detail">Y-posts, barbed strands and coil on top of the wall</span>
            </div>
            <Switch checked={fence} onChange={onFence} label="Show fencing" />
          </div>
        </div>
      </div>
    </section>
  );
}
