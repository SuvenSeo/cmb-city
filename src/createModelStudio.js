import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {fittedView,INTERIOR_CAMERAS,roofObject,STUDIO_DIRECTIONS,studioModelUrl} from './modelStudioMath.js';
import {separatePavilionRoof} from './towerGeometry.js';
import {clearOrbitMomentum} from './mapMath.js';

function disposeModel(root){
  const geometry=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}

export function createModelStudio(container,onState){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#193640');
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.dataset.studio='true';canvas.setAttribute('aria-label','Interactive landmark model. Drag to rotate, pinch or scroll to zoom. Arrow keys rotate; plus and minus zoom.');container.appendChild(canvas);
  const camera=new THREE.PerspectiveCamera(38,1,.005,120);
  const controls=new OrbitControls(camera,canvas);  controls.enableDamping=true;controls.dampingFactor=.12;controls.screenSpacePanning=true;controls.maxPolarAngle=Math.PI*.495;
  const hemi=new THREE.HemisphereLight('#e2edf1','#515950',.7);scene.add(hemi);
  const key=new THREE.DirectionalLight('#fff1d8',3.0);key.position.set(-8,12,10);key.castShadow=true;
  key.shadow.mapSize.setScalar(matchMedia('(max-width:700px)').matches?1024:2048);
  Object.assign(key.shadow.camera,{left:-9,right:9,top:12,bottom:-9,near:.1,far:45});key.shadow.bias=-.0002;key.shadow.normalBias=.02;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight('#b5d7e3',.8);fill.position.set(8,6,-8);scene.add(fill);
  const rim=new THREE.DirectionalLight('#e8f2ff',1.6);rim.position.set(2,8,-12);scene.add(rim);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.8;room.dispose();pmrem.dispose();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(36,36),new THREE.ShadowMaterial({opacity:.22}));ground.rotation.x=-Math.PI/2;ground.position.y=-.018;ground.receiveShadow=true;scene.add(ground);
  const grid=new THREE.GridHelper(16,16,'#557379','#36535c');grid.position.y=-.025;grid.material.transparent=true;grid.material.opacity=.1;scene.add(grid);
  const interiorLights=new THREE.Group();scene.add(interiorLights);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let alive=true,root=null,model=null,bounds=null,scale=1,offset=new THREE.Vector3(),currentMode='exterior',generation=0,abort=null;
  let visible=true,raf=0,dirty=true,lastFrame=-Infinity,frames=0;
  const initialDirection=()=>STUDIO_DIRECTIONS[model?.id]||[1,.6,1];
  function request(){if(alive&&visible&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);}
  function invalidate(){dirty=true;request();}
  function frame(now){
    raf=0;if(!alive||!visible||document.hidden)return;
    if(now-lastFrame<1000/30){request();return;}
    const moving=controls.update();
    if(dirty||moving){renderer.render(scene,camera);dirty=false;lastFrame=now;canvas.dataset.frames=String(++frames);canvas.dataset.position=camera.position.toArray().map(n=>n.toFixed(4)).join(',');canvas.dataset.triangles=String(renderer.info.render.triangles);}
    if(moving)request();
  }
  function fit(direction=initialDirection()){
    if(!bounds)return;
    clearOrbitMomentum(controls);
    camera.fov=38;
    const view=fittedView(bounds,camera.aspect,camera.fov,direction);
    camera.position.copy(view.position);controls.target.copy(view.target);camera.near=.005;camera.far=Math.max(120,camera.position.length()*4);camera.updateProjectionMatrix();
    controls.minDistance=.08;controls.maxDistance=Math.max(50,camera.position.distanceTo(controls.target)*5);controls.update();invalidate();
  }
  function resize(){
    const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
    const dpr=Math.min(devicePixelRatio,2,Math.sqrt((w<700?1200000:2500000)/(w*h)));
    renderer.setPixelRatio(dpr);renderer.setSize(w,h);camera.aspect=w/h;
    if(root&&currentMode!=='interior')fit(camera.position.clone().sub(controls.target).normalize().toArray());
    else{camera.updateProjectionMatrix();invalidate();}
    canvas.dataset.renderPixels=String(canvas.width*canvas.height);
  }
  function normalized(p){return new THREE.Vector3(...p).multiplyScalar(scale).add(offset);}
  function mode(value){
    currentMode=value;canvas.dataset.view=value;if(!root)return;
    root.traverse(o=>{if(o.isMesh&&roofObject(o.userData.name||o.name))o.visible=value!=='cutaway';});
    interiorLights.visible=value==='interior';grid.visible=value!=='interior';ground.visible=value!=='interior';
    renderer.shadowMap.needsUpdate=true;
    const inside=INTERIOR_CAMERAS[model.id];
    if(value==='interior'&&inside){
      clearOrbitMomentum(controls);
      camera.fov=65;camera.near=.001;camera.position.copy(normalized(inside.position));controls.target.copy(normalized(inside.target));controls.minDistance=.015;camera.updateProjectionMatrix();controls.update();invalidate();
    }else fit(value==='cutaway'?[.55,1.35,model.id==='museum'?-1:1]:initialDirection());
  }
  function clear(){
    if(root){scene.remove(root);disposeModel(root);root=null;bounds=null;}
    for(const light of [...interiorLights.children]){interiorLights.remove(light);light.dispose();}
  }
  async function load(next){
    model=next;const token=++generation;abort?.abort();abort=new AbortController();clear();
    canvas.dataset.model=next.id;canvas.dataset.ready='false';onState({status:'loading',error:''});invalidate();
    try{
      const response=await fetch(studioModelUrl(next),{signal:abort.signal});if(!response.ok)throw Error('The 3D model could not be loaded.');
      const bytes=await response.arrayBuffer();if(!alive||token!==generation)return;
      const gltf=await loader.parseAsync(bytes,'');
      if(!alive||token!==generation){disposeModel(gltf.scene);return;}
      if(next.id==='lotus')separatePavilionRoof(gltf.scene);
      const raw=new THREE.Box3().setFromObject(gltf.scene),size=raw.getSize(new THREE.Vector3()),centre=raw.getCenter(new THREE.Vector3());
      if(raw.isEmpty()||!Number.isFinite(size.length())){disposeModel(gltf.scene);throw Error('This model has no visible geometry.');}
      scale=10/Math.max(size.x,size.y,size.z);offset.set(-centre.x*scale,-raw.min.y*scale,-centre.z*scale);
      root=new THREE.Group();root.add(gltf.scene);root.scale.setScalar(scale);root.position.copy(offset);
      const maxAniso=renderer.capabilities.getMaxAnisotropy();
      root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;for(const value of Object.values(m)){if(value?.isTexture)value.anisotropy=Math.min(8,maxAniso);}}}});scene.add(root);root.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(root);
      const lightPositions=next.id==='museum'?[[0,10.9,-26],[0,10.9,-18],[10,9.5,-24],[-10,9.5,-24]]:[[-40,5.9,27],[-14,5.9,26],[20,5.9,26]];
      if(next.interiors)for(const position of lightPositions){const l=new THREE.PointLight('#ffdfb0',60*scale*scale,40*scale,2);l.position.copy(normalized(position));interiorLights.add(l);}
      mode(currentMode);canvas.dataset.ready='true';onState({status:'ready',error:''});
    }catch(error){if(alive&&token===generation&&error.name!=='AbortError'){onState({status:'error',error:error.message});canvas.dataset.ready='false';}}
  }
  function zoom(factor){
    if(!root)return;
    const direction=camera.position.clone().sub(controls.target);const distance=THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(direction.setLength(distance));controls.update();invalidate();
  }
  function orbit(angle){camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(controls.target);controls.update();invalidate();}
  function keyboard(event){
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();orbit(event.key==='ArrowLeft'?-.18:.18);}
    else if(event.key==='+'||event.key==='='||event.key==='-'){event.preventDefault();zoom(event.key==='-'?1.15:1/1.15);}
    else if(event.key==='Home'){event.preventDefault();mode(currentMode);}
  }
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else invalidate();}
  function contextLost(event){if(!alive)return;event.preventDefault();onState({status:'error',error:'The browser released the 3D view. Close and reopen the model library to restore it.'});}
  const observer=new ResizeObserver(resize);observer.observe(container);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.02});intersection.observe(container);
  controls.addEventListener('change',invalidate);canvas.addEventListener('keydown',keyboard);canvas.addEventListener('webglcontextlost',contextLost);document.addEventListener('visibilitychange',visibility);resize();
  return {load,mode,zoom,orbit,reset:()=>mode(currentMode),dispose(){
    alive=false;generation++;abort?.abort();cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();controls.dispose();canvas.removeEventListener('keydown',keyboard);canvas.removeEventListener('webglcontextlost',contextLost);document.removeEventListener('visibilitychange',visibility);clear();ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();environment.dispose();key.shadow.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }};
}
