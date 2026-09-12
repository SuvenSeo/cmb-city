import * as THREE from 'three';
import { WEATHER_PRESETS } from './weatherPresets.js';

const oceanVertexShader = /* glsl */`
  uniform float time;
  uniform float windStrength;
  uniform float swellHeight;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWaveHeight;

  #include <common>
  #include <logdepthbuf_pars_vertex>
  #include <fog_pars_vertex>

  // Gerstner-style wave calculation
  vec3 getWaveOffset(vec2 p, float t, float wind) {
    vec3 offset = vec3(0.0);
    
    // Wave 1: Primary Indian Ocean swell (deep ocean rolling eastward towards Galle Face)
    vec2 d1 = normalize(vec2(0.96, -0.28));
    float k1 = 6.28318 / 65.0; // 65m wavelength
    float w1 = sqrt(9.8 * k1) * 0.9;
    float phase1 = dot(p, d1) * k1 - t * w1 * (0.8 + wind * 0.4);
    float a1 = swellHeight * (0.4 + wind * 0.3);
    offset.y += sin(phase1) * a1;
    offset.x -= d1.x * cos(phase1) * a1 * 0.3;
    offset.z -= d1.y * cos(phase1) * a1 * 0.3;

    // Wave 2: Secondary cross swell
    vec2 d2 = normalize(vec2(0.82, 0.57));
    float k2 = 6.28318 / 32.0; // 32m wavelength
    float w2 = sqrt(9.8 * k2) * 1.1;
    float phase2 = dot(p, d2) * k2 - t * w2 * (1.0 + wind * 0.5);
    float a2 = swellHeight * 0.25 * (1.0 + wind * 0.4);
    offset.y += sin(phase2) * a2;
    offset.x -= d2.x * cos(phase2) * a2 * 0.2;
    offset.z -= d2.y * cos(phase2) * a2 * 0.2;

    // Wave 3: Faster chop
    vec2 d3 = normalize(vec2(0.707, 0.707));
    float k3 = 6.28318 / 14.0;
    float phase3 = dot(p, d3) * k3 - t * 2.6 * (1.0 + wind);
    offset.y += sin(phase3) * (swellHeight * 0.1 + wind * 0.08);

    return offset;
  }

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    
    // Calculate wave displacement
    vec3 disp = getWaveOffset(worldPos.xz, time, windStrength);
    worldPos.xyz += disp;
    vWaveHeight = disp.y;

    // Compute approximate analytic normal from neighboring points
    float eps = 1.8;
    vec3 dispX = getWaveOffset(worldPos.xz + vec2(eps, 0.0), time, windStrength);
    vec3 dispZ = getWaveOffset(worldPos.xz + vec2(0.0, eps), time, windStrength);
    vec3 tangentX = vec3(eps, dispX.y - disp.y, 0.0);
    vec3 tangentZ = vec3(0.0, dispZ.y - disp.y, eps);
    vNormal = normalize(cross(tangentZ, tangentX));

    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`;

