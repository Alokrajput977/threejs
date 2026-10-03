import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

/** Sky, sun, hemisphere light, fog, stars + day/night switch. */
export function createEnvironment(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(4500);
  const u = sky.material.uniforms;
  u.turbidity.value = 5.5;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.8;

  // Sun south-east se – main (south) gate par seedhi dhoop
  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - 38),
    THREE.MathUtils.degToRad(35),
  );
  u.sunPosition.value.copy(sunDir);

  // Sky se environment map (metal / glass reflections)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  const envRT = pmrem.fromScene(envScene);
  scene.add(sky);
  scene.environment = envRT.texture;

  const hemi = new THREE.HemisphereLight('#d8e9ff', '#5b4a33', 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#fff0d8', 3.1);
  sun.position.copy(sunDir).multiplyScalar(170);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -82;
  sc.right = 82;
  sc.top = 82;
  sc.bottom = -82;
  sc.near = 10;
  sc.far = 420;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog('#c9d7e3', 200, 900);

  // Stars (raat ke liye)
  const starGeo = new THREE.BufferGeometry();
  const N = 1800;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().setFromSphericalCoords(
      1200,
      Math.acos(Math.random() * 0.95),
      Math.random() * Math.PI * 2,
    );
    pos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: '#dfe8ff', size: 1.6, sizeAttenuation: false, fog: false }),
  );
  stars.visible = false;
  scene.add(stars);

  const dayBg = null;
  const nightBg = new THREE.Color('#081120');

  function setNight(night) {
    sky.visible = !night;
    stars.visible = night;
    scene.background = night ? nightBg : dayBg;
    scene.environmentIntensity = night ? 0.06 : 1.0;
    hemi.intensity = night ? 0.12 : 0.55;
    hemi.color.set(night ? '#5a6f9e' : '#d8e9ff');
    sun.intensity = night ? 0.35 : 3.1;
    sun.color.set(night ? '#9db6ff' : '#fff0d8');
    scene.fog.color.set(night ? '#081120' : '#c9d7e3');
    scene.fog.near = night ? 60 : 200;
    scene.fog.far = night ? 480 : 900;
    renderer.toneMappingExposure = night ? 1.15 : 0.9;
  }

  function dispose() {
    envRT.dispose();
    pmrem.dispose();
    sky.geometry.dispose();
    sky.material.dispose();
    starGeo.dispose();
    stars.material.dispose();
  }

  setNight(false);
  return { sun, hemi, sky, setNight, dispose };
}
