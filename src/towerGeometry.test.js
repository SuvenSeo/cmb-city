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
    return ray.intersectObject(root, true).find(h => h.object.material.name === material).point.y;
  }
  const paving = 'Paving | pale limestone', ceramic = 'Pavilion and radome | warm white ceramic';
  const roofBefore = surfaceHeight(scene, paving);
  const capBefore = surfaceHeight(scene, ceramic);
  assert.ok(roofBefore - capBefore < .005, 'Fixture reproduces the nearly coincident exported roof surfaces');
  const parapet = scene.getObjectByName('Pavilion_|_parapet_sill');
  const parapetBefore = parapet.geometry.attributes.position.array.slice();
  assert.ok(separatePavilionRoof(scene) > 0);
  assert.equal(surfaceHeight(scene, paving), roofBefore, 'Visible terrace does not move');
  assert.deepEqual(parapet.geometry.attributes.position.array, parapetBefore, 'Parapet is unchanged');
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
