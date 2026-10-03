import { useState } from 'react';
import './InteriorPanel.css';

const GROUPS = [
  {
    label: 'Ground floor',
    views: [
      { id: 'hall:entrance', label: 'Entrance' },
      { id: 'hall:reception', label: 'Reception' },
      { id: 'hall:manager', label: 'Manager room + cabin' },
      { id: 'hall:owner', label: 'Owner room' },
      { id: 'hall:pit', label: 'Foam pit (5 ft)' },
    ],
  },
  {
    label: 'Upper floors',
    views: [
      { id: 'hall:stairs', label: 'Stairs' },
      { id: 'hall:first', label: 'First floor' },
      { id: 'hall:coaches', label: 'Coaches room' },
      { id: 'hall:physio', label: 'Physio room' },
      { id: 'hall:second', label: 'Second floor' },
      { id: 'hall:girls', label: 'Girls toilet' },
      { id: 'hall:boys', label: 'Boys toilet' },
    ],
  },
  {
    label: 'Training hall',
    views: [
      { id: 'hall:west', label: 'Left wall murals' },
      { id: 'hall:east', label: 'Right wall murals' },
      { id: 'hall:roof', label: 'Roof structure' },
      { id: 'hall:overview', label: 'Whole hall' },
    ],
  },
];

export default function InteriorPanel({ activeView, onView, onExit }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`inside ${open ? '' : 'inside--min'}`} aria-label="Inside the training hall">
      <div className="inside__head">
        <div>
          <h2 className="inside__title">Training hall</h2>
          <p className="inside__sub">Drag to look around 360°. Scroll or W A S D to walk, Q and E to go down or up.</p>
        </div>
        <div className="inside__actions">
          <button type="button" className="inside__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Hide views' : 'Show views'}
          </button>
          <button type="button" className="inside__exit" onClick={onExit}>
            Exit building
          </button>
        </div>
      </div>
      {open && GROUPS.map((grp) => (
        <div className="inside__group" key={grp.label}>
          <span className="inside__label">{grp.label}</span>
          <div className="inside__views" role="group" aria-label={grp.label}>
            {grp.views.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`inside__chip ${activeView === v.id ? 'is-on' : ''}`}
                onClick={() => onView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}