const oceanFragmentShader = /* glsl */`
  uniform vec3 deepColor;
  uniform vec3 shallowColor;
  uniform vec3 foamColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float sunIntensity;
  uniform float time;
  uniform float windStrength;
  uniform float isNight;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vWaveHeight;

  #include <common>
  #include <logdepthbuf_pars_fragment>
  #include <fog_pars_fragment>

  void main() {
    #include <logdepthbuf_fragment>

    vec3 normal = normalize(vNormal);
    vec3 toEye = normalize(cameraPosition - vWorldPosition);

    // Multi-octave natural surface capillary ripples
    vec2 p1 = vWorldPosition.xz * 0.08;
    vec2 p2 = vWorldPosition.xz * 0.22;
    vec2 p3 = vWorldPosition.xz * 0.55;
    
    vec2 ripple1 = vec2(sin(p1.x * 1.5 + time * 1.8 + p1.y * 0.9), cos(p1.y * 1.3 - time * 1.6 + p1.x * 0.7));
    vec2 ripple2 = vec2(cos(p2.x * 2.1 - time * 2.4 + p2.y * 1.2), sin(p2.y * 2.3 + time * 2.1 - p2.x * 0.8));
    vec2 ripple3 = vec2(sin(p3.x * 3.4 + time * 3.6), cos(p3.y * 3.7 - time * 3.2));
    
    vec2 totalSlope = (ripple1 * 0.45 + ripple2 * 0.35 + ripple3 * 0.2) * (0.05 + windStrength * 0.08);
    normal.xz += totalSlope;
    normal = normalize(normal);

    // Fresnel reflectance (water dielectric: ~0.02 at normal incidence, approaching 1.0 at glancing angles)
    float noV = max(dot(normal, toEye), 0.001);
    float fresnel = 0.02 + 0.98 * pow(1.0 - noV, 5.0);

    // Narrow coastal breaker zone right hugging the Galle Face sea wall.
    // Two out-of-phase swash fronts plus cross-shore noise break the bathtub ring.
    float coastEdge = smoothstep(-1460.0, -1375.0, vWorldPosition.x);
    float foamNoise = sin(vWorldPosition.z * 0.11 + time * 0.7) * sin(vWorldPosition.z * 0.031 - time * 0.4 + vWorldPosition.x * 0.01);
    float surfWave = sin(vWorldPosition.x * 0.22 - time * 2.5 + sin(vWorldPosition.z * 0.08) * 2.2 + foamNoise * 1.4);
    float surfWave2 = sin(vWorldPosition.x * 0.31 - time * 3.4 + cos(vWorldPosition.z * 0.13) * 1.7);
    float shoreFoam = coastEdge * (pow(max(0.0, surfWave), 3.0) * 0.55 + pow(max(0.0, surfWave2), 4.0) * 0.35);
    
    // Occasional whitecaps on high wave crests
    float crestFoam = pow(clamp((vWaveHeight - 0.25) / (0.3 + windStrength * 0.3), 0.0, 1.0), 3.0) * 0.4;
    float totalFoam = clamp(shoreFoam + crestFoam, 0.0, 1.0);

    // Deep ocean sapphire to coastal turquoise body color
    vec3 waterBody = mix(deepColor, shallowColor, coastEdge * 0.5);

    // Environment reflection
    vec3 skyReflect = mix(vec3(0.2, 0.45, 0.65), vec3(0.7, 0.85, 0.95), normal.y);
    if (isNight > 0.5) {
      skyReflect = vec3(0.02, 0.05, 0.12);
    }

    // GGX style specular sun/moon path
    vec3 halfDir = normalize(toEye + sunDirection);
    float noH = max(dot(normal, halfDir), 0.0);
    float specPower = isNight > 0.5 ? 64.0 : 128.0;
    float specular = pow(noH, specPower) * (isNight > 0.5 ? 1.2 : 3.2) * sunIntensity;

    // Composite final surface
    vec3 finalColor = mix(waterBody, skyReflect, fresnel);
    finalColor += sunColor * specular;
    finalColor = mix(finalColor, foamColor, totalFoam);

    gl_FragColor = vec4(finalColor, 0.98);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createOceanWater(scene, environment, small = false) {
  // Span from X = -1350 (Galle Face coast) westward to X = -5600 into the Indian Ocean
  // Span north/south from Z = -3500 (Port City & harbour mouth) to Z = 3500 (Kollupitiya/Bambalapitiya)
  const width = 4300; // X dimension
  const length = 7200; // Z dimension
  const segmentsX = small ? 48 : 88;
  const segmentsZ = small ? 64 : 120;

  const geometry = new THREE.PlaneGeometry(width, length, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = {
    time: { value: 0 },
    windStrength: { value: 0.3 },
    swellHeight: { value: 0.65 },
    deepColor: { value: new THREE.Color('#071f34') },
    shallowColor: { value: new THREE.Color('#0d596e') },
    foamColor: { value: new THREE.Color('#eaf5f8') },
    sunDirection: { value: new THREE.Vector3().copy(environment.direction) },
    sunColor: { value: new THREE.Color().copy(environment.sun.color) },
    sunIntensity: { value: 1.0 },
    isNight: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: oceanVertexShader,
    fragmentShader: oceanFragmentShader,
    uniforms: Object.assign(
      THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uniforms
    ),
    fog: true,
    transparent: true,
    side: THREE.FrontSide,
  });

  const ocean = new THREE.Mesh(geometry, material);
  ocean.name = 'Indian Ocean · rolling surf & Galle Face coast';
  // Position so eastern edge lands at X = -1350 (width = 4300 => center X = -1350 - 4300/2 = -3500)
  ocean.position.set(-3500, -0.25, 0);
  ocean.receiveShadow = true;
  scene.add(ocean);

  let currentLighting = 'daylight';
  let currentWeather = 'clear';

  function applyColors() {
    const isNight = currentLighting === 'night';
    const weather = WEATHER_PRESETS[currentWeather] || WEATHER_PRESETS.clear;
    uniforms.isNight.value = isNight ? 1.0 : 0.0;
    uniforms.windStrength.value = 0.2 + weather.wind * 0.9;
    uniforms.swellHeight.value = (0.5 + weather.wind * 0.7) * (weather.rain > 0.3 ? 1.4 : 1.0);

    if (isNight) {
      uniforms.deepColor.value.set('#030b14');
      uniforms.shallowColor.value.set('#061826');
      uniforms.foamColor.value.set('#3a5468');
    } else if (currentLighting === 'golden') {
      uniforms.deepColor.value.set('#08233a');
      uniforms.shallowColor.value.set('#185764');
      uniforms.foamColor.value.set('#fcedd8');
    } else if (currentLighting === 'morning') {
      uniforms.deepColor.value.set('#09253c');
      uniforms.shallowColor.value.set('#145e70');
      uniforms.foamColor.value.set('#e8f4f8');
    } else {
      // daylight
      uniforms.deepColor.value.set('#082642');
      uniforms.shallowColor.value.set('#0e677e');
      uniforms.foamColor.value.set('#f0fbff');
    }

    if (weather.darkness > 0.2) {
      uniforms.deepColor.value.lerp(new THREE.Color('#020910'), weather.darkness * 0.7);
      uniforms.shallowColor.value.lerp(new THREE.Color('#051924'), weather.darkness * 0.7);
    }
  }

  applyColors();

  return {
    ocean,
    setLighting(name) {
      currentLighting = name;
      applyColors();
    },
    setWeather(name) {
      currentWeather = name;
      applyColors();
    },
    update(time) {
      uniforms.time.value = time;
      uniforms.sunDirection.value.copy(environment.direction);
      uniforms.sunColor.value.copy(environment.sun.color);
      uniforms.sunIntensity.value = environment.sun.intensity;
    },
    dispose() {
      scene.remove(ocean);
      geometry.dispose();
      material.dispose();
    }
  };
}
