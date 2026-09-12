import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCityTraffic} from './cityTraffic.js';

test('city traffic initializes vehicles and runs simulation steps', () => {
  const scene = new THREE.Scene();
  const traffic = createCityTraffic(scene);
  assert.ok(traffic, 'Traffic system initialized');
  assert.ok(scene.children.some(c => c.name === 'Colombo living traffic'), 'Traffic added to scene');

  // Test daytime update
  traffic.update(0.033, 1.0, false);

  const pose = traffic.getTukTukPose(0);
  assert.ok(pose, 'Tuk-Tuk pose returned');
  assert.ok(Number.isFinite(pose.position.x), 'Pose has valid X coordinate');
  assert.ok(Number.isFinite(pose.speedKmH), 'Pose has valid speed in km/h');
  assert.ok(traffic.getTukTukCount() > 0, 'Tuk-Tuk count > 0');

  // Test night update (lights on)
  traffic.update(0.033, 2.0, true);

  // Test cleanup
  traffic.dispose();
  assert.ok(!scene.children.some(c => c.name === 'Colombo living traffic'), 'Traffic removed on dispose');
});
