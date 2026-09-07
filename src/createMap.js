import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {batchScene} from './batchScene.js';
import {blenderToThree,cameraFieldOfView,treeCell,CITY_MAX_POLAR_ANGLE,clearOrbitMomentum} from './mapMath.js';
import {createEnvironment} from './environment.js';
import {createSurfaceMaterials,surfaceDetailWidth} from './surfaceMaterials.js';
import {createLakeWater} from './lakeWater.js';
import {separatePavilionRoof} from './towerGeometry.js';
import {renderScale, FRAME_INTERVAL} from './renderBudget.js';
import {createWeatherEffects} from './weatherEffects.js';
import {WEATHER_PRESETS} from './weatherPresets.js';
import {LANDMARKS} from './landmarks.js';
import {bearingFromDirection,placeLabels} from './cityNavigation.js';
import {replaceLandmarkSurfaces,insideLandmark} from './landmarkGeometry.js';

const V=THREE.Vector3;

export function createMap(container,callbacks) {
  const scene=new THREE.Scene();
  // Millimetre-separated terrace and facade surfaces share a city-scale view.
  // Standard perspective depth loses that separation as the camera pulls back.
  const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'default'});
  const small=container.clientWidth<700;
  renderer.setPixelRatio(renderScale(container.clientWidth,container.clientHeight,devicePixelRatio));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.info.autoReset=false;
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Interactive Colombo city. Drag to orbit, scroll or pinch to zoom. Use the camera buttons to reset the view.');
  container.appendChild(canvas);
  const camera=new THREE.PerspectiveCamera(32,1,3,30000);
  camera.layers.enable(1);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.09;
  controls.minDistance=90;controls.maxDistance=8500;
  controls.maxPolarAngle=CITY_MAX_POLAR_ANGLE;
  controls.enablePan=true;controls.screenSpacePanning=false;
  controls.target.set(35,180,60);camera.position.set(390,230,-570);
  controls.update();
  const environment=createEnvironment(scene,renderer,small);
  const prepareMaterial=createSurfaceMaterials(renderer);
  const weatherEffects=createWeatherEffects(scene,small);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const abort=new AbortController();
  const resources=new Set();
  const vegetation=new THREE.Group();vegetation.name='City canopy instances';scene.add(vegetation);
  const treeGroups=[];
  let alive=true,ready=false,dirty=true,raf=0,metadata,activeCamera=0,lens=64;
  let motion=null,lastTreePosition=new V(Infinity,Infinity,Infinity),water=null;
  let lastRendered=-Infinity,lastFrame=0,elapsed=0,renderedFrames=0;
  let interacting=false;
  let activeLandmark=null,navigationWidth=0,navigationHeight=0;
  const navigationMatrix=new THREE.Matrix4(),direction=new V(),projected=new V();
  const tagRay=new THREE.Ray(),tagDirection=new V(),tagHit=new V();
  const tagOccluders=LANDMARKS.filter(place=>place.occlusionBox).map(place=>({id:place.id,box:new THREE.Box3(new V(...place.occlusionBox[0]),new V(...place.occlusionBox[1]))}));
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let suspended=false;
  let animateEnvironment=false,lighting='daylight',weatherKind='clear',lightningEnabled=true;

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
      if(surfaceDetailWidth(surface)){o.visible=false;return;}
      o.castShadow=!isDistant&&!surfaceDetailWidth(surface)&&!/Water|Beira|Ground|Pavement|Road|Railway|Open space|Far context/.test(surface);
      o.receiveShadow=!isDistant;
      for(const material of (Array.isArray(o.material)?o.material:[o.material]))prepareMaterial(material,isDistant);
      o.geometry.computeBoundingSphere();
    });
    scene.add(root);renderer.shadowMap.needsUpdate=true;water?.invalidate();invalidate();
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
          prepareMaterial(part.material);
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
      group.high.visible=distance<(small?450:800);
      group.low.visible=!group.high.visible&&distance<3500;
    }
    renderer.shadowMap.needsUpdate=true;water?.invalidate();
  }

  function setCamera(index,animate=true) {
    if(!metadata)return;
    const preset=metadata.cameras[index];if(!preset)return;
    activeLandmark=null;callbacks.onLandmark?.(null);callbacks.onArrival?.(null);
    clearOrbitMomentum(controls);
    activeCamera=index;lens=preset.lens;
    const position=new V(...blenderToThree(preset.location)),target=new V(...blenderToThree(preset.target));
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      motion={start:performance.now(),fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position,target};
    }else{camera.position.copy(position);controls.target.copy(target);motion=null;controls.update();}
    callbacks.onCamera(index);resize();invalidate();
  }

  function focusLandmark(id){
    const place=LANDMARKS.find(item=>item.id===id);if(!place||!ready)return;
    clearOrbitMomentum(controls);activeLandmark=id;lens=place.lens;navigationWidth=0;
    const portrait=container.clientWidth/container.clientHeight<.75;
    const position=new V(...(portrait&&place.mobileView||place.view)),target=new V(...place.target);
    if(!reducedMotion.matches)motion={start:performance.now(),fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position,target};
    else{camera.position.copy(position);controls.target.copy(target);motion=null;controls.update();}
    callbacks.onCamera(null);callbacks.onLandmark?.(id);callbacks.onArrival?.(motion?null:id);resize();invalidate();
  }

  function updateNavigation(){
    if(!ready)return;
    const width=container.clientWidth,height=container.clientHeight;
    if(navigationMatrix.equals(camera.matrixWorld)&&navigationWidth===width&&navigationHeight===height)return;
    navigationMatrix.copy(camera.matrixWorld);navigationWidth=width;navigationHeight=height;
    camera.getWorldDirection(direction);
    const points=LANDMARKS.map(place=>{
      projected.fromArray(place.anchor||place.point);
      const distance=camera.position.distanceTo(projected);
      tagRay.set(camera.position,tagDirection.subVectors(projected,camera.position).normalize());
      // A few coarse tower bounds avoid labels appearing on a different
      // landmark, without raycasting millions of building triangles per drag.
      const occluded=tagOccluders.some(({id,box})=>id!==place.id&&!box.containsPoint(camera.position)&&tagRay.intersectBox(box,tagHit)&&camera.position.distanceTo(tagHit)<distance-10);
      projected.project(camera);return {id:place.id,x:projected.x,y:projected.y,z:projected.z,occluded};
    });
    const bearing=bearingFromDirection(direction.x,direction.z);
    callbacks.onView?.({bearing,labels:placeLabels(points,width,height,activeLandmark)});
    canvas.dataset.bearing=bearing.toFixed(1);canvas.dataset.landmark=activeLandmark||'';
  }

  function resize() {
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    renderer.setPixelRatio(renderScale(w,h,devicePixelRatio));
    renderer.setSize(w,h);camera.aspect=w/h;camera.fov=cameraFieldOfView(lens,camera.aspect);camera.updateProjectionMatrix();
    canvas.dataset.renderScale=renderer.getPixelRatio().toFixed(3);
    canvas.dataset.renderPixels=String(canvas.width*canvas.height);water?.invalidate();invalidate();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  controls.addEventListener('start',()=>{motion=null;callbacks.onArrival?.(activeLandmark);interacting=true;invalidate();});
  controls.addEventListener('end',()=>{interacting=false;invalidate();});
  controls.addEventListener('change',invalidate);
  function onVisibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{lastFrame=0;invalidate();}}
  function onMotionPreference(){if(reducedMotion.matches){animateEnvironment=false;callbacks.onAnimation?.(false);invalidate();}}
  function onContextLost(event){event.preventDefault();callbacks.onError('The browser released its graphics context. Reload the city to continue.');}
  document.addEventListener('visibilitychange',onVisibility);
  reducedMotion.addEventListener('change',onMotionPreference);
  canvas.addEventListener('webglcontextlost',onContextLost);

  function requestFrame() {
    if(alive&&!raf&&!document.hidden&&!suspended)raf=requestAnimationFrame(frame);
  }
  function invalidate() {dirty=true;requestFrame();}
  function frame(now) {
    raf=0;
    if(!alive||document.hidden||suspended)return;
    const delta=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
    if(animateEnvironment)elapsed+=delta;
    if(motion){
      const t=Math.min(1,(now-motion.start)/1100),e=t*t*(3-2*t);
      camera.position.lerpVectors(motion.fromPosition,motion.position,e);controls.target.lerpVectors(motion.fromTarget,motion.target,e);
      if(t===1){motion=null;callbacks.onArrival?.(activeLandmark);}dirty=true;
    }
    const settling=controls.update();
    if(settling)dirty=true;
    if(camera.position.y<5){camera.position.y=5;dirty=true;}
    // Bound both interaction and animation. A resting, paused map schedules no
    // further frames; a pending reflection gets a final update after a drag.
    if((dirty||(ready&&animateEnvironment)||water?.pending)&&now-lastRendered>=FRAME_INTERVAL-.5){
      updateTreeDetail();environment.updateShadows(camera,controls.target);
      const flash=weatherEffects.update(elapsed,camera,controls.target,animateEnvironment&&lightningEnabled&&!reducedMotion.matches);
      environment.flash(flash);water?.update(elapsed);
      renderer.info.reset();renderer.render(scene,camera);updateNavigation();dirty=false;lastRendered=now;renderedFrames++;
      canvas.dataset.ready=String(ready);canvas.dataset.draws=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
      canvas.dataset.frames=String(renderedFrames);canvas.dataset.camera=String(activeCamera);
      canvas.dataset.position=camera.position.toArray().map(n=>n.toFixed(2)).join(',');
      canvas.dataset.weather=weatherKind;canvas.dataset.rainDrops=String(weatherEffects.drops);canvas.dataset.lightning=weatherEffects.flash.toFixed(3);
      canvas.dataset.lighting=lighting;canvas.dataset.animated=String(animateEnvironment);canvas.dataset.waterTime=elapsed.toFixed(3);canvas.dataset.reflections=String(water?.reflections||0);
    }
    if(dirty||motion||settling||interacting||(ready&&animateEnvironment)||water?.pending)requestFrame();
  }
  requestFrame();

  (async()=>{
    metadata=await json('/map/manifest.json');if(!alive)return;
    callbacks.onMetadata(metadata);setCamera(0,false);
    const keys=['core','tower','canopies'],loaded={};
    const total=keys.reduce((n,k)=>n+metadata.assets[k].bytes,0);
    const progress=(key,bytes)=>{loaded[key]=bytes;callbacks.onProgress(Math.min(.94,Object.values(loaded).reduce((a,b)=>a+b,0)/total*.94));};
    const [core,tower,canopies,trees,catalog]=await Promise.all([
      ...keys.map(k=>model(metadata.assets[k],bytes=>progress(k,bytes))),json(metadata.assets.trees.url),
      json('/landmarks/catalog.json').catch(error=>{if(error.name==='AbortError')throw error;return [];}),
    ]);
    if(!alive)return;
    const additions=[];
    // A missing optional asset retains its mapped building. Replacement happens
    // only after the complete GLB has loaded, so there are no holes on failure.
    for(const entry of catalog){
      try{
        const source=await model({url:`/landmarks/${entry.id}/map.glb`});
        if(!alive)return;
        const building=batchScene(source);keep(building);
        building.name=entry.name;building.position.fromArray(entry.position);building.rotation.y=entry.rotation;
        building.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.material.envMapIntensity=.65;}});
        scene.add(building);additions.push(entry);
      }catch(error){if(error.name==='AbortError')throw error;}
    }
    canvas.dataset.landmarkModels=String(additions.length);
    canvas.dataset.replacedTriangles=String(replaceLandmarkSurfaces(core,additions));
    prepareStatic(core);
    water=createLakeWater(core,scene,environment,small);water?.setWeather(weatherKind);
    separatePavilionRoof(tower);
    const landmark=batchScene(tower);
    landmark.traverse(o=>{if(!o.isMesh)return;if(surfaceDetailWidth(o.material.name)){o.visible=false;return;}o.castShadow=true;o.receiveShadow=true;prepareMaterial(o.material);});
    keep(landmark);scene.add(landmark);
    createTrees(canopies,trees.instances.filter(pose=>!additions.some(({mask})=>insideLandmark(pose[0],pose[2],mask))));
    renderer.shadowMap.needsUpdate=true;ready=true;invalidate();
    callbacks.onProgress(1);callbacks.onReady();
    try{
      const distant=await model(metadata.assets.distant);
      if(alive){prepareStatic(distant,true);callbacks.onBackground(additions.length<5?'Some landmark models are unavailable. Their mapped buildings are shown.':'');}
    }catch(error){if(alive&&error.name!=='AbortError')callbacks.onBackground('Distant skyline unavailable. The main city is ready.');}
  })().catch(error=>{if(alive&&error.name!=='AbortError')callbacks.onError(error.message);});

  return {
    suspend(value){
      suspended=value;canvas.dataset.suspended=String(value);
      if(value){cancelAnimationFrame(raf);raf=0;}else{lastFrame=0;invalidate();}
    },
    camera:setCamera,
    landmark:focusLandmark,
    reset:()=>activeLandmark?focusLandmark(activeLandmark):setCamera(activeCamera),
    trees:visible=>{vegetation.visible=visible;renderer.shadowMap.needsUpdate=true;water?.invalidate();invalidate();},
    environment:name=>{if(environment.set(name)){lighting=name;water?.invalidate();invalidate();}},
    weather:name=>{
      if(!WEATHER_PRESETS[name])return;
      weatherKind=name;elapsed=0;lastFrame=0;
      environment.setWeather(name);weatherEffects.set(name);water?.setWeather(name);
      prepareMaterial.setWetness(WEATHER_PRESETS[name].wetness);
      animateEnvironment=WEATHER_PRESETS[name].rain>0&&!reducedMotion.matches;
      callbacks.onAnimation?.(animateEnvironment);invalidate();
    },
    lightning:enabled=>{lightningEnabled=enabled;invalidate();},
    animate:enabled=>{animateEnvironment=enabled;lastFrame=0;invalidate();},
    dispose(){
      alive=false;abort.abort();cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
      document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onContextLost);reducedMotion.removeEventListener('change',onMotionPreference);
      weatherEffects.dispose();water?.dispose();environment.dispose();
      for(const root of resources)disposeRoot(root);resources.clear();renderer.dispose();canvas.remove();
    },
  };
}
