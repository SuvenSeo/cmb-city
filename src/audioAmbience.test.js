import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioAmbience } from './audioAmbience.js';

test('createAudioAmbience provides start, stop, toggle, volume, and horn controls cleanly', () => {
  const ambience = createAudioAmbience();
  assert.equal(typeof ambience.start, 'function');
  assert.equal(typeof ambience.stop, 'function');
  assert.equal(typeof ambience.toggle, 'function');
  assert.equal(typeof ambience.setVolume, 'function');
  assert.equal(typeof ambience.playTukTukHorn, 'function');
  assert.equal(typeof ambience.updateTukTukEngine, 'function');
  assert.equal(typeof ambience.stopTukTukEngine, 'function');
  assert.equal(typeof ambience.dispose, 'function');
  assert.equal(ambience.isPlaying, false);

  ambience.setVolume(0.8);
  ambience.stop();
  ambience.dispose();
  assert.equal(ambience.isPlaying, false);
});
