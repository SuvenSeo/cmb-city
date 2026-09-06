import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3, DirectionalLight} from 'three';
import {solarDirection, shadowFrame, ENVIRONMENTS} from './environment.js';

test('Colombo daylight runs east to west in the map coordinate system', () => {
  assert.ok(solarDirection(9).x > 0, 'Morning sunlight comes from the east');
  assert.ok(solarDirection(17).x < 0, 'Evening sunlight comes from the west');
  assert.ok(solarDirection(12).y > .99, 'Equatorial midday sun is nearly overhead');
  for (const preset of Object.values(ENVIRONMENTS)) {
    const direction = solarDirection(preset.hour);
    assert.ok(Math.abs(direction.length() - 1) < 1e-10);
    assert.ok(direction.y > 0, 'Every daylight preset keeps the sun above the horizon');
  }
});

test('panning keeps stationary buildings on the same shadow texel grid', () => {
  const building = new Vector3(-413, 199, 894);
  for (const resolution of [2048, 4096]) for (const preset of Object.values(ENVIRONMENTS)) {
    const direction = solarDirection(preset.hour);
    const light = new DirectionalLight();
    Object.assign(light.shadow.camera, {near: 100, far: 10000});
    let previous;
    for (let step = 0; step < 80; step++) {
      const {extent, focus} = shadowFrame(direction, new Vector3(35 + step * .37, 180, 60 - step * .23), 730, resolution);
      light.position.copy(focus).addScaledVector(direction, 5000);
      light.target.position.copy(focus);
      light.updateMatrixWorld(); light.target.updateMatrixWorld();
      Object.assign(light.shadow.camera, {left: -extent, right: extent, top: extent, bottom: -extent});
      light.shadow.camera.updateProjectionMatrix(); light.shadow.updateMatrices(light);
      const pixel = building.clone().project(light.shadow.camera).multiplyScalar(resolution / 2);
      if (previous) {
        for (const axis of ['x', 'y']) {
          const shift = pixel[axis] - previous[axis];
          assert.ok(Math.abs(shift - Math.round(shift)) < 1e-8, 'Panning shifts shadows by whole texels only');
        }
        assert.ok(Math.abs(pixel.z - previous.z) < 1e-8, 'Panning preserves shadow depth precision');
      }
      previous = pixel;
    }
  }
});

test('small zoom reversals do not repeatedly resize the shadow map', () => {
  const direction = solarDirection(9.5), target = new Vector3();
  let extent = 0;
  for (const distance of [1000, 1020, 1025, 1020, 1026, 1023, 1000]) {
    const next = shadowFrame(direction, target, distance, 2048, extent).extent;
    assert.ok(next >= extent, 'Zooming back across the expansion boundary retains the larger map');
    extent = next;
  }
  assert.equal(extent, 2048);
  assert.equal(shadowFrame(direction, target, 700, 2048, extent).extent, 1024);
  assert.equal(shadowFrame(direction, target, 8500, 2048, extent).extent, 4096);
});
