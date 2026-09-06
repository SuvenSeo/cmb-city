import * as THREE from 'three';
import {WEATHER_PRESETS, lightningPulse} from './weatherPresets.js';

export function createWeatherEffects(scene, small) {
  const capacity = small ? 1100 : 2600;
  const positions = new Float32Array(capacity * 6), seeds = new Float32Array(capacity * 6);
  let randomState = 7411;
  const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < capacity; i++) {
    const seed = [random(), random(), random()];
    seeds.set(seed, i * 6); seeds.set(seed, i * 6 + 3);
    positions[i * 6 + 4] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
  const uniforms = {time:{value:0}, strength:{value:0}, wind:{value:0}};
  const material = new THREE.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, toneMapped:false,
    vertexShader: `
      attribute vec3 seed;
      uniform float time, strength, wind;
      varying float alpha;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        float fall = mod(seed.y * 180.0 - time * (42.0 + seed.z * 28.0), 180.0);
        vec3 p = vec3((seed.x - .5) * 260.0 + fall * wind * .13,
          fall - 90.0, (seed.z - .5) * 260.0);
        p += vec3(wind * .35, -1.8 - strength * 1.7, .1) * position.y;
        float distanceFade = smoothstep(5.0, 18.0, length(p)) * (1.0 - smoothstep(80.0, 155.0, length(p)));
        alpha = distanceFade * (.16 + strength * .23) * mix(.3, 1.0, seed.x);
        vec4 mvPosition = viewMatrix * vec4(p + cameraPosition, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: `
      varying float alpha;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        gl_FragColor = vec4(.73, .83, .9, alpha);
      }
    `,
  });
  const rain = new THREE.LineSegments(geometry, material);
  // View-local effects must not leave frozen streaks in the cached reflection.
  rain.layers.set(1);
  rain.name = 'Camera-local rain'; rain.frustumCulled = false; rain.visible = false;
  scene.add(rain);

  const boltPoints = [], base = new THREE.Vector3();
  for (let i = 0; i < 18; i++) {
    const next = new THREE.Vector3((random() - .5) * 120, 1900 - i * 100, (random() - .5) * 35);
    if (i) boltPoints.push(base.clone(), next.clone());
    if (i === 8 || i === 11) boltPoints.push(next.clone(), next.clone().add(new THREE.Vector3(180, -230, 60)));
    base.copy(next);
  }
  const boltGeometry = new THREE.BufferGeometry().setFromPoints(boltPoints);
  const boltMaterial = new THREE.LineBasicMaterial({color:'#e3f1ff', transparent:true, opacity:0, toneMapped:false, depthWrite:false});
  const bolt = new THREE.LineSegments(boltGeometry, boltMaterial); bolt.visible = false;
  bolt.layers.set(1);
  bolt.name = 'Distant lightning'; scene.add(bolt);
  const forward = new THREE.Vector3();
  let weather = WEATHER_PRESETS.clear, kind = 'clear', flash = 0;
  return {
    set(name) {
      if (!WEATHER_PRESETS[name]) return false;
      kind = name; weather = WEATHER_PRESETS[name];
      uniforms.strength.value = weather.rain; uniforms.wind.value = weather.wind;
      geometry.setDrawRange(0, Math.round(capacity * weather.rain) * 2);
      rain.visible = weather.rain > 0; bolt.visible = false; return true;
    },
    update(time, camera, target, allowLightning) {
      uniforms.time.value = time;
      flash = kind === 'storm' ? lightningPulse(time, allowLightning) : 0;
      bolt.visible = flash > .02; boltMaterial.opacity = flash * .85;
      if (bolt.visible) {
        camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
        bolt.position.copy(target).addScaledVector(forward, 1800);
        bolt.position.x += 420; bolt.position.y = 0;
      }
      return flash;
    },
    get flash() { return flash; },
    get drops() { return Math.round(capacity * weather.rain); },
    dispose() { scene.remove(rain, bolt); geometry.dispose(); material.dispose(); boltGeometry.dispose(); boltMaterial.dispose(); },
  };
}
