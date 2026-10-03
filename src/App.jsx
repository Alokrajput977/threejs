import { useCallback, useState } from 'react';
import Scene3D from './components/Scene3D.jsx';
import Header from './components/Header.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import SpecsCard from './components/SpecsCard.jsx';
import Loader from './components/Loader.jsx';
import InteriorPanel from './components/InteriorPanel.jsx';
import { GATES } from './three/config.js';
import './App.css';

const closedGates = Object.fromEntries(GATES.map((g) => [g.id, false]));

export default function App() {
  const [view, setView] = useState({ id: 'aerial', nonce: 0 });
  const [night, setNight] = useState(false);
  const [gates, setGates] = useState(closedGates);
  const [wallStyle, setWallStyle] = useState('brick');
  const [fence, setFence] = useState(true);
  const [ready, setReady] = useState(false);
  const [interior, setInterior] = useState(false);

  // 'hall:*' views building ke andar hain, baaki sab bahar
  const goTo = useCallback((id) => {
    setInterior(id.startsWith('hall:'));
    setView((v) => ({ id, nonce: v.nonce + 1 }));
  }, []);
  const enterHall = useCallback(() => goTo('hall:entrance'), [goTo]);
  const exitHall = useCallback(() => goTo('gate:south'), [goTo]);
  const toggleGate = useCallback((id) => setGates((g) => ({ ...g, [id]: !g[id] })), []);
  const setAllGates = useCallback((open) => setGates(Object.fromEntries(GATES.map((g) => [g.id, open]))), []);

  return (
    <div className={`app ${night ? 'is-night' : ''}`}>
      <Scene3D
        view={view}
        night={night}
        gates={gates}
        wallStyle={wallStyle}
        fence={fence}
        interior={interior}
        onGateClick={toggleGate}
        onHallClick={enterHall}
        onReady={() => setReady(true)}
      />

      <Header />

      {!interior && (
        <ControlPanel
          activeView={view.id}
          onView={goTo}
          gates={gates}
          onToggleGate={toggleGate}
          onAllGates={setAllGates}
          night={night}
          onNight={setNight}
          wallStyle={wallStyle}
          onWallStyle={setWallStyle}
          fence={fence}
          onFence={setFence}
        />
      )}

      {!interior && <SpecsCard />}

      {interior && <InteriorPanel activeView={view.id} onView={goTo} onExit={exitHall} />}

      {!interior && (
        <p className="app__hint">Drag to orbit, scroll to zoom. Click a gate to open it, click the building to go inside.</p>
      )}

      <Loader visible={!ready} />
    </div>
  );
}