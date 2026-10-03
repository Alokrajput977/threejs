# Boundary Wall – 3D Site Model (React + Three.js)

## Chalane ka tarika
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
```

## Kya bana hai
- Raised plinth par poori boundary wall: stone base band, exposed brick (ya plaster) panel, har 3 m par pillar, concrete coping
- Wall ke upar security fencing: Y-angle posts, barbed wire strands aur razor-wire coil
- 4 gates (har side ek) – jaali (diamond mesh) wale double-leaf swing gates, spear tops, bade pillars, lamp
- Har gate ke left side (andar aate waqt) andar ki taraf guard room: windows, door, sign board, chhat par water tank
- Main gate (south) par vehicle ramp 1:10 slope, kerb walls, hazard strip, bollards; baaki gates par seedhiyan
- Day / night mode, gate open/close (panel se ya gate par click karke), camera presets

## Folder
```
src/
  App.jsx / App.css / index.css
  components/        React UI (har component ki alag .css)
    Scene3D.jsx      Three.js renderer, camera, controls
    ControlPanel.jsx
    Header.jsx, SpecsCard.jsx, Loader.jsx
  three/
    config.js        << SAARE SIZES YAHAN (plot size, wall height, gates)
    textures.js      procedural textures (koi image file nahi)
    materials.js
    environment.js   sky, sun, shadows, night
    buildCampus.js   sab ko jodta hai
    builders/        wall, fence, gate, guardRoom, approach (ramp/steps), ground, trees
```

## Apne map ke hisaab se badalna
`src/three/config.js` mein `plotWidth`, `plotDepth`, `wallHeight`, `gateOpening` change karein.
Kisi gate par ramp chahiye to `GATES` mein uska `type: 'ramp'` kar dein.
