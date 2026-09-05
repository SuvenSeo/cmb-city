import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {batchScene} from './batchScene.js';
import {blenderToThree,cameraFieldOfView,treeCell,CITY_MAX_POLAR_ANGLE} from './mapMath.js';

const V=THREE.Vector3;

export function createMap(container,callbacks) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#dce3e1');
  scene.fog=new THREE.FogExp2('#dce3e1',.00021);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  const small=container.clientWidth<700;
  renderer.setPixelRatio(Math.min(devicePixelRatio,small?1.15:1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Interactive Colombo city. Drag to orbit, scroll or pinch to zoom. Use the camera buttons to reset the view.');
  container.appendChild(canvas);
  const camera=new THREE.PerspectiveCamera(32,1,3,30000);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.09;
  controls.minDistance=90;controls.maxDistance=8500;
  controls.maxPolarAngle=CITY_MAX_POLAR_ANGLE;
  controls.enablePan=true;controls.screenSpacePanning=false;
  controls.target.set(35,180,60);camera.position.set(390,230,-570);
  controls.update();
  scene.add(new THREE.HemisphereLight('#e3eeff','#7a795b',1.8));
  const sun=new THREE.DirectionalLight('#fff1d7',3.0);
  sun.position.set(850,1500,-650);sun.target.position.set(-100,20,150);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-1450,right:1450,top:1450,bottom:-1450,near:100,far:4500});
  sun.shadow.normalBias=.38;sun.shadow.bias=-.00008;
  scene.add(sun,sun.target);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const abort=new AbortController();
  const resources=new Set();
  const vegetation=new THREE.Group();vegetation.name='City canopy instances';scene.add(vegetation);
  const treeGroups=[];
  let alive=true,ready=false,dirty=true,raf=0,metadata,activeCamera=0,lens=64;
  let motion=null,lastTreePosition=new V(Infinity,Infinity,Infinity),environmentTarget=null;
  let samplingSince=0,sampleFrames=0,lastTelemetry=0;

  function keep(root) {resources.add(root);return root;}
  function disposeRoot(root) {
    const geometry=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{
      if(o.geometry)geometry.add(o.geometry);
      for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){
        materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
      }
      if(o.isInstancedMesh)o.dispose();
    });
    for(const x of geometry)x.dispose();for(const x of materials)x.dispose();for(const x of textures)x.dispose();
  }

  async function json(url) {
    const response=await fetch(url,{signal:abort.signal});
    if(!response.ok)throw Error(`Could not load city data (${response.status}).`);
    return response.json();
  }

  async function model(asset,onBytes=()=>{}) {
    const response=await fetch(asset.url,{signal:abort.signal});
    if(!response.ok)throw Error(`Could not load the city model (${response.status}).`);
    let buffer;
    if(response.body){
      const reader=response.body.getReader(),chunks=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;onBytes(size);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      buffer=bytes.buffer;
    }else{buffer=await response.arrayBuffer();onBytes(buffer.byteLength);}
    const gltf=await loader.parseAsync(buffer,'');
    if(!alive){disposeRoot(gltf.scene);throw new DOMException('Viewer closed','AbortError');}
    return keep(gltf.scene);
  }

  function prepareStatic(root,isDistant=false) {
    root.traverse(o=>{
      if(!o.isMesh)return;
      const surface=o.userData.surface||o.material.name;
      o.castShadow=!isDistant&&!/Water|Beira|Ground|Pavement|Road|Railway|Open space|Far context/.test(surface);
      o.receiveShadow=!isDistant;
      if(/Beira Lake/.test(surface)){
        o.material.color.set('#4faaa2');o.material.metalness=.32;o.material.roughness=.2;
      }
      if(isDistant)o.material.envMapIntensity=.35;
      o.geometry.computeBoundingSphere();
    });
    scene.add(root);renderer.shadowMap.needsUpdate=true;dirty=true;
  }

  function createTrees(prototypes,instances) {
    prototypes.updateMatrixWorld(true);
    const geometry=new Map();
    for(let variant=0;variant<5;variant++)for(const detail of ['high','low']){
      const source=prototypes.getObjectByName(`canopy_${variant}_${detail}`);
      if(!source)throw Error('The canopy model is incomplete.');
      const group=batchScene(source);
      geometry.set(`${variant}:${detail}`,group.children.map(o=>({geometry:o.geometry,material:o.material})));
      keep(group);
    }
    const cells=new Map();
    for(const pose of instances){
      const [tx,tz]=treeCell(pose),key=`${tx}:${tz}:${pose[7]}`;
      if(!cells.has(key))cells.set(key,{tx,tz,variant:pose[7],poses:[]});cells.get(key).poses.push(pose);
    }
    const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new V(0,1,0);
    for(const cell of cells.values()){
      const groups={};
      for(const detail of ['high','low']){
        const group=new THREE.Group();group.name=`Canopies ${cell.tx},${cell.tz} ${detail}`;
        for(const part of geometry.get(`${cell.variant}:${detail}`)){
          const mesh=new THREE.InstancedMesh(part.geometry,part.material,cell.poses.length);
          for(const [i,p] of cell.poses.entries()){
            matrix.compose(new V(p[0],p[1],p[2]),rotation.setFromAxisAngle(axis,p[3]),new V(p[4],p[5],p[6]));
            mesh.setMatrixAt(i,matrix);
            mesh.setColorAt(i,new THREE.Color().setScalar(.82+(i%7)*.03));
          }
          mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
          mesh.castShadow=detail==='high';mesh.receiveShadow=true;group.add(mesh);
        }
        vegetation.add(group);groups[detail]=group;
      }
      treeGroups.push({...groups,centre:new V((cell.tx+.5)*600,0,(cell.tz+.5)*600)});
    }
    keep(vegetation);updateTreeDetail(true);
  }

  function updateTreeDetail(force=false) {
    if(!force&&lastTreePosition.distanceToSquared(camera.position)<120**2)return;
    lastTreePosition.copy(camera.position);
    for(const group of treeGroups){
      const distance=group.centre.distanceTo(camera.position);
      group.high.visible=distance<(small?800:1350);
      group.low.visible=!group.high.visible&&distance<4300;
    }
    renderer.shadowMap.needsUpdate=true;
  }

  function setCamera(index,animate=true) {
    if(!metadata)return;
    const preset=metadata.cameras[index];if(!preset)return;
    activeCamera=index;lens=preset.lens;
    const position=new V(...blenderToThree(preset.location)),target=new V(...blenderToThree(preset.target));
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      motion={start:performance.now(),fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position,target};
    }else{camera.position.copy(position);controls.target.copy(target);motion=null;controls.update();}
    callbacks.onCamera(index);resize();dirty=true;
  }

  function resize() {
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h);camera.aspect=w/h;camera.fov=cameraFieldOfView(lens,camera.aspect);camera.updateProjectionMatrix();dirty=true;
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  controls.addEventListener('start',()=>{motion=null;dirty=true;});
  controls.addEventListener('change',()=>{dirty=true;});
  function onVisibility(){if(!document.hidden)dirty=true;}
  function onContextLost(event){event.preventDefault();callbacks.onError('The browser released its graphics context. Reload the city to continue.');}
  document.addEventListener('visibilitychange',onVisibility);
  canvas.addEventListener('webglcontextlost',onContextLost);

  function frame(now) {
    if(!alive)return;
    raf=requestAnimationFrame(frame);
    if(document.hidden)return;
    if(motion){
      const t=Math.min(1,(now-motion.start)/1100),e=t*t*(3-2*t);
      camera.position.lerpVectors(motion.fromPosition,motion.position,e);controls.target.lerpVectors(motion.fromTarget,motion.target,e);
      if(t===1)motion=null;dirty=true;
    }
    if(controls.update())dirty=true;
    if(camera.position.y<5){camera.position.y=5;dirty=true;}
    if(dirty){
      updateTreeDetail();renderer.render(scene,camera);dirty=false;
      if(!samplingSince)samplingSince=now;sampleFrames++;
      if(now-samplingSince>1500){
        const fps=sampleFrames*1000/(now-samplingSince);
        if(fps<32&&sampleFrames>25&&renderer.getPixelRatio()>.85){renderer.setPixelRatio(Math.max(.85,renderer.getPixelRatio()-.15));dirty=true;}
        samplingSince=now;sampleFrames=0;
      }
    }else{samplingSince=0;sampleFrames=0;}
    if(now-lastTelemetry>500){
      canvas.dataset.ready=String(ready);canvas.dataset.draws=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
      canvas.dataset.camera=String(activeCamera);canvas.dataset.position=camera.position.toArray().map(n=>n.toFixed(2)).join(',');canvas.dataset.renderScale=renderer.getPixelRatio().toFixed(2);
      lastTelemetry=now;
    }
  }
  raf=requestAnimationFrame(frame);

  (async()=>{
    metadata=await json('/map/manifest.json');if(!alive)return;
    callbacks.onMetadata(metadata);setCamera(0,false);
    const keys=['core','tower','canopies'],loaded={};
    const total=keys.reduce((n,k)=>n+metadata.assets[k].bytes,0);
    const progress=(key,bytes)=>{loaded[key]=bytes;callbacks.onProgress(Math.min(.94,Object.values(loaded).reduce((a,b)=>a+b,0)/total*.94));};
    const [core,tower,canopies,trees]=await Promise.all([
      ...keys.map(k=>model(metadata.assets[k],bytes=>progress(k,bytes))),json(metadata.assets.trees.url),
    ]);
    if(!alive)return;
    prepareStatic(core);
    const landmark=batchScene(tower);
    landmark.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;if(o.material.name.startsWith('Shaft | emerald'))o.material.color.setRGB(.015,.33,.095);});
    keep(landmark);scene.add(landmark);
    createTrees(canopies,trees.instances);
    renderer.shadowMap.needsUpdate=true;ready=true;dirty=true;
    callbacks.onProgress(1);callbacks.onReady();
    try{
      const distant=await model(metadata.assets.distant);
      if(alive){prepareStatic(distant,true);callbacks.onBackground('');}
    }catch(error){if(alive&&error.name!=='AbortError')callbacks.onBackground('Distant skyline unavailable. The main city is ready.');}
  })().catch(error=>{if(alive&&error.name!=='AbortError')callbacks.onError(error.message);});

  const pmrem=new THREE.PMREMGenerator(renderer);
  new HDRLoader().load('/environment/daylight.hdr',texture=>{
    if(!alive){texture.dispose();pmrem.dispose();return;}
    environmentTarget=pmrem.fromEquirectangular(texture);texture.dispose();pmrem.dispose();
    scene.environment=environmentTarget.texture;scene.environmentIntensity=.75;dirty=true;
  },undefined,()=>pmrem.dispose());

  return {
    camera:setCamera,
    reset:()=>setCamera(activeCamera),
    trees:visible=>{vegetation.visible=visible;renderer.shadowMap.needsUpdate=true;dirty=true;},
    dispose(){
      alive=false;abort.abort();cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
      document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onContextLost);
      for(const root of resources)disposeRoot(root);resources.clear();environmentTarget?.dispose();sun.shadow.map?.dispose();renderer.dispose();canvas.remove();
    },
  };
}
