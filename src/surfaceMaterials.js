import {ShaderChunk} from 'three';

export function surfaceDetailWidth(name) {
  if (/concrete ledges/.test(name)) return .15;
  if (/edge ribs/.test(name)) return .1;
  if (/mullions|construction joints/.test(name)) return .04;
  return 0;
}

const facades = ['#c8c9be', '#a3b9c2', '#d4c9b7', '#809eae', '#bcbdb2', '#91aab6', '#d4d1c5', '#7393a3'];
const palette = [
  [/Ground/, '#c4c5b4'], [/Open space/, '#98ad82'], [/Road/, '#a2aaa7'],
  [/Railway/, '#afa99b'], [/Pavement|Paving/, '#ddd7c6'],
  [/terracotta/, '#b47f67'], [/faded red/, '#be8f79'], [/weathered ivory/, '#d9d5c6'],
  [/Roof.*cement/, '#bdc2bb'], [/Roof.*warm grey/, '#b2bbb8'], [/blue-grey metal/, '#8aa4af'],
  [/equipment and water tanks/, '#b5bbb6'], [/Trees.*trunks/, '#8e8974'],
  [/Foliage/, '#839c72'], [/reflective glazing|Curtain wall/, '#7796a5'],
  [/Shaft.*emerald/, '#6c9d83'], [/Calyx/, '#557c70'],
  [/Pavilion and radome/, '#deded3'], [/Concrete/, '#bdc4bb'],
  [/satin silver/, '#cbd3ce'], [/Frames/, '#687e83'],
];

export function createSurfaceMaterials(renderer) {
  const prepared = new WeakSet(), wetness = {value:0};
  function prepare(material, distant = false) {
    if (!material?.isMeshStandardMaterial || prepared.has(material)) return;
    prepared.add(material);
    const name = material.name, facade = /plaster and window grid/.test(name);
    material.metalness = .02; material.roughness = .86; material.envMapIntensity = .55;
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
      material.roughness = .52; material.metalness = .12;
    }
    if (/magenta structural ribs/.test(name)) material.color.set('#976982');
    if (/glazing|Curtain wall/.test(name)) { material.roughness = .5; material.metalness = .12; }
    if (distant) material.envMapIntensity = .25;
    const detailWidth = surfaceDetailWidth(name);
    if (detailWidth) material.alphaToCoverage = true;
    if (material.map) material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const wettable = /Ground|Road|Pavement|Paving|Roof|Concrete/.test(name);
    if (!facade && !detailWidth && !wettable) return;
    material.onBeforeCompile = shader => {
      if (wettable) {
        shader.uniforms.cityWetness = wetness;
        shader.fragmentShader = 'uniform float cityWetness;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .3, cityWetness);')
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0, .72, cityWetness);');
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
        // Keep authored window placement, with low contrast and a smooth fade
        // before the repeating grid becomes too small to resolve on screen.
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
          ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'texture2D( map, vMapUv, 1.0 )')
            .replace('diffuseColor *= sampledDiffuseColor;', `
              float facadeDetail = 1.0 - smoothstep(.012, .055, length(fwidth(vMapUv)));
              float windowTone = dot(sampledDiffuseColor.rgb, vec3(.2126, .7152, .0722));
              diffuseColor.rgb *= mix(1.0, .78 + .22 * windowTone, facadeDetail);
            `));
      }
    };
    material.customProgramCacheKey = () => `city-atlas-${facade}-${detailWidth}-${wettable}`;
  }
  prepare.setWetness = value => {wetness.value = value;};
  return prepare;
}
