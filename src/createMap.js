import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {batchScene} from './batchScene.js';
import {blenderToThree,cameraFieldOfView,treeCell,CITY_MAX_POLAR_ANGLE,clearOrbitMomentum} from './mapMath.js';
import {createEnvironment} from './environment.js';
import {createSurfaceMaterials,surfaceDetailWidth} from './surfaceMaterials.js';
import {createLakeWater} from './lakeWater.js';
import {createOceanWater} from './oceanWater.js';
import {createCityTraffic} from './cityTraffic.js';
import {separatePavilionRoof} from './towerGeometry.js';
import {renderScale, FRAME_INTERVAL} from './renderBudget.js';
import {createWeatherEffects} from './weatherEffects.js';
import {WEATHER_PRESETS} from './weatherPresets.js';
import {LANDMARKS, ALL_LANDMARKS} from './landmarks.js';
import {bearingFromDirection,placeLabels} from './cityNavigation.js';
import {replaceLandmarkSurfaces,insideLandmark} from './landmarkGeometry.js';
import {createCinematicTour, TOUR_WAYPOINTS} from './explorationTour.js';
import {createTukTukModel} from './tuktukVehicle.js';
import {createTukTukPhysics} from './tuktukPhysics.js';

const V=THREE.Vector3;

export function createMap(container,callbacks) {
  const scene=new THREE.Scene();
  // Millimetre-separated terrace and facade surfaces share a city-scale view.
  // Standard perspective depth loses that separation as the camera pulls back.
  const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});
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
  const traffic=createCityTraffic(scene);
  const composerTarget=new THREE.WebGLRenderTarget(container.clientWidth||2,container.clientHeight||2,{samples:small?0:4,type:THREE.HalfFloatType});
  const composer=new EffectComposer(renderer,composerTarget);
  const renderPass=new RenderPass(scene,camera);
  composer.addPass(renderPass);
  const bloomPass=new UnrealBloomPass(new THREE.Vector2(container.clientWidth,container.clientHeight),.25,.2,.88);
  composer.addPass(bloomPass);
  const outputPass=new OutputPass();
  composer.addPass(outputPass);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const abort=new AbortController();
  const resources=new Set();
  const vegetation=new THREE.Group();vegetation.name='City canopy instances';scene.add(vegetation);
  const treeGroups=[];
  let alive=true,ready=false,dirty=true,raf=0,metadata,activeCamera=0,lens=64;
  let motion=null,lastTreePosition=new V(Infinity,Infinity,Infinity),water=null,ocean=null;
  let lastRendered=-Infinity,lastFrame=0,elapsed=0,renderedFrames=0;
  let interacting=false;
  let activeLandmark=null,navigationWidth=0,navigationHeight=0;
  const navigationMatrix=new THREE.Matrix4(),direction=new V(),projected=new V();
  const tagRay=new THREE.Ray(),tagDirection=new V(),tagHit=new V();
  const tagOccluders=ALL_LANDMARKS.filter(place=>place.occlusionBox).map(place=>({id:place.id,box:new THREE.Box3(new V(...place.occlusionBox[0]),new V(...place.occlusionBox[1]))}));
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let suspended=false;
  let animateEnvironment=false,lighting='daylight',weatherKind='clear',lightningEnabled=true;

  let explorationMode='orbit';
  let tukIndex=0;
  let tukPerspective='chase'; // 'chase' | 'cockpit' | 'passenger'
  let tukDriveMode='manual'; // 'manual' | 'cruise'
  const tukInput={forward:false,backward:false,left:false,right:false,handbrake:false};

  const tukVehicle=createTukTukModel({primaryColor:0x1b5e20,secondaryColor:0xf9a825});
  tukVehicle.root.visible=false;
  scene.add(tukVehicle.root);
  const tukPhysics=createTukTukPhysics({startX:-1380,startY:1.2,startZ:450,startHeading:0});

  let walkSpot='galle_face';
  let currentWalkHeight=2.2;
  const walkMove={forward:false,backward:false,left:false,right:false};
  const tour=createCinematicTour({
    onWaypointChange:(wp,index,total)=>{
      callbacks.onTourTelemetry?.({waypoint:wp,index,total,isPaused:tour.isPaused,progress:0});
    },
    onTourEnd:()=>{
      explorationMode='orbit';
      callbacks.onModeChange?.('orbit');
      invalidate();
    }
  });

  function onKeyDown(e){
    const k=e.key.toLowerCase();
    if(explorationMode==='walk'){
      if(k==='w'||k==='arrowup')walkMove.forward=true;
      if(k==='s'||k==='arrowdown')walkMove.backward=true;
      if(k==='a'||k==='arrowleft')walkMove.left=true;
      if(k==='d'||k==='arrowright')walkMove.right=true;
      invalidate();
    }else if(explorationMode==='tuktuk'){
      if(k==='w'||k==='arrowup')tukInput.forward=true;
      if(k==='s'||k==='arrowdown')tukInput.backward=true;
      if(k==='a'||k==='arrowleft')tukInput.left=true;
      if(k==='d'||k==='arrowright')tukInput.right=true;
      if(k===' ')tukInput.handbrake=true;
      if(k==='h')callbacks.onHonkHorn?.();
      if(k==='c'){
        const views=['chase','cockpit','passenger'];
        tukPerspective=views[(views.indexOf(tukPerspective)+1)%views.length];
      }
      invalidate();
    }
  }
  function onKeyUp(e){
    const k=e.key.toLowerCase();
    if(explorationMode==='walk'){
      if(k==='w'||k==='arrowup')walkMove.forward=false;
      if(k==='s'||k==='arrowdown')walkMove.backward=false;
      if(k==='a'||k==='arrowleft')walkMove.left=false;
      if(k==='d'||k==='arrowright')walkMove.right=false;
      invalidate();
    }else if(explorationMode==='tuktuk'){
      if(k==='w'||k==='arrowup')tukInput.forward=false;
      if(k==='s'||k==='arrowdown')tukInput.backward=false;
      if(k==='a'||k==='arrowleft')tukInput.left=false;
      if(k==='d'||k==='arrowright')tukInput.right=false;
      if(k===' ')tukInput.handbrake=false;
      invalidate();
    }
  }
  window.addEventListener('keydown',onKeyDown);
  window.addEventListener('keyup',onKeyUp);

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
    const place=ALL_LANDMARKS.find(item=>item.id===id);if(!place||!ready)return;
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
    const points=ALL_LANDMARKS.map(place=>{
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
    const pr=renderScale(w,h,devicePixelRatio);
    renderer.setPixelRatio(pr);
    renderer.setSize(w,h);
    composer.setPixelRatio(pr);
    composer.setSize(w,h);
    bloomPass.resolution.set(Math.floor(w/2),Math.floor(h/2));
    camera.aspect=w/h;camera.fov=cameraFieldOfView(lens,camera.aspect);camera.updateProjectionMatrix();
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
    if(animateEnvironment||ready)elapsed+=delta;
    if(explorationMode==='tuktuk'){
      tukVehicle.root.visible=true;
      if(tukDriveMode==='cruise'){
        const pose=traffic.getTukTukPose(tukIndex);
        if(pose){
          tukPhysics.updateCruise(delta, pose.position, pose.tangent, pose.speedKmH);
        }
      }else{
        tukPhysics.updateDrive(delta, tukInput);
      }
      tukVehicle.root.position.copy(tukPhysics.position);
      tukVehicle.root.rotation.y=tukPhysics.heading;
      tukVehicle.setSteerAngle(tukPhysics.steerAngle);
      tukVehicle.setBodyRoll(tukPhysics.bodyRoll, tukPhysics.bodyPitch);
      tukVehicle.rollWheels(tukPhysics.speed * delta);

      tukPhysics.updateCamera(camera, controls, tukPerspective, delta);

      const isThrottle = Math.abs(tukPhysics.speed) > 0.1 || tukInput.forward || tukInput.backward;
      callbacks.onEngineAudio?.(tukPhysics.speedKmH, isThrottle);
      callbacks.onTukTukTelemetry?.({
        speedKmH: tukPhysics.speedKmH,
        fareLKR: Math.round(tukPhysics.fareLKR),
        distanceKm: tukPhysics.distanceKm,
        tukIndex,
        totalTuks: traffic.getTukTukCount(),
        perspective: tukPerspective,
        driveMode: tukDriveMode
      });
      dirty=true;
    }else{
      if(tukVehicle.root.visible){
        tukVehicle.root.visible=false;
        callbacks.onEngineAudio?.(0, false);
      }
      if(explorationMode==='tour'){
        const result=tour.update(now,camera,controls);
        if(result)dirty=true;
      }else if(explorationMode==='walk'){
        if(walkMove.forward||walkMove.backward||walkMove.left||walkMove.right){
          const forward=new THREE.Vector3();
          camera.getWorldDirection(forward);
          forward.y=0;forward.normalize();
          const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
          const speed=(delta||.033)*14.0;
          const move=new THREE.Vector3();
          if(walkMove.forward)move.addScaledVector(forward,speed);
          if(walkMove.backward)move.addScaledVector(forward,-speed);
          if(walkMove.right)move.addScaledVector(right,speed);
          if(walkMove.left)move.addScaledVector(right,-speed);
          camera.position.add(move);
          controls.target.add(move);
          camera.position.y=currentWalkHeight+Math.sin(now*.008)*.04;
          dirty=true;
        }
      }else if(motion){
        const t=Math.min(1,(now-motion.start)/1100),e=t*t*(3-2*t);
        camera.position.lerpVectors(motion.fromPosition,motion.position,e);controls.target.lerpVectors(motion.fromTarget,motion.target,e);
        if(t===1){motion=null;callbacks.onArrival?.(activeLandmark);}dirty=true;
      }
    }
    const settling=controls.update();
    if(settling)dirty=true;
    if(explorationMode==='orbit'&&camera.position.y<5){camera.position.y=5;dirty=true;}
    const isNight=lighting==='night';
    const shouldAnimateTraffic=ready&&!reducedMotion.matches;
    if(shouldAnimateTraffic){
      traffic.update(delta||.033,elapsed,isNight);
      prepareMaterial.setTime(elapsed);
    }
    // Bound both interaction and animation. A resting, paused map schedules no
    // further frames; a pending reflection gets a final update after a drag.
    const isSpecialActive=explorationMode==='tuktuk'||(explorationMode==='tour'&&tour.isActive&&!tour.isPaused)||(explorationMode==='walk'&&(walkMove.forward||walkMove.backward||walkMove.left||walkMove.right));
    if((dirty||isSpecialActive||(ready&&animateEnvironment)||shouldAnimateTraffic||water?.pending)&&now-lastRendered>=FRAME_INTERVAL-.5){
      updateTreeDetail();environment.updateShadows(camera,controls.target);
      const flash=weatherEffects.update(elapsed,camera,controls.target,animateEnvironment&&lightningEnabled&&!reducedMotion.matches);
      environment.flash(flash);water?.update(elapsed);ocean?.update(elapsed);
      if(isNight){
        bloomPass.strength=0.55;bloomPass.threshold=0.72;bloomPass.radius=0.35;
      }else if(weatherKind==='storm'||weatherKind==='heavy'){
        bloomPass.strength=0.45;bloomPass.threshold=0.78;bloomPass.radius=0.25;
      }else{
        bloomPass.strength=0.18;bloomPass.threshold=0.92;bloomPass.radius=0.20;
      }
      renderer.info.reset();composer.render();updateNavigation();dirty=false;lastRendered=now;renderedFrames++;
      canvas.dataset.ready=String(ready);canvas.dataset.draws=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
      canvas.dataset.frames=String(renderedFrames);canvas.dataset.camera=String(activeCamera);
      canvas.dataset.position=camera.position.toArray().map(n=>n.toFixed(2)).join(',');
      canvas.dataset.weather=weatherKind;canvas.dataset.rainDrops=String(weatherEffects.drops);canvas.dataset.lightning=weatherEffects.flash.toFixed(3);
      canvas.dataset.lighting=lighting;canvas.dataset.animated=String(animateEnvironment);canvas.dataset.waterTime=elapsed.toFixed(3);canvas.dataset.reflections=String(water?.reflections||0);
      canvas.dataset.mode=explorationMode;
    }
    if(dirty||isSpecialActive||motion||settling||interacting||(ready&&animateEnvironment)||shouldAnimateTraffic||water?.pending)requestFrame();
  }
  requestFrame();

  (async()=>{
    metadata=await json('/map/manifest.json');if(!alive)return;
    callbacks.onMetadata(metadata);setCamera(0,false);
    const keys=['core','tower','canopies'],loaded={};
    const total=keys.reduce((n,k)=>n+metadata.assets[k].bytes,0);
    const progress=(key,bytes)=>{loaded[key]=bytes;callbacks.onProgress(Math.min(.94,Object.values(loaded).reduce((a,b)=>a+b,0)/total*.94));};
    const [core,tower,canopies,trees,catalog,expansionCatalog]=await Promise.all([
      ...keys.map(k=>model(metadata.assets[k],bytes=>progress(k,bytes))),json(metadata.assets.trees.url),
      json('/landmarks/catalog.json').catch(error=>{if(error.name==='AbortError')throw error;return [];}),
      json('/landmarks/expansion_catalog.json').catch(error=>{if(error.name==='AbortError')throw error;return [];}),
    ]);
    if(!alive)return;
    const additions=[];
    const allLandmarks = [...(catalog || []), ...(expansionCatalog || [])];
    // A missing optional asset retains its mapped building. Replacement happens
    // only after the complete GLB has loaded, so there are no holes on failure.
    for(const entry of allLandmarks){
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
    ocean=createOceanWater(scene,environment,small);ocean.setWeather(weatherKind);ocean.setLighting(lighting);
    separatePavilionRoof(tower);
    const landmark=batchScene(tower);
    landmark.traverse(o=>{if(!o.isMesh)return;if(surfaceDetailWidth(o.material.name)){o.visible=false;return;}o.castShadow=true;o.receiveShadow=true;prepareMaterial(o.material);});
    keep(landmark);scene.add(landmark);
    createTrees(canopies,trees.instances.filter(pose=>pose[0]>=-1330&&!additions.some(({mask})=>insideLandmark(pose[0],pose[2],mask))));
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
    environment:name=>{
      if(environment.set(name)){
        lighting=name;
        const isNight=name==='night';
        prepareMaterial.setNight(isNight?1:0);
        water?.setNight(isNight,weatherKind);
        ocean?.setLighting(name);
        water?.invalidate();
        invalidate();
      }
    },
    weather:name=>{
      if(!WEATHER_PRESETS[name])return;
      weatherKind=name;elapsed=0;lastFrame=0;
      environment.setWeather(name);weatherEffects.set(name);
      water?.setWeather(name,lighting==='night');
      ocean?.setWeather(name);
      prepareMaterial.setWetness(WEATHER_PRESETS[name].wetness);
      animateEnvironment=WEATHER_PRESETS[name].rain>0&&!reducedMotion.matches;
      callbacks.onAnimation?.(animateEnvironment);invalidate();
    },
    lightning:enabled=>{lightningEnabled=enabled;invalidate();},
    animate:enabled=>{animateEnvironment=enabled;lastFrame=0;invalidate();},
    setMode(mode,options={}){
      explorationMode=mode;motion=null;
      if(mode==='orbit'){
        camera.near=0.5;camera.updateProjectionMatrix();
        controls.maxPolarAngle=CITY_MAX_POLAR_ANGLE;
        controls.minDistance=90;controls.maxDistance=8500;
      }else if(mode==='walk'){
        camera.near=0.2;camera.updateProjectionMatrix();
        controls.maxPolarAngle=Math.PI/2+0.05;
        controls.minDistance=0.5;controls.maxDistance=2500;
        const spot=options.spot||'galle_face';
        walkSpot=spot;
        if(spot==='galle_face'){
          camera.position.set(-1365,5.5,450);controls.target.set(-1450,4.5,450);currentWalkHeight=5.5;
        }else if(spot==='beira_lake'){
          camera.position.set(-160,10.0,1120);controls.target.set(-414,60.0,896);currentWalkHeight=10.0;
        }else if(spot==='lotus_plaza'){
          camera.position.set(-40,4.0,160);controls.target.set(0,180,0);currentWalkHeight=4.0;
        }
        controls.update();
      }else if(mode==='tuktuk'){
        camera.near=0.04;camera.updateProjectionMatrix();
        tukIndex=options.tukIndex??0;
        controls.maxPolarAngle=Math.PI/2+0.1;
        controls.minDistance=0.2;controls.maxDistance=2500;
      }else if(mode==='tour'){
        camera.near=0.5;camera.updateProjectionMatrix();
        tour.start(camera.position,controls.target,options.startIndex??0);
      }
      callbacks.onModeChange?.(mode,{spot:walkSpot,tukIndex});
      invalidate();
    },
    walkMoveDir(move){Object.assign(walkMove,move);invalidate();},
    nextTukTuk(){
      tukIndex=(tukIndex+1)%traffic.getTukTukCount();
      callbacks.onModeChange?.('tuktuk',{tukIndex});
      invalidate();
    },
    setTukTukPerspective(perspective){tukPerspective=perspective;invalidate();},
    setTukTukDriveMode(mode){tukDriveMode=mode;invalidate();},
    setTukTukInput(input){Object.assign(tukInput,input);invalidate();},
    teleportTukTuk(x,y,z,heading){tukPhysics.teleport(x,y,z,heading);invalidate();},
    tourAction(action){
      if(action==='pause')tour.togglePause();
      else if(action==='next')tour.next(camera.position,controls.target);
      else if(action==='prev')tour.prev(camera.position,controls.target);
      invalidate();
    },
    dispose(){
      alive=false;abort.abort();cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
      window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);
      document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onContextLost);reducedMotion.removeEventListener('change',onMotionPreference);
      weatherEffects.dispose();water?.dispose();ocean?.dispose();environment.dispose();traffic.dispose();tukVehicle.dispose();composer.dispose();
      for(const root of resources)disposeRoot(root);resources.clear();renderer.dispose();canvas.remove();
    },
  };
}
