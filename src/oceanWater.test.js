import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOceanWater } from './oceanWater.js';

test('Indian Ocean simulation initializes along the western coast with proper shader uniforms', () => {
  const scene = new THREE.Scene();
  const mockEnv = {
    direction: new THREE.Vector3(0.5, 0.8, 0.3),
    sun: {
      color: new THREE.Color('#ffffff'),
      intensity: 1.2,
    }
  };

  const oceanSystem = createOceanWater(scene, mockEnv, false);
  assert.ok(oceanSystem.ocean);
  assert.equal(oceanSystem.ocean.name, 'Indian Ocean · rolling surf & Galle Face coast');
  assert.ok(scene.children.includes(oceanSystem.ocean));

  // Verify coordinates: positioned west of Galle Face Green
  assert.ok(oceanSystem.ocean.position.x < -1500, 'Ocean must be located west of Colombo');
  assert.equal(oceanSystem.ocean.position.y, -0.25, 'Ocean surface must sit at sea level (Y = -0.25)');

  // Verify updates
  oceanSystem.update(12.5);
  assert.equal(oceanSystem.ocean.material.uniforms.time.value, 12.5);

  // Test lighting presets
  oceanSystem.setLighting('night');
  assert.equal(oceanSystem.ocean.material.uniforms.isNight.value, 1.0);
  oceanSystem.setLighting('golden');
  assert.equal(oceanSystem.ocean.material.uniforms.isNight.value, 0.0);

  // Test weather reaction
  oceanSystem.setWeather('storm');
  assert.ok(oceanSystem.ocean.material.uniforms.swellHeight.value > 0.6);

  // Test clean disposal
  oceanSystem.dispose();
  assert.ok(!scene.children.includes(oceanSystem.ocean));
});
