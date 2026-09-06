import * as THREE from 'three';

// Expand normalized glTF positions before applying metre-scale transforms.
// Preserve every triangle and island; never substitute a rectangular lake.
export function lakeGeometry(meshes) {
  const positions = [], point = new THREE.Vector3();
  let level;
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const source = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
    for (let i = 0; i < (index ? index.count : source.count); i++) {
      point.fromBufferAttribute(source, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      level ??= point.y;
      if (Math.abs(point.y - level) > .1) throw new Error('Reflective lake surfaces must share a water level.');
      positions.push(point.x, -point.z, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return {geometry, level};
}

// Rasterize the union before measuring distance, so adjoining model sectors
// do not create false shorelines. Distances approximate shallows, not bathymetry.
export function shorelineField(geometry, size = 512) {
  const box = geometry.boundingBox;
  const width = box.max.x - box.min.x, height = box.max.y - box.min.y;
  const mask = new Uint8Array(size * size), distance = new Float32Array(size * size);
  const p = geometry.attributes.position;
  const edge = (ax, ay, bx, by, x, y) => (x - ax) * (by - ay) - (y - ay) * (bx - ax);
  for (let i = 0; i < p.count; i += 3) {
    const x = [0, 1, 2].map(k => (p.getX(i + k) - box.min.x) / width * (size - 1));
    const y = [0, 1, 2].map(k => (p.getY(i + k) - box.min.y) / height * (size - 1));
    const sign = Math.sign(edge(x[0], y[0], x[1], y[1], x[2], y[2]));
    if (!sign) continue;
    for (let py = Math.max(0, Math.floor(Math.min(...y))); py <= Math.min(size - 1, Math.ceil(Math.max(...y))); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(...x))); px <= Math.min(size - 1, Math.ceil(Math.max(...x))); px++) {
        if ([0, 1, 2].every(k => sign * edge(x[k], y[k], x[(k + 1) % 3], y[(k + 1) % 3], px, py) >= -.001)) mask[py * size + px] = 1;
      }
    }
  }
  for (let i = 0; i < mask.length; i++) distance[i] = mask[i] ? 10000 : 0;
  const dx = width / (size - 1), dy = height / (size - 1), diagonal = Math.hypot(dx, dy);
  for (let pass = 0; pass < 2; pass++) {
    const step = pass === 0 ? 1 : -1;
    for (let y = pass === 0 ? 0 : size - 1; y >= 0 && y < size; y += step) {
      for (let x = pass === 0 ? 0 : size - 1; x >= 0 && x < size; x += step) {
        const i = y * size + x;
        if (!x || !y || x === size - 1 || y === size - 1) { distance[i] = 0; continue; }
        distance[i] = Math.min(distance[i], distance[i - step] + dx, distance[i - step * size] + dy,
          distance[i - step * size - 1] + diagonal, distance[i - step * size + 1] + diagonal);
      }
    }
  }
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) data[i] = Math.round(Math.min(1, distance[i] / 80) * 255);
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return {texture, bounds: new THREE.Vector4(box.min.x, box.min.y, width, height)};
}
