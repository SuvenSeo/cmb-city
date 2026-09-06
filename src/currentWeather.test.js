import test from 'node:test';
import assert from 'node:assert/strict';
import {readCurrentWeather} from './currentWeather.js';
test('temperature uses the provider timestamp and rejects missing or stale readings',()=>{
  const now=Date.now(), data={current:{temperature_2m:28.4,time:Math.floor(now/1000),weather_code:3},current_units:{temperature_2m:'°C'}};
  assert.equal(readCurrentWeather(data,now).temperature,28);
  assert.equal(readCurrentWeather(data,now).condition,'Cloudy');
  assert.throws(()=>readCurrentWeather({...data,current:{...data.current,temperature_2m:null}},now));
  assert.throws(()=>readCurrentWeather(data,now+3*60*60*1000));
  assert.throws(()=>readCurrentWeather({...data,current_units:{temperature_2m:'°F'}},now));
});
