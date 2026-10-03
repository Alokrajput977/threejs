import { CONFIG } from '../three/config.js';
import './Header.css';

export default function Header() {
  return (
    <header className="signboard">
      <div className="signboard__post" aria-hidden="true" />
      <div className="signboard__body">
        <h1 className="signboard__title">Boundary wall</h1>
        <p className="signboard__sub">
          {CONFIG.plotWidth} × {CONFIG.plotDepth} m compound with four jaali gates, four guard rooms and razor-wire fencing
        </p>
      </div>
    </header>
  );
}
