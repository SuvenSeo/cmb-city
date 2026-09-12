import * as THREE from 'three';
import {WEATHER_PRESETS} from './weatherPresets.js';

export const ENVIRONMENTS = {
  morning: {
    label: 'Morning', hour: 7.1, sun: '#ffe2bc', intensity: 2.8, exposure: 1.02,
    fogRange: 5200, fog: '#d1d7d4', ambient: 0.8, environment: .75,
    zenith: '#729fc2', horizon: '#e9dfce', ground: '#919989', shadowStrength: .6,
  },
  daylight: {
    label: 'Soft daylight', hour: 9.8, sun: '#fff1d9', intensity: 3.0, exposure: 1.0,
    fogRange: 5500, fog: '#cbd8db', ambient: 0.75, environment: .8,
    zenith: '#92b6c9', horizon: '#dce5e3', ground: '#919989', shadowStrength: .62,
  },
  golden: {
    label: 'Golden hour', hour: 16.5, sun: '#ffd1a0', intensity: 3.0, exposure: 1.0,
    fogRange: 5000, fog: '#d9c9b7', ambient: 0.8, environment: .7,
    zenith: '#a5b9c5', horizon: '#f0d9ba', ground: '#a0937e', shadowStrength: .58,
  },
  overcast: {
    label: 'Cloudy day', hour: 10, sun: '#e6eef0', intensity: .8, exposure: .95,
    fogRange: 4000, fog: '#beced2', ambient: 1.0, environment: .6,
    zenith: '#aebfc6', horizon: '#d5dedc', ground: '#91998e', shadowStrength: .3,
  },
  night: {
    label: 'Colombo Night', hour: 17.2, sun: '#7ba9e0', intensity: .75, exposure: 1.18,
    fogRange: 6000, fog: '#09101d', ambient: .58, environment: .55,
    zenith: '#060a17', horizon: '#12203d', ground: '#09101b', shadowStrength: .38,
    isNight: true,
  },
};

// Approximate equinoctial solar time at Colombo's latitude. These are lighting
// presets, not a live weather forecast or a date-specific solar ephemeris.
export function solarDirection(hour, latitude = 6.92703) {
  const angle = THREE.MathUtils.degToRad((hour - 12) * 15);
  const lat = THREE.MathUtils.degToRad(latitude);
  return new THREE.Vector3(-Math.sin(angle), Math.cos(lat) * Math.cos(angle), Math.sin(lat) * Math.cos(angle)).normalize();
}

export function shadowFrame(direction, target, distance, resolution, previousExtent = 0) {
  // Power-of-two extents share the same world grid. Hysteresis prevents small
  // zoom movements around a boundary from repeatedly resizing the shadow map.
  let extent = previousExtent;
  if (!extent || distance > extent || distance < extent * .4) {
    extent = THREE.MathUtils.clamp(2 ** Math.ceil(Math.log2(Math.max(distance, 1))), 1024, 4096);
  }
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const focus = new THREE.Vector3(target.x, 40, target.z);
  const texel = 2 * extent / resolution;
  // Reuse the static map across small drags. Moving by a block of whole texels
  // preserves the grid without redrawing every building's shadow every frame.
  const block = texel * 64;
  const x = Math.round(focus.dot(right) / block) * block;
  const y = Math.round(focus.dot(up) / block) * block;
  // Snap in light space, not world X/Z. Keep depth anchored as well so a pan
  // cannot change depth quantization on otherwise stationary building faces.
  return {extent, focus: right.multiplyScalar(x).addScaledVector(up, y)};
}

