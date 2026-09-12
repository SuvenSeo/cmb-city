import test from 'node:test';
import assert from 'node:assert/strict';
import {renderScale} from './renderBudget.js';

test('Retina and virtual ultrawide displays stay within the drawing-buffer budget', () => {
  for (const [width, height, dpr] of [[3648,1539,2], [7296,3078,2], [3840,2160,2], [1920,1080,2]]) {
    const scale = renderScale(width, height, dpr);
    assert.ok(width * height * scale ** 2 <= 3_500_001);
    assert.ok(Math.max(width, height) * scale <= 3200.001);
  }
});

test('phones retain useful detail without allocating a full 3x surface', () => {
  const scale = renderScale(390, 844, 3);
  assert.ok(scale >= 1 && scale <= 2);
  assert.ok(390 * 844 * scale ** 2 <= 1_500_000);
  assert.equal(renderScale(1280, 720, 1), 1);
  assert.equal(renderScale(0, 0, 2), 1);
});
