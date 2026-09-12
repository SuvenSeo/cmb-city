import {ShaderChunk} from 'three';

export function surfaceDetailWidth(name) {
  if (/concrete ledges/.test(name)) return .15;
  if (/edge ribs/.test(name)) return .1;
  if (/mullions|construction joints/.test(name)) return .04;
  return 0;
}

const facades = [
  '#dedcd4', // Crisp ivory white plaster
  '#8eaab8', // Coastal sea-spray blue tint
  '#e2d5c2', // Warm colonial British/Dutch buff ochre
  '#729ab0', // Modern high-rise architectural glass blue
  '#cccfc5', // Pale limestone concrete
  '#86adc0', // Beira lakefront glass tint
  '#dfd4c8', // Warm terracotta-washed plaster
  '#5e899e'  // Deep twilight architectural cyan
];

const palette = [
  [/Ground/, '#bfb49b'], // Warm coastal sandy soil
  [/Open space/, '#4c7b41'], // Rich tropical emerald grass
  [/Road/, '#282b2f'], // Deep rich charcoal asphalt
  [/Railway/, '#3c3834'], // Dark railway ballast & track
  [/Pavement|Paving/, '#d4cdbe'], // Warm pedestrian concrete paving
  [/terracotta/, '#b8512e'], // Rich baked Sri Lankan terracotta roof clay
  [/faded red/, '#a34226'], // Aged reddish-clay tile
  [/weathered ivory/, '#ede8dc'], // Weathered colonial ivory facade
  [/Roof.*cement/, '#adb2ab'], // Concrete rooftop slabs
  [/Roof.*warm grey/, '#a0a7a2'], // Urban grey roofs
  [/blue-grey metal/, '#647785'], // Corrugated tin/zinc roof sheets
  [/equipment and water tanks/, '#1b64a8'], // Iconic bright Sintex blue Sri Lankan water tanks
  [/Trees.*trunks/, '#756d5c'], // Tropical tree bark
  [/Foliage/, '#3e6a34'], // Deep tropical canopy green
  [/reflective glazing|Curtain wall/, '#5f8da5'], // High-rise architectural curtain wall glass
  [/Shaft.*emerald/, '#d7d9d6'],
  [/Calyx/, '#557c70'],
  [/Pavilion and radome/, '#deded3'],
  [/Concrete/, '#b5bcb4'],
  [/satin silver/, '#cbd3ce'],
  [/Frames/, '#34383c'],
];

