import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Consolidate Blender objects by material for rendering, retaining a face range
// for each building so clicking a batch still returns the original source record.
export function batchScene(root, selectable = false) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    // Compressed glTF meshes can use normalized integer attributes. Expand
    // those before baking transforms or merging with floating-point geometry.
    for (const name of ['position', 'normal', 'uv']) {
      const attribute = geometry.getAttribute(name);
      if (!attribute || (attribute.array instanceof Float32Array && !attribute.normalized)) continue;
      const values = new Float32Array(attribute.count * attribute.itemSize);
      for (let i=0;i<attribute.count;i++) for(let c=0;c<attribute.itemSize;c++) values[i*attribute.itemSize+c]=attribute.getComponent(i,c);
      geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
    }
    geometry.applyMatrix4(object.matrixWorld);
    for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geometry.deleteAttribute(key);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    // glTF exports one primitive per material; imported multi-material nodes
    // are handled separately to preserve their original material groups.
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = Array.isArray(object.material) ? geometry.groups : [{ start: 0, count: geometry.attributes.position.count, materialIndex: 0 }];
    for (const group of groups) {
      const material = materials[group.materialIndex];
      const layer = object.userData.layer || (selectable ? 'buildings' : 'tower');
      const key = `${layer}:${material.uuid}`;
      if (!buckets.has(key)) buckets.set(key, { material, layer, geometries: [], ranges: [], count: 0 });
      const bucket = buckets.get(key);
      let part = geometry;
      if (groups.length > 1) {
        part = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(geometry.attributes)) part.setAttribute(name, new THREE.BufferAttribute(attribute.array.slice(group.start * attribute.itemSize, (group.start + group.count) * attribute.itemSize), attribute.itemSize));
      }
      const count = part.attributes.position.count / 3;
      bucket.ranges.push({ start: bucket.count, end: bucket.count + count, data: object.userData, box: new THREE.Box3().setFromBufferAttribute(part.attributes.position) });
      bucket.count += count;
      bucket.geometries.push(part);
    }
    if (groups.length > 1) geometry.dispose();
  });
  const result = new THREE.Group();
  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.geometries, false);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.name = bucket.layer;
    mesh.userData = { layer: bucket.layer, ranges: bucket.ranges };
    mesh.castShadow = ['tower', 'buildings'].includes(bucket.layer);
    mesh.receiveShadow = true;
    result.add(mesh);
    bucket.geometries.forEach(g => g.dispose());
  }
  root.traverse(o => o.geometry?.dispose());
  return result;
}

