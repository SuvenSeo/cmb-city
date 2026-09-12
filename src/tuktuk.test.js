import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTukTukModel } from './tuktukVehicle.js';
import { createTukTukPhysics } from './tuktukPhysics.js';

test('createTukTukModel constructs articulated Bajaj RE 3-wheeler with realistic components', () => {
  const tuk = createTukTukModel();
  assert.ok(tuk.root instanceof THREE.Group);
  assert.ok(tuk.bodyGroup instanceof THREE.Group);
  assert.ok(tuk.steerGroup instanceof THREE.Group);
  assert.ok(tuk.frontWheel instanceof THREE.Mesh);
  assert.equal(tuk.rearWheels.length, 2);

  // Check camera mounting anchors
  assert.ok(tuk.cameraMounts.cockpit instanceof THREE.Vector3);
  assert.ok(tuk.cameraMounts.passenger instanceof THREE.Vector3);
  assert.ok(tuk.cameraMounts.chaseOffset instanceof THREE.Vector3);

  // Test articulations
  tuk.setSteerAngle(0.35);
  assert.equal(tuk.steerGroup.rotation.y, 0.35);

  tuk.setBodyRoll(-0.12, 0.05);
  assert.equal(tuk.bodyGroup.rotation.z, -0.12);
  assert.equal(tuk.bodyGroup.rotation.x, 0.05);

  const initialRot = tuk.frontWheel.rotation.x;
  tuk.rollWheels(1.5);
  assert.ok(tuk.frontWheel.rotation.x > initialRot);

  tuk.dispose();
});

test('createTukTukPhysics simulates driving, reversing, steering lean, fare meter, and cameras', () => {
  const physics = createTukTukPhysics({ startX: 100, startY: 2, startZ: 200, startHeading: 0 });
  assert.equal(physics.position.x, 100);
  assert.equal(physics.position.z, 200);
  assert.equal(physics.speedKmH, 0);
  assert.equal(physics.fareLKR, 100.0);

  // 1. Accelerate forward
  for (let i = 0; i < 30; i++) {
    physics.updateDrive(0.05, { forward: true, backward: false, left: false, right: false });
  }
  assert.ok(physics.speed > 0, 'speed increases with forward input');
  assert.ok(physics.speedKmH > 0);
  assert.ok(physics.position.z > 200, 'translates forward along heading');
  assert.ok(physics.fareLKR >= 100.0, 'fare meter increments with distance');

  // 2. Steer left under speed -> body leans
  physics.updateDrive(0.1, { forward: true, backward: false, left: true, right: false });
  assert.ok(physics.steerAngle > 0, 'steering turns left');

  // 3. Braking
  const movingSpeed = physics.speed;
  for (let i = 0; i < 20; i++) {
    physics.updateDrive(0.05, { forward: false, backward: true, left: false, right: false });
  }
  assert.ok(physics.speed < movingSpeed, 'braking reduces speed');

  // 4. Camera positioning
  const camera = new THREE.PerspectiveCamera();
  const controls = { target: new THREE.Vector3() };

  physics.updateCamera(camera, controls, 'cockpit');
  assert.ok(camera.position.distanceTo(physics.position) < 2.0, 'cockpit camera sits close to vehicle position');

  physics.updateCamera(camera, controls, 'passenger');
  assert.ok(camera.position.distanceTo(physics.position) < 2.0, 'passenger camera sits inside vehicle');

  physics.updateCamera(camera, controls, 'chase');
  assert.ok(camera.position.y > physics.position.y, 'chase camera is elevated above vehicle');
});
