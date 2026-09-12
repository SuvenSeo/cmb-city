import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCinematicTour, TOUR_WAYPOINTS } from './explorationTour.js';

test('cinematic tour initializes waypoints and progresses smoothly', () => {
  assert.ok(TOUR_WAYPOINTS.length >= 6);
  assert.ok(TOUR_WAYPOINTS.some(w => w.id === 'galle_face'));
  assert.ok(TOUR_WAYPOINTS.some(w => w.id === 'port_city'));

  let activeWp = null;
  const tour = createCinematicTour({
    onWaypointChange: (wp) => { activeWp = wp; }
  });

  const camera = new THREE.PerspectiveCamera();
  const controls = { target: new THREE.Vector3(), update: () => {} };

  camera.position.set(0, 100, 0);
  controls.target.set(0, 0, 0);

  // Start tour
  tour.start(camera.position, controls.target, 0);
  assert.equal(tour.isActive, true);
  assert.equal(tour.isPaused, false);
  assert.ok(activeWp);
  assert.equal(activeWp.id, 'beira');

  // Step simulation forward
  const updateResult = tour.update(performance.now() + 1000, camera, controls);
  assert.ok(updateResult);
  assert.ok(updateResult.progress > 0);

  // Pause
  tour.togglePause();
  assert.equal(tour.isPaused, true);
  const pausedResult = tour.update(performance.now() + 2000, camera, controls);
  assert.equal(pausedResult, null);

  // Next waypoint
  tour.togglePause();
  tour.next(camera.position, controls.target);
  assert.equal(activeWp.id, 'lotus');

  // Stop tour
  tour.stop();
  assert.equal(tour.isActive, false);
});
