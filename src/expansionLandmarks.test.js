import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ALL_LANDMARKS } from './landmarks.js';
import { LANDMARK_STORIES } from './landmarkStories.js';

const root = new URL('../public/landmarks/', import.meta.url);
const expansionCatalog = JSON.parse(fs.readFileSync(new URL('expansion_catalog.json', root), 'utf-8'));

test('all expansion landmark models decode with valid geometry and materials', async () => {
  assert.equal(expansionCatalog.length, 12, 'Expected 12 expansion landmarks in catalog');

  for (const entry of expansionCatalog) {
    const folder = new URL(`${entry.id}/`, root);
    assert.ok(fs.existsSync(new URL('map.glb', folder)), `${entry.id} map.glb exists`);
    assert.ok(fs.existsSync(new URL(`${entry.id}.glb`, folder)), `${entry.id} detailed glb exists`);
    assert.ok(fs.existsSync(new URL('README.md', folder)), `${entry.id} README.md exists`);
    assert.ok(fs.existsSync(new URL('metadata.json', folder)), `${entry.id} metadata.json exists`);
    assert.ok(fs.existsSync(new URL('references/01-overall.jpg', folder)), `${entry.id} reference photo exists`);

    // Verify map.glb decodes with MeshoptDecoder
    const bytes = fs.readFileSync(new URL('map.glb', folder));
    assert.ok(bytes.length > 5000, `${entry.id} map.glb is not empty`);
    assert.ok(bytes.length < 500000, `${entry.id} map.glb stays well within web budget (<500KB)`);

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    assert.ok(scene, `${entry.id} scene loaded`);

    let meshCount = 0;
    let triangleCount = 0;
    scene.traverse(obj => {
      if (obj.isMesh) {
        meshCount++;
        const pos = obj.geometry.attributes.position;
        const count = obj.geometry.index ? obj.geometry.index.count : pos.count;
        triangleCount += count / 3;
        assert.ok(obj.material.isMeshStandardMaterial, `${entry.id} mesh has MeshStandardMaterial`);
      }
    });

    assert.ok(meshCount >= 4, `${entry.id} has multiple architectural materials`);
    assert.ok(triangleCount > 1000 && triangleCount < 50000, `${entry.id} triangle budget check`);
  }
});

test('every expansion landmark has trilingual descriptions and complete stories', () => {
  const expansionIds = ['jami-ul-alfar', 'old-parliament', 'independence-hall', 'town-hall', 'galle-face-hotel', 'clock-tower', 'one_galle_face', 'cinnamon_life', 'port_city', 'sambodhi-chaithya', 'nelum-pokuna', 'harbour-cranes'];
  for (const id of expansionIds) {
    const place = ALL_LANDMARKS.find(p => p.id === id);
    assert.ok(place, `Landmark ${id} registered in ALL_LANDMARKS`);
    assert.ok(place.name.length > 0, `${id} English name`);
    assert.ok(/[\u0D80-\u0DFF]/.test(place.sinhala), `${id} Sinhala name`);

    const story = LANDMARK_STORIES[id];
    assert.ok(story, `Story for ${id} exists`);
    assert.ok(/[\u0B80-\u0BFF]/.test(story.tamil), `${id} Tamil name`);
    assert.ok(story.history.length > 90, `${id} history length`);
    assert.ok(story.architecture.length > 90, `${id} architecture length`);
    assert.ok(story.significance.length > 90, `${id} significance length`);
    assert.ok(story.sources.length > 0, `${id} has sources`);
  }
});
