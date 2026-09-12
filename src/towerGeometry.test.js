import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Raycaster, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {batchScene} from './batchScene.js';
import {separatePavilionRoof} from './towerGeometry.js';

test('the real pavilion cap stays separated from its terrace after batching', async () => {
  const file = await readFile(new URL('../public/map/lotus-tower.glb', import.meta.url));
  const {scene} = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  scene.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(28.3, 30, 7.9), new Vector3(0, -1, 0));
  function surfaceHeight(root, material) {
    const hit = ray.intersectObject(root, true).find(h => {
      const materials = Array.isArray(h.object.material) ? h.object.material : [h.object.material];
      return materials.some(entry => entry?.name === material);
    });
    return hit.point.y;
  }
  function ceramicBand(root) {
    // World positions of every ceramic vertex in the parapet/terrace band.
    // The cap ring sits at the terrace level; the parapet rises just above it.
    root.updateMatrixWorld(true);
    const world = new Vector3(), out = [];
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!materials.some(entry => entry?.name === ceramic)) return;
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        if (world.y > 14.4 && world.y < 15.1) out.push(+world.x.toFixed(4), +world.y.toFixed(4), +world.z.toFixed(4));
      }
    });
    return out;
  }
  const paving = 'Paving | pale limestone', ceramic = 'Pavilion and radome | warm white ceramic';
  const roofBefore = surfaceHeight(scene, paving);
  const capBefore = surfaceHeight(scene, ceramic);
  assert.ok(roofBefore - capBefore < .005, 'Fixture reproduces the nearly coincident exported roof surfaces');
  const bandBefore = ceramicBand(scene);
  assert.ok(bandBefore.length > 0, 'Terrace band has ceramic vertices to guard');
  const upperBefore = bandBefore.filter((_, index) => index % 3 === 1 && bandBefore[index] > 14.7);
  assert.ok(separatePavilionRoof(scene) > 0);
  assert.equal(surfaceHeight(scene, paving), roofBefore, 'Visible terrace does not move');
  const bandAfter = ceramicBand(scene);
  assert.equal(bandAfter.length, bandBefore.length, 'No ceramic vertices appear or vanish');
  const upperAfter = bandAfter.filter((_, index) => index % 3 === 1 && bandBefore[index] > 14.7);
  assert.deepEqual(upperAfter, upperBefore, 'Parapet body above the cap line is unchanged');
  let moved = 0;
  for (let i = 0; i < bandBefore.length; i += 3) {
    const dx = bandAfter[i] - bandBefore[i], dy = bandAfter[i + 1] - bandBefore[i + 1], dz = bandAfter[i + 2] - bandBefore[i + 2];
    if (dx === 0 && dy === 0 && dz === 0) continue;
    moved++;
    assert.equal(dx, 0, 'Cap vertices move only downward');
    assert.equal(dz, 0, 'Cap vertices move only downward');
    assert.ok(Math.abs(dy + .1) < .0001, 'Cap ring recesses exactly 100 mm');
    assert.ok(bandBefore[i + 1] > 14.4 && bandBefore[i + 1] < 14.8, 'Only the terrace-level ring moves; the parapet is untouched');
  }
  assert.ok(moved > 0, 'The cap ring actually moved');
  assert.ok(Math.abs(roofBefore - surfaceHeight(scene, ceramic) - .1) < .0001);
  assert.equal(separatePavilionRoof(scene), 0, 'Correction is idempotent');
  const batched = batchScene(scene);
  batched.updateMatrixWorld(true);
  for (const [x, z] of [[28.3, 7.9], [-24.7, 16.3], [12.3, -29.1], [-8.2, -26.7]]) {
    ray.ray.origin.set(x, 30, z);
    const separation = surfaceHeight(batched, paving) - surfaceHeight(batched, ceramic);
    assert.ok(Math.abs(separation - .1) < .0001, 'Merged world-space faces retain their clearance');
  }
});
