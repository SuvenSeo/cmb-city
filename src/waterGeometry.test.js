import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {lakeGeometry, shorelineField} from './waterGeometry.js';

test('lake geometry preserves normalized, indexed glTF shorelines in world metres', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Int16BufferAttribute([0, 0, 0, 32767, 0, 0, 0, 0, -32767], 3, true));
  source.setIndex([0, 1, 2]);
  const mesh = new THREE.Mesh(source);
  mesh.position.set(100, -5.875, -200); mesh.scale.setScalar(50);
  const {geometry, level} = lakeGeometry([mesh]);
  assert.equal(level, -5.875);
  assert.deepEqual(Array.from(geometry.attributes.position.array), [100, 200, 0, 150, 200, 0, 100, 250, 0]);
  const water = new THREE.Mesh(geometry); water.rotation.x = -Math.PI / 2; water.position.y = level; water.updateMatrixWorld();
  const position = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, 2).applyMatrix4(water.matrixWorld);
  assert.ok(position.distanceTo(new THREE.Vector3(100, -5.875, -250)) < 1e-8);
  source.dispose(); geometry.dispose(); mesh.material.dispose(); water.material.dispose();
});

test('a nonplanar surface cannot silently use an incorrect reflection plane', () => {
  const geometry = new THREE.PlaneGeometry(10, 10);
  const mesh = new THREE.Mesh(geometry);
  assert.throws(() => lakeGeometry([mesh]), /share a water level/);
  geometry.dispose(); mesh.material.dispose();
});

test('shoreline distance preserves an island and has no internal triangulation seams', () => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(400, 0); shape.lineTo(400, 400); shape.lineTo(0, 400); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(180, 180); hole.lineTo(180, 220); hole.lineTo(220, 220); hole.lineTo(220, 180); hole.closePath();
  shape.holes.push(hole);
  const indexed = new THREE.ShapeGeometry(shape), geometry = indexed.toNonIndexed();
  geometry.computeBoundingBox();
  const {texture, bounds} = shorelineField(geometry, 101);
  const sample = (x, y) => texture.image.data[Math.round(y / 4) * 101 + Math.round(x / 4)] * 80 / 255;
  assert.deepEqual(bounds.toArray(), [0, 0, 400, 400]);
  assert.equal(sample(200, 200), 0, 'An island remains land');
  assert.equal(sample(0, 100), 0, 'Outer shoreline is shallow');
  assert.ok(sample(8, 100) < 15);
  assert.ok(sample(100, 100) > 70, 'Interior water stays deep across triangle boundaries');
  assert.ok(sample(176, 200) < 10, 'Water beside the island is shallow');
  texture.dispose(); geometry.dispose(); indexed.dispose();
});
