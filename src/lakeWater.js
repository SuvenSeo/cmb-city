import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {lakeGeometry, shorelineField} from './waterGeometry.js';
import {WEATHER_PRESETS} from './weatherPresets.js';

const shader = {
  name: 'Beira lake water',
  uniforms: {
    color: {value: new THREE.Color()}, tDiffuse: {value: null}, textureMatrix: {value: new THREE.Matrix4()},
    time: {value: 0}, sunDirection: {value: new THREE.Vector3()}, sunColor: {value: new THREE.Color()},
    sunIntensity: {value: 1}, rainStrength: {value: 0}, windStrength: {value: .3}, shoreMap: {value: null}, shoreBounds: {value: new THREE.Vector4()},
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 mirrorCoord;
    varying vec3 vWaterPosition;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    #include <fog_pars_vertex>
    #include <shadowmap_pars_vertex>
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWaterPosition = worldPosition.xyz;
      mirrorCoord = textureMatrix * vec4(position, 1.0);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <logdepthbuf_vertex>
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <fog_vertex>
      #include <shadowmap_vertex>
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D shoreMap;
    uniform vec4 shoreBounds;
    uniform vec3 color;
    uniform float time;
    uniform vec3 sunDirection;
    uniform vec3 sunColor;
    uniform float sunIntensity;
    uniform float rainStrength, windStrength;
    varying vec4 mirrorCoord;
    varying vec3 vWaterPosition;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <bsdfs>
    #include <fog_pars_fragment>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    vec2 ripple(vec2 p, vec2 direction, float wavelength, float amplitude, float speed) {
      float k = 6.2831853 / wavelength;
      float phase = dot(p, direction) * k - time * speed;
      // Suppress subpixel waves at a distance instead of sparkling/aliasing.
      float resolved = 1.0 - smoothstep(.5, 3.0, fwidth(phase));
      return direction * cos(phase) * amplitude * k * resolved;
    }

    void main() {
      #include <logdepthbuf_fragment>
      vec2 p = vWaterPosition.xz;
      vec2 wavePosition = p + vec2(sin(p.y * .037 + p.x * .011), sin(p.x * .029 - p.y * .013)) * 4.0;
      float swell = .035 + windStrength * .1;
      vec2 slope = ripple(wavePosition, vec2(.94, .342), 14., swell, .8 + windStrength)
        + ripple(wavePosition, vec2(.8, -.6), 6.7, swell * .55, 1.2 + windStrength)
        + ripple(wavePosition, vec2(-.35, .937), 3.1, swell * .24, 1.7 + windStrength)
        + ripple(wavePosition, vec2(.98, .199), 1.4, swell * .09, 2.4);
      if (rainStrength > .0) {
        vec2 cell = floor(p * .5), local = fract(p * .5) - .5;
        float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float age = fract(time * 1.7 + seed);
        float radius = length(local), ring = radius - age * .65;
        float resolved = 1.0 - smoothstep(.3, 1.8, length(fwidth(p)));
        slope += normalize(local + .0001) * sin(ring * 38.0) * exp(-abs(ring) * 14.0)
          * (1.0-age) * rainStrength * .08 * resolved;
        // Second finer ring layer breaks the reflection up in heavy rain.
        vec2 cell2 = floor(p * 2.0), local2 = fract(p * 2.0) - .5;
        float seed2 = fract(sin(dot(cell2, vec2(269.5, 183.3))) * 28001.8384);
        float age2 = fract(time * 2.3 + seed2);
        float radius2 = length(local2), ring2 = radius2 - age2 * .6;
        float resolved2 = 1.0 - smoothstep(.2, 1.2, length(fwidth(p * 2.0)));
        slope += normalize(local2 + .0001) * sin(ring2 * 30.0) * exp(-abs(ring2) * 12.0)
          * (1.0-age2) * rainStrength * .035 * resolved2;
      }
      vec3 n = normalize(vec3(-slope.x, 1., -slope.y));
      vec3 toEye = cameraPosition - vWaterPosition;
      vec3 view = normalize(toEye);
      float noV = max(dot(n, view), .001);
      float fresnel = .0204 + .92 * pow(1.0 - noV, 5.0);

      vec2 uv = mirrorCoord.xy / mirrorCoord.w;
      vec2 distortion = slope * (.035 + 2.0 / max(length(toEye), 20.));
      vec3 reflection = texture2D(tDiffuse, clamp(uv + distortion, .002, .998)).rgb;
      vec3 softened = texture2D(tDiffuse, clamp(uv + distortion + vec2(.0015, .0007) * (1.0 + windStrength * 2.0), .002, .998)).rgb;
      reflection = mix(reflection, softened, .35 + rainStrength * .2);

      vec2 shoreUV = (vec2(p.x, -p.y) - shoreBounds.xy) / shoreBounds.zw;
      float shoreDistance = texture2D(shoreMap, shoreUV).r * 80.;
      float shallows = exp(-shoreDistance * .09);
      float variation = sin(p.x * .016 + sin(p.y * .009)) * sin(p.y * .023);
      vec3 body = mix(color, color * vec3(1.12, 1.15, 1.12), shallows * .35);
      body *= 1. + .045 * variation;
      float shadow = getShadowMask();
      body *= .9 + max(dot(n, sunDirection), 0.) * sunIntensity * .08 * shadow;

      // GGX sun glint, with the dielectric Fresnel of air meeting water.
      vec3 halfDirection = normalize(view + sunDirection);
      float noH = max(dot(n, halfDirection), 0.);
      float a2 = .0025 + windStrength * .008;
      float denominator = noH * noH * (a2 - 1.) + 1.;
      float distribution = a2 / (3.14159265 * denominator * denominator);
      float glint = min(8., distribution * .0204 / max(4. * noV, .2));
      vec3 outgoingLight = mix(body, reflection, fresnel) + sunColor * min(glint, 2.0) * sunIntensity * shadow * .65;
      gl_FragColor = vec4(outgoingLight, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
};

export function createLakeWater(root, scene, environment, small) {
  const sources = [];
  root.traverse(mesh => { if (mesh.isMesh && /Beira Lake/.test(mesh.userData.surface || mesh.material.name)) sources.push(mesh); });
  if (!sources.length) return null;
  const {geometry, level} = lakeGeometry(sources);
  const shore = shorelineField(geometry, small ? 256 : 512);
  const water = new Reflector(geometry, {shader, textureWidth: small ? 512 : 1024, textureHeight: small ? 512 : 1024, multisample: 4, clipBias: .0001});
  water.name = 'Beira Lake · reflected skyline and wind ripples';
  water.rotation.x = -Math.PI / 2;
  water.position.y = level;
  water.receiveShadow = true;
  const material = water.material, uniforms = material.uniforms;
  material.lights = true; material.fog = true;
  Object.assign(uniforms, THREE.UniformsUtils.clone(THREE.UniformsLib.fog), THREE.UniformsUtils.clone(THREE.UniformsLib.lights));
  uniforms.color.value.set('#236f80');
  uniforms.shoreMap.value = shore.texture;
  uniforms.shoreBounds.value.copy(shore.bounds);
  for (const mesh of sources) mesh.visible = false;
  scene.add(water);

  let invalid = true, lastReflection = -Infinity, reflectionCount = 0, pendingUntil = 0;
  const lastView = new THREE.Matrix4(), lastProjection = new THREE.Matrix4();
  const reflect = water.onBeforeRender;
  water.onBeforeRender = function(renderer, reflectedScene, camera) {
    const time = performance.now();
    if (!invalid && lastView.equals(camera.matrixWorld) && lastProjection.equals(camera.projectionMatrix)) return;
    if (time - lastReflection < 250) { pendingUntil = time + 300; return; }
    reflect.call(water, renderer, reflectedScene, camera);
    lastView.copy(camera.matrixWorld); lastProjection.copy(camera.projectionMatrix);
    lastReflection = time; invalid = false; pendingUntil = 0; reflectionCount++;
  };
  return {
    setWeather(name, isNight = false) {
      const weather = WEATHER_PRESETS[name]; if (!weather) return;
      uniforms.rainStrength.value = weather.rain; uniforms.windStrength.value = weather.wind;
      if (isNight) {
        uniforms.color.value.set('#0a1624').lerp(new THREE.Color('#040810'), weather.darkness);
      } else {
        uniforms.color.value.set('#236f80').lerp(new THREE.Color('#254d60'), weather.darkness);
      }
      invalid = true;
    },
    setNight(isNight, weatherName = 'clear') {
      const weather = WEATHER_PRESETS[weatherName] || WEATHER_PRESETS.clear;
      if (isNight) {
        uniforms.color.value.set('#0a1624').lerp(new THREE.Color('#040810'), weather.darkness);
      } else {
        uniforms.color.value.set('#236f80').lerp(new THREE.Color('#254d60'), weather.darkness);
      }
      invalid = true;
    },
    update(time) {
      uniforms.time.value = time;
      uniforms.sunDirection.value.copy(environment.direction);
      uniforms.sunColor.value.copy(environment.sun.color);
      uniforms.sunIntensity.value = environment.sun.intensity;
    },
    invalidate: () => { invalid = true; },
    get reflections() { return reflectionCount; },
    get pending() { return performance.now() < pendingUntil; },
    dispose() {
      scene.remove(water); water.dispose(); geometry.dispose(); shore.texture.dispose();
    },
  };
}