export function createEnvironment(scene, renderer, small) {
  const uniforms = {
    zenith:{value:new THREE.Color()}, horizon:{value:new THREE.Color()},
    ground:{value:new THREE.Color()}, sunColor:{value:new THREE.Color()},
    sunDirection:{value:new THREE.Vector3()}, cloudCover:{value:.28},
    darkness:{value:0}, capture:{value:0},
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 24, 12), new THREE.ShaderMaterial({
    uniforms, side:THREE.BackSide, depthWrite:false, toneMapped:false,
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        skyDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 zenith, horizon, ground, sunColor, sunDirection;
      uniform float cloudCover, darkness, capture;
      varying vec3 skyDirection;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);
      }
      float clouds(vec2 p) {
        float value=0.0, amplitude=.52;
        for(int i=0;i<5;i++) {value+=noise(p)*amplitude;p=p*2.04+vec2(13.1,7.9);amplitude*=.48;}
        return value;
      }
      void main() {
        vec3 ray=normalize(skyDirection);
        float elevation=max(ray.y,0.0);
        vec3 light=mix(horizon,zenith,pow(smoothstep(0.0,.85,elevation),.65));
        float sunDot=max(dot(ray,sunDirection),0.0);
        light+=sunColor*(pow(sunDot,48.0)*.16+pow(sunDot,700.0)*.65)*(1.0-darkness);
        float disk=smoothstep(.99993,.99998,sunDot)*(1.0-capture);
        light+=sunColor*disk*12.0*(1.0-darkness);
        vec2 p=ray.xz/max(ray.y,.04)*2.4;
        float density=clouds(p), detail=clouds(p*1.8+17.0);
        float mask=smoothstep(1.0-cloudCover-.15,1.0-cloudCover+.16,density)*smoothstep(.07,.18,ray.y);
        float thickness=smoothstep(.25,.76,density);
        float rim=max(0.0,density-clouds(p+sunDirection.xz*.25));
        vec3 underside=mix(vec3(.51,.61,.7),vec3(.11,.16,.22),darkness);
        vec3 top=mix(vec3(.96,.98,1.0),vec3(.29,.36,.44),darkness);
        vec3 cloudLight=mix(underside,top,clamp(.24+detail*.8-thickness*.15+rim*2.0,0.0,1.0));
        cloudLight+=sunColor*rim*.8*(1.0-darkness);
        light=mix(light,cloudLight,mask);
        // Atmospheric stars in clear night skies
        if(ray.y > .03) {
          float starHash = hash(floor(ray.xy * 650.0) + floor(ray.yz * 650.0));
          if(starHash > .996) {
            float twinkle = .7 + .3 * sin(starHash * 400.0);
            light += vec3(.9, .95, 1.0) * twinkle * (1.0 - mask) * max(0.0, 1.0 - length(light) * 1.8);
          }
        }
        // Haze conceals the underside of the cloud plane without a hard seam.
        light=mix(horizon,light,smoothstep(-.02,.11,ray.y));
        light=mix(light,ground*.22,(1.0-smoothstep(-.12,.01,ray.y))*capture);
        gl_FragColor=vec4(light,1.0);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.name='Cached cloud sky';
  const skyScene=new THREE.Scene(); skyScene.add(sky);
  // Bake the detailed sky only on a preset change. The live map samples this
  // cubemap, so clouds never run a full-screen noise shader on every frame.
  const skyTarget=new THREE.WebGLCubeRenderTarget(small?256:512,{type:THREE.UnsignedByteType,colorSpace:THREE.SRGBColorSpace});
  const skyCamera=new THREE.CubeCamera(.1,20000,skyTarget);
  const generator=new THREE.PMREMGenerator(renderer);
  const ambient=new THREE.HemisphereLight('#e3edf0','#b7b6a1',1.25);
  const sun=new THREE.DirectionalLight(); sun.castShadow=true;
  sun.shadow.mapSize.setScalar(small?1024:2048);
  sun.shadow.normalBias=.05; sun.shadow.bias=-.0002; sun.shadow.radius=2;
  Object.assign(sun.shadow.camera,{near:100,far:10000});
  scene.add(ambient,sun,sun.target);
  let preset,weather=WEATHER_PRESETS.clear,lighting='daylight',environmentTarget;
  const direction=new THREE.Vector3(),lastFocus=new THREE.Vector3(Infinity,Infinity,Infinity);
  let lastExtent=0,baseAmbient=1;

  function refresh() {
    preset=ENVIRONMENTS[lighting];
    direction.copy(solarDirection(preset.hour));
    uniforms.sunDirection.value.copy(direction); uniforms.sunColor.value.set(preset.sun);
    uniforms.cloudCover.value=preset.isNight?Math.min(weather.clouds, .22):weather.clouds;
    uniforms.darkness.value=weather.darkness;
    const baseFog=new THREE.Color(preset.fog);
    const fogColor=preset.isNight?baseFog.clone().lerp(new THREE.Color('#010307'),weather.darkness*.4):baseFog.lerp(new THREE.Color(weather.fog),weather.darkness);
    scene.fog=new THREE.Fog(fogColor,1800,1800+preset.fogRange*weather.fogScale);
    uniforms.horizon.value.copy(fogColor);
    const zenithColor=preset.isNight?new THREE.Color(preset.zenith):(lighting==='golden'?new THREE.Color('#6c95b7'):new THREE.Color('#4d8cc4')).lerp(new THREE.Color('#304e69'),weather.darkness);
    uniforms.zenith.value.copy(zenithColor);
    uniforms.ground.value.set(preset.ground);
    sun.color.set(preset.sun); sun.intensity=preset.intensity*weather.sun;
    sun.shadow.intensity=preset.shadowStrength*weather.sun;
    baseAmbient=preset.ambient*weather.ambient; ambient.intensity=baseAmbient;
    if(preset.isNight){
      ambient.color.set('#3a5c8e');ambient.groundColor.set('#162234');
    }else{
      ambient.color.set('#e3edf0');ambient.groundColor.set('#b7b6a1');
    }
    renderer.toneMappingExposure=preset.exposure*(1-weather.darkness*.12);
    uniforms.capture.value=0; skyCamera.update(renderer,skyScene);
    scene.background=skyTarget.texture; scene.backgroundIntensity=1;
    uniforms.capture.value=1;
    const next=generator.fromScene(skyScene,0,.1,20000,{size:128});
    uniforms.capture.value=0;
    scene.environment=next.texture; scene.environmentIntensity=preset.environment;
    environmentTarget?.dispose();environmentTarget=next;lastExtent=0;
    renderer.shadowMap.needsUpdate=true;
  }
  function set(name) {if(!ENVIRONMENTS[name])return false;lighting=name;refresh();return true;}
  function setWeather(name) {if(!WEATHER_PRESETS[name])return false;weather=WEATHER_PRESETS[name];refresh();return true;}
  function updateShadows(camera,target) {
    const distance=camera.position.distanceTo(target);
    scene.fog.near=Math.max(900,distance*(1.5-weather.darkness*.7));
    scene.fog.far=scene.fog.near+preset.fogRange*weather.fogScale;
    const {extent,focus}=shadowFrame(direction,target,distance,sun.shadow.mapSize.x,lastExtent);
    if(extent===lastExtent&&focus.equals(lastFocus))return;
    lastFocus.copy(focus);lastExtent=extent;
    sun.target.position.copy(focus);sun.position.copy(focus).addScaledVector(direction,5000);
    Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});
    sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
  }
  refresh();
  return {
    sun,direction,set,setWeather,updateShadows,
    flash: amount=>{ambient.intensity=baseAmbient+amount*.3;scene.backgroundIntensity=1+amount*.16;},
    dispose() {
      scene.background=null;scene.environment=null;environmentTarget?.dispose();skyTarget.dispose();generator.dispose();
      sky.geometry.dispose();sky.material.dispose();sun.shadow.dispose();scene.remove(ambient,sun,sun.target);
    },
  };
}