export function createSurfaceMaterials(renderer) {
  const prepared = new WeakSet(), wetness = {value: 0}, nightMode = {value: 0}, time = {value: 0};
  function prepare(material, distant = false) {
    if (!material?.isMeshStandardMaterial || prepared.has(material)) return;
    prepared.add(material);
    const name = material.name, facade = /plaster and window grid/.test(name);
    const isTowerPetal = /Petal glazing|magenta structural ribs/.test(name);
    const isTowerShaft = /Shaft.*emerald|Calyx/.test(name);
    const isTowerPavilion = /Pavilion and radome/.test(name);
    const isRoad = /Road/.test(name);
    const isTerracotta = /terracotta|faded red/.test(name);
    const isGlazing = /reflective glazing|Curtain wall/.test(name);

    material.metalness = 0; material.roughness = .86; material.envMapIntensity = .55;
    if (facade) {
      const variant = Number(name.match(/Facade (\d+)/)?.[1] || 0);
      material.color.set(facades[variant % facades.length]);
    } else {
      const entry = palette.find(([match]) => match.test(name));
      if (entry) material.color.set(entry[1]);
    }
    if (/Petal glazing/.test(name)) {
      const variant = Number(name.match(/tint (\d+)/)?.[1] || 0);
      material.color.set('#b77f98').multiplyScalar(.94 + variant * .008);
      material.roughness = .45; material.metalness = .18;
    }
    if (/magenta structural ribs/.test(name)) material.color.set('#976982');
    if (isGlazing) {
      // Dielectric architectural glass: clear reflections from the HDR sky,
      // never the brushed-aluminium tint of a high metalness value.
      material.roughness = .06;
      material.metalness = 0;
      material.envMapIntensity = 1.4;
    }
    if (isRoad) {
      material.roughness = .9;
      material.metalness = 0;
      material.envMapIntensity = .7;
    }
    if (distant) material.envMapIntensity = .25;
    const detailWidth = surfaceDetailWidth(name);
    if (detailWidth) material.alphaToCoverage = true;
    if (material.map) material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const wettable = /Ground|Road|Pavement|Paving|Roof|Concrete/.test(name);
    const isFoliage = /Foliage|canopy|Canopy|Leaves/.test(name);
    const hasNightGlow = facade || isGlazing || isTowerPetal || isTowerShaft || isTowerPavilion;
    if (!facade && !isGlazing && !detailWidth && !wettable && !hasNightGlow && !isRoad && !isTerracotta && !isFoliage) return;

    material.onBeforeCompile = shader => {
      shader.uniforms.cityNightMode = nightMode;
      shader.uniforms.cityTime = time;

      // Pass world position from vertex to fragment shader
      shader.vertexShader = 'varying vec3 vWorldPos;\nuniform float cityTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
        #include <worldpos_vertex>
        vec4 wPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wPos = instanceMatrix * wPos;
          ${isFoliage ? `
            // Gentle coastal breeze swaying tropical tree canopies
            float windSway = sin(cityTime * 2.4 + wPos.x * 0.08 + wPos.z * 0.08);
            transformed.x += windSway * 0.12 * smoothstep(0.0, 3.5, transformed.y);
            transformed.z += cos(cityTime * 2.0 + wPos.z * 0.1) * 0.10 * smoothstep(0.0, 3.5, transformed.y);
          ` : ''}
        #endif
        vWorldPos = (modelMatrix * wPos).xyz;
      `);

      shader.fragmentShader = 'varying vec3 vWorldPos;\nuniform float cityNightMode;\nuniform float cityTime;\n' + shader.fragmentShader;

      if (wettable) {
        shader.uniforms.cityWetness = wetness;
        shader.fragmentShader = 'uniform float cityWetness;\n' + shader.fragmentShader;
        if (isRoad) {
          // World-anchored asphalt mineral aggregate & wet micro-puddles
          shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
            // World-anchored realistic dark asphalt macadam aggregate
            float fineGrain = fract(sin(dot(floor(vWorldPos.xz * 18.0), vec2(12.9898, 78.233))) * 43758.5453);
            float coarseGrain = fract(sin(dot(floor(vWorldPos.xz * 4.5), vec2(37.12, 61.83))) * 19283.45);
            float macroWear = fract(sin(dot(floor(vWorldPos.xz * 0.8), vec2(53.19, 29.41))) * 28472.13);
            float asphaltNoise = mix(fineGrain, coarseGrain, 0.35);
            asphaltNoise = mix(asphaltNoise, macroWear, 0.25);
            
            // Rich dark basalt bitumen tarmac tones
            vec3 asphaltColor = vec3(0.19, 0.20, 0.21) * mix(0.92, 1.10, asphaltNoise);
            diffuseColor.rgb = mix(diffuseColor.rgb, asphaltColor, 0.65);
            // Large-scale tonal patching (repairs, sun-bleaching) plus darker
            // wheel-polish bands so multi-lane arterials read at eye level.
            float patchTone = fract(sin(dot(floor(vWorldPos.xz * 0.23), vec2(91.7, 47.3))) * 31861.7);
            diffuseColor.rgb *= mix(0.94, 1.05, patchTone);
            float wheelBand = abs(fract((vWorldPos.x + vWorldPos.z) * 0.16) - 0.5);
            diffuseColor.rgb *= mix(0.93, 1.0, smoothstep(0.02, 0.22, wheelBand));

            if (cityWetness > 0.01) {
              diffuseColor.rgb *= mix(1.0, 0.48, cityWetness);
            }
          `).replace('#include <roughnessmap_fragment>', `
            #include <roughnessmap_fragment>
            float rFine = fract(sin(dot(floor(vWorldPos.xz * 14.0), vec2(12.9898, 78.233))) * 43758.5453);
            float rPuddle = smoothstep(0.35, 0.70, rFine);
            if (cityWetness > 0.01) {
              roughnessFactor = mix(roughnessFactor, mix(0.06, 0.22, rPuddle), cityWetness);
            }
          `);
        } else {
          shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
            // Large-scale weathering: concrete mottling, plaster variation,
            // monsoon base grime near the ground with vertical rain streaks.
            float weatherGrain = fract(sin(dot(floor(vWorldPos.xz * 2.0) + floor(vWorldPos.yy * 2.0), vec2(12.9898, 78.233))) * 43758.5453);
            roughnessFactor += (weatherGrain - 0.5) * 0.25;
            float baseGrime = (1.0 - smoothstep(0.0, 8.0, vWorldPos.y)) * 0.15;
            float rainStreak = fract(sin(dot(floor(vWorldPos.xz * 0.3), vec2(53.19, 29.41))) * 28472.13) * smoothstep(4.0, 30.0, vWorldPos.y) * 0.08;
            roughnessFactor = clamp(roughnessFactor, 0.05, 1.0);
            if (cityWetness > 0.01) {
              roughnessFactor = mix(roughnessFactor, .3, cityWetness);
            }`)
            .replace('#include <color_fragment>', `#include <color_fragment>
            float weatherTone = fract(sin(dot(floor(vWorldPos.xz * 1.4) + floor(vWorldPos.yy * 1.4), vec2(37.12, 61.83))) * 19283.45);
            diffuseColor.rgb *= mix(0.92, 1.06, weatherTone);
            diffuseColor.rgb *= 1.0 - (1.0 - smoothstep(0.0, 8.0, vWorldPos.y)) * 0.15;
            diffuseColor.rgb *= mix(1.0, .72, cityWetness);`);
        }
      }

      if (isTerracotta) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float tileRow = sin((vWorldPos.x + vWorldPos.z) * 16.0) * 0.5 + 0.5;
          diffuseColor.rgb *= mix(0.90, 1.08, tileRow);
        `);
      }

      if (detailWidth) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float detailPixels = ${detailWidth.toFixed(3)} / max(length(fwidth(vViewPosition)), .0001);
          float detailCoverage = smoothstep(.5, 1.5, detailPixels);
          if (detailCoverage <= 0.0) discard;
          diffuseColor.a *= detailCoverage;
        `);
      }

      if (facade) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
          ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, 0.0 )')
            .replace('diffuseColor *= sampledDiffuseColor;', `
              float facadeDetail = 1.0 - smoothstep(.008, .045, length(fwidth(vMapUv)));
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.4 + 0.6 * sampledDiffuseColor.rgb), facadeDetail);
              float floorBand = smoothstep(0.0, 0.12, abs(fract(vWorldPos.y / 3.4) - 0.5));
              diffuseColor.rgb *= mix(0.88, 1.02, floorBand);
            `)).replace('#include <roughnessmap_fragment>', `
            #include <roughnessmap_fragment>
            float facadeDetailRough = 1.0 - smoothstep(.008, .045, length(fwidth(vMapUv)));
            float windowToneRough = dot(texture2D(map, vMapUv).rgb, vec3(.2126, .7152, .0722));
            if (windowToneRough < 0.45) {
              roughnessFactor = mix(roughnessFactor, 0.18, facadeDetailRough);
            }
          `);

        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          if (cityNightMode > 0.01) {
            float windowTone = dot(sampledDiffuseColor.rgb, vec3(.2126, .7152, .0722));
            if (windowTone < 0.44) {
              vec2 windowGrid = floor(vMapUv * vec2(16.0, 32.0));
              float winRnd = fract(sin(dot(windowGrid, vec2(12.9898, 78.233))) * 43758.5453);
              if (winRnd > 0.65) {
                vec3 warmLight = mix(vec3(1.0, 0.86, 0.58), vec3(0.72, 0.90, 1.0), fract(winRnd * 7.7));
                float flicker = 0.95 + 0.05 * sin(cityTime * 0.4 + winRnd * 18.0);
                float distFade = 1.0 - smoothstep(0.008, 0.045, length(fwidth(vMapUv)));
                totalEmissiveRadiance += warmLight * flicker * (1.2 * cityNightMode * distFade);
              }
            }
            // Rooftop aviation warning beacons on Colombo skyscrapers
            if (vWorldPos.y > 95.0) {
              float beaconPulse = step(0.82, fract(cityTime * 0.75 + vWorldPos.x * 0.005));
              float beaconZone = smoothstep(110.0, 170.0, vWorldPos.y);
              totalEmissiveRadiance += vec3(1.0, 0.08, 0.08) * beaconPulse * beaconZone * (2.8 * cityNightMode);
            }
          }
        `);
      }

      if (isGlazing) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          if (cityNightMode > 0.01) {
            // Lit office/hotel windows scattered across the curtain wall.
            vec2 towerGrid = floor(vWorldPos.xz * 0.35) + floor(vWorldPos.yy * 0.28);
            float towerRnd = fract(sin(dot(towerGrid, vec2(12.9898, 78.233))) * 43758.5453);
            if (towerRnd > 0.55) {
              vec3 roomLight = mix(vec3(1.0, 0.85, 0.6), vec3(0.75, 0.9, 1.0), fract(towerRnd * 9.3));
              totalEmissiveRadiance += roomLight * 0.9 * cityNightMode;
            }
            // Rooftop aviation beacons on towers above 95 m.
            if (vWorldPos.y > 95.0) {
              float beaconPulse = step(0.82, fract(cityTime * 0.75 + vWorldPos.x * 0.005));
              float beaconZone = smoothstep(110.0, 170.0, vWorldPos.y);
              totalEmissiveRadiance += vec3(1.0, 0.08, 0.08) * beaconPulse * beaconZone * (2.8 * cityNightMode);
            }
          }
        `);
      }

      if (isTowerPetal) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          if (cityNightMode > 0.01) {
            // Documented Lotus Tower show: pink <-> light-yellow smooth
            // transition with a travelling sweep, over a white trunk flood.
            float showPhase = sin(cityTime * 0.5) * 0.5 + 0.5;
            vec3 lotusPink = vec3(1.0, 0.31, 0.64);
            vec3 lotusGold = vec3(1.0, 0.91, 0.66);
            vec3 led = mix(lotusPink, lotusGold, showPhase);
            float sweep = sin(vViewPosition.y * 0.06 - cityTime * 2.2) * 0.5 + 0.5;
            totalEmissiveRadiance += led * (1.4 + 0.6 * sweep) * cityNightMode;
          }
        `);
      }

      if (isTowerShaft) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          if (cityNightMode > 0.01) {
            totalEmissiveRadiance += vec3(0.02, 0.85, 0.45) * 0.9 * cityNightMode;
          }
        `);
      }

      if (isTowerPavilion) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          if (cityNightMode > 0.01) {
            float beacon = pow(max(0.0, sin(cityTime * 3.0)), 8.0);
            totalEmissiveRadiance += vec3(1.0, 0.25, 0.25) * (0.8 + 2.2 * beacon) * cityNightMode;
          }
        `);
      }
    };
    material.customProgramCacheKey = () => `city-atlas-${facade}-${isGlazing}-${detailWidth}-${wettable}-${isRoad}-${isTerracotta}-${isTowerPetal}-${isTowerShaft}`;
  }
  prepare.setWetness = value => { wetness.value = value; };
  prepare.setNight = value => { nightMode.value = value; };
  prepare.setTime = value => { time.value = value; };
  return prepare;
}
