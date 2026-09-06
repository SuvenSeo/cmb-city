import test from 'node:test';
import assert from 'node:assert/strict';
import {WEATHER_PRESETS, lightningPulse} from './weatherPresets.js';

test('rain severity consistently increases rainfall, wind and surface wetness', () => {
  const sequence = ['clear','rain','heavy','storm'].map(name => WEATHER_PRESETS[name]);
  for (let i=1;i<sequence.length;i++) {
    for (const field of ['rain','wind','wetness','darkness']) assert.ok(sequence[i][field] > sequence[i-1][field]);
    assert.ok(sequence[i].fogScale < sequence[i-1].fogScale);
  }
  for (const weather of Object.values(WEATHER_PRESETS)) {
    assert.ok(weather.rain >= 0 && weather.rain <= 1);
    assert.ok(weather.wetness >= 0 && weather.wetness <= 1);
    assert.ok(weather.sun > 0 && weather.ambient > 0 && weather.fogScale > 0);
  }
});

test('lightning has one smooth pulse per interval and is completely disabled when requested', () => {
  let events = 0, previous = 0;
  for (let i=0;i<5100;i++) {
    const time=i/100, pulse=lightningPulse(time);
    assert.ok(pulse>=0&&pulse<=1);
    assert.equal(lightningPulse(time,false),0);
    if(pulse>0&&previous===0)events++;
    previous=pulse;
  }
  assert.equal(events,3,'At most one event in each 17-second period');
  assert.equal(lightningPulse(0),0);
  assert.ok(lightningPulse(6.35)>.99);
  assert.equal(lightningPulse(7),0);
});
