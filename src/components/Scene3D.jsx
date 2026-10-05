import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getTextures, disposeTextures } from '../three/textures.js';
import { createEnvironment } from '../three/environment.js';
import { buildCampus } from '../three/buildCampus.js';
import { getView } from '../three/cameraViews.js';
import { hallDims } from '../three/builders/interior.js';
import './Scene3D.css';

/*
 * LIGHTWEIGHT RENDERING
 *  1. On-demand render: kuch na hile to frame render hi nahi hota (GPU aaram karta hai,
 *     system garam nahi hota). Camera, fly, walk, gate animation par hi render.
 *  2. Shadow cache: shadow map sirf tab dobara banta hai jab scene badle (gate hile,
 *     fence/andar-bahar toggle). Camera ghumane par purani shadow hi use hoti hai.
 *  3. Sasta picking: building ke liye bounding box se raycast (hazaron meshes nahi),
 *     aur mouse hover ka raycast ~16 baar/second tak limited.
 *  4. Adaptive sharpness: camera hilte waqt thoda kam pixel ratio, rukte hi full quality.
 */

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const GATE_ANIM_MS = 3500; // gate khulne/band hone ki animation ka time

export default function Scene3D({ view, night, gates, wallStyle, fence, interior, onGateClick, onHallClick, onReady }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const interiorRef = useRef(false);
  const callbacks = useRef({ onGateClick, onHallClick, onReady });
  callbacks.current = { onGateClick, onHallClick, onReady };

  // ---------- Init (sirf ek baar) ----------
  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const fullDPR = Math.min(window.devicePixelRatio, 1.75);
    const moveDPR = Math.min(fullDPR, 1.25);
    let curDPR = fullDPR;

    // stencil: true – foam pit ka 'chhed' dikhane ke liye zaroori
    const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(curDPR);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // hum khud batayenge kab shadow dobara banani hai
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 3000);
    const start = getView('aerial');
    camera.position.copy(start.pos).multiplyScalar(1.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 3;
    controls.maxDistance = 380;
    controls.target.copy(start.target);

    const env = createEnvironment(scene, renderer);
    const textures = getTextures(renderer.capabilities.getMaxAnisotropy());
    const campus = buildCampus(textures);
    scene.add(campus.group);

    // ---- Render scheduling ----
    let needRender = true;
    let busyUntil = 0; // is time tak lagatar render (animations)
    let shadowDirty = true;
    let shadowBusyUntil = 0;
    const invalidate = (ms = 0) => {
      needRender = true;
      if (ms) busyUntil = Math.max(busyUntil, performance.now() + ms);
    };
    const dirtyShadows = (ms = 0) => {
      shadowDirty = true;
      if (ms) shadowBusyUntil = Math.max(shadowBusyUntil, performance.now() + ms);
      invalidate(ms);
    };

    // ---- Walk mode (andar): scroll / W A S D / Q E ----
    const walk = { vel: new THREE.Vector3(), keys: new Set() };
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const onWheel = (e) => {
      if (!interiorRef.current) return; // bahar normal zoom (OrbitControls)
      e.preventDefault();
      camera.getWorldDirection(fwd);
      walk.vel.addScaledVector(fwd, -e.deltaY * 0.035);
      if (walk.vel.length() > 14) walk.vel.setLength(14);
      fly.active = false;
      invalidate();
    };
    const WALK_KEYS = ['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    const onKey = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (!WALK_KEYS.includes(k)) return;
      if (e.type === 'keydown') walk.keys.add(k);
      else walk.keys.delete(k);
      invalidate();
    };
    const clearKeys = () => walk.keys.clear();
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', clearKeys);

    // ---- Camera fly-to ----
    const fly = { active: false, t: 0, dur: 1.6, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3() };
    const flyTo = (id, dur = 1.6) => {
      const v = getView(id);
      fly.fromPos.copy(camera.position);
      fly.fromTgt.copy(controls.target);
      fly.toPos.copy(v.pos);
      fly.toTgt.copy(v.target);
      fly.t = 0;
      fly.dur = id.startsWith('hall:') && !interiorRef.current ? 2.2 : dur;
      fly.active = true;
      walk.vel.set(0, 0, 0);
      invalidate();
    };
    controls.addEventListener('start', () => {
      fly.active = false; // user drag kare to animation ruk jaye
    });
    controls.addEventListener('change', () => invalidate());
    flyTo('aerial', 2.4); // opening shot

    // ---- Picking: gates (leaves) + building (bounding box – bahut sasta) ----
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hallBox = new THREE.Box3().setFromObject(campus.hall);
    const boxHit = new THREE.Vector3();
    const setPointer = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const pick = () => {
      const gateHit = raycaster.intersectObjects(campus.gateLeaves, true)[0];
      const p = raycaster.ray.intersectBox(hallBox, boxHit);
      const hallDist = p ? p.distanceTo(raycaster.ray.origin) : Infinity;
      if (gateHit && gateHit.distance <= hallDist) return { gateId: gateHit.object.userData.gateId };
      if (p) return { hall: true };
      return null;
    };

    let downAt = null;
    const onDown = (e) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 5 || interiorRef.current) return; // andar ho to click se kuch nahi
      setPointer(e);
      const hit = pick();
      if (!hit) return;
      if (hit.gateId) callbacks.current.onGateClick?.(hit.gateId);
      else callbacks.current.onHallClick?.(); // building par click = andar jao
    };
    let lastHover = 0;
    const onMove = (e) => {
      if (e.buttons) return;
      if (interiorRef.current) {
        renderer.domElement.style.cursor = '';
        return;
      }
      const now = performance.now();
      if (now - lastHover < 60) return; // hover raycast limit
      lastHover = now;
      setPointer(e);
      renderer.domElement.style.cursor = pick() ? 'pointer' : '';
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);

    // ---- Resize ----
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate();
    });
    ro.observe(mount);

    // ---- Interior bounds ----
    const hd = hallDims();
    const bounds = {
      x0: -hd.W / 2 + 1.2,
      x1: hd.W / 2 - 1.2,
      z0: hd.centerZ - hd.L / 2 + 1.2,
      z1: hd.centerZ + hd.L / 2 - 1.2,
      y0: hd.floorY + 0.8,
      y1: hd.floorY + hd.H + 2.5,
      ty1: hd.floorY + hd.H + 3.5,
    };
    const clamp = THREE.MathUtils.clamp;

    // ---- Loop ----
    const clock = new THREE.Clock();
    let firstFrame = true;
    let lastMoveTime = 0;
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const now = performance.now();

      // Fly animation
      if (fly.active) {
        fly.t = Math.min(1, fly.t + dt / fly.dur);
        const k = easeInOut(fly.t);
        camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
        controls.target.lerpVectors(fly.fromTgt, fly.toTgt, k);
        if (fly.t >= 1) {
          fly.active = false;
          // Andar: target ko camera ke paas laao – drag = jagah par 360° ghoomna
          if (interiorRef.current) {
            fwd.subVectors(fly.toTgt, fly.toPos).normalize();
            controls.target.copy(camera.position).addScaledVector(fwd, 1.2);
          }
        }
        needRender = true;
      }

      // Walk movement (smooth, damping ke saath)
      let walking = false;
      if (interiorRef.current) {
        const k = walk.keys;
        const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
        const r = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
        const u = (k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0);
        if (f || r || u) {
          fly.active = false;
          camera.getWorldDirection(fwd);
          fwd.y = 0;
          fwd.normalize();
          right.crossVectors(fwd, camera.up).normalize();
          const acc = 26 * dt;
          walk.vel.addScaledVector(fwd, f * acc).addScaledVector(right, r * acc);
          walk.vel.y += u * acc;
          if (walk.vel.length() > 6) walk.vel.setLength(6);
        }
        if (walk.vel.lengthSq() > 1e-5) {
          const step = walk.vel.clone().multiplyScalar(dt);
          camera.position.add(step);
          controls.target.add(step);
          walk.vel.multiplyScalar(Math.exp(-dt * 4.5));
          walking = true;
        } else {
          walk.vel.set(0, 0, 0);
        }
      } else {
        walk.vel.set(0, 0, 0);
      }

      // Damping chalta rahe – camera hila to true
      const moved = controls.update();

      // Andar ho to camera building ki deewaron ke andar hi rahe
      if (interiorRef.current && !fly.active) {
        camera.position.x = clamp(camera.position.x, bounds.x0, bounds.x1);
        camera.position.y = clamp(camera.position.y, bounds.y0, bounds.y1);
        camera.position.z = clamp(camera.position.z, bounds.z0, bounds.z1);
        controls.target.x = clamp(controls.target.x, bounds.x0, bounds.x1);
        controls.target.y = clamp(controls.target.y, bounds.y0, bounds.ty1);
        controls.target.z = clamp(controls.target.z, bounds.z0, bounds.z1);
      }

      // Adaptive pixel ratio: hilte waqt halka, rukte hi full quality
      const interacting = moved || fly.active || walking;
      if (interacting) {
        lastMoveTime = now;
        if (curDPR !== moveDPR) {
          curDPR = moveDPR;
          renderer.setPixelRatio(curDPR);
        }
      } else if (curDPR !== fullDPR && now - lastMoveTime > 220) {
        curDPR = fullDPR;
        renderer.setPixelRatio(curDPR);
        needRender = true;
      }

      const animating = now < busyUntil;
      if (!(needRender || interacting || animating)) return; // kuch nahi badla – frame skip
      needRender = false;

      campus.update(dt);
      if (shadowDirty || now < shadowBusyUntil) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirty = false;
      }
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        callbacks.current.onReady?.();
      }
    });

    apiRef.current = { campus, env, flyTo, controls, scene, invalidate, dirtyShadows };

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', clearKeys);
      controls.dispose();
      campus.dispose();
      env.dispose();
      disposeTextures();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  }, []);

  // ---------- Props -> scene ----------
  useEffect(() => {
    if (view && view.nonce > 0) apiRef.current?.flyTo(view.id);
  }, [view]);

  // Din/raat + andar/bahar ke hisaab se sky lighting
  const applyLighting = () => {
    const api = apiRef.current;
    if (!api) return;
    api.env.setNight(night);
    if (interior) {
      // Andar sky ki roshni kam – roof ke neeche realistic lagta hai
      api.scene.environmentIntensity *= 0.35;
      api.env.hemi.intensity *= 0.4;
    }
    api.invalidate();
  };

  useEffect(() => {
    applyLighting();
    apiRef.current?.campus.setNight(night);
  }, [night]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    Object.entries(gates).forEach(([id, open]) => api.campus.setGateOpen(id, open));
    api.dirtyShadows(GATE_ANIM_MS); // gate hilte waqt render + shadow update
  }, [gates]);

  useEffect(() => {
    apiRef.current?.campus.setWallStyle(wallStyle);
    apiRef.current?.invalidate();
  }, [wallStyle]);

  useEffect(() => {
    apiRef.current?.campus.setFence(fence);
    apiRef.current?.dirtyShadows();
  }, [fence]);

  // Building ke andar / bahar
  useEffect(() => {
    interiorRef.current = interior;
    const api = apiRef.current;
    if (!api) return;
    api.campus.setInterior(interior);
    applyLighting();
    api.dirtyShadows();
    const c = api.controls;
    if (interior) {
      // Andar: scroll = chalna (zoom nahi), drag = 360° dekhna
      c.enableZoom = false;
      c.minDistance = 0.3;
      c.maxDistance = 40;
      c.minPolarAngle = 0.05;
      c.maxPolarAngle = Math.PI - 0.05; // upar roof aur neeche pit dono dekh sako
      c.rotateSpeed = 0.55;
      c.panSpeed = 0.8;
    } else {
      c.enableZoom = true;
      c.minDistance = 3;
      c.maxDistance = 380;
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI / 2 - 0.04;
      c.rotateSpeed = 1;
      c.panSpeed = 1;
    }
  }, [interior]);

  return <div className="scene3d" ref={mountRef} aria-label="3D model of the boundary wall" role="img" />;
}