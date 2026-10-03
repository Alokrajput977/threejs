import * as THREE from 'three';

/** Box jiske UV meters mein hon – texture 1 tile = 1 meter. */
export function worldUVBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function scaleUV(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

export function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function addBox(parent, w, h, d, mat, x, y, z, opts) {
  const m = mesh(worldUVBox(w, h, d), mat, opts);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** Flat plane zameen par (horizontal), UV meters / tile ke hisaab se. */
export function groundPlane(w, d, mat, tile = 1) {
  const geo = scaleUV(new THREE.PlaneGeometry(w, d), w / tile, d / tile);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

export function seededRandom(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
