import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3,PerspectiveCamera,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {LANDMARKS} from './landmarks.js';
import {LANDMARK_STORIES} from './landmarkStories.js';
import {boxCorners,fittedView,INTERIOR_CAMERAS,roofObject,STUDIO_DIRECTIONS,studioModelUrl} from './modelStudioMath.js';

test('every downloadable object fits the studio on desktop, portrait and expanded landscape screens',async()=>{
  for(const place of LANDMARKS){
    const bytes=fs.readFileSync(new URL(`../public${studioModelUrl(place)}`,import.meta.url));
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    const raw=new Box3().setFromObject(scene),size=raw.getSize(new Vector3()),centre=raw.getCenter(new Vector3());
    const scale=10/Math.max(size.x,size.y,size.z),offset=new Vector3(-centre.x,-raw.min.y,-centre.z).multiplyScalar(scale);
    const bounds=new Box3(raw.min.clone().multiplyScalar(scale).add(offset),raw.max.clone().multiplyScalar(scale).add(offset));
    for(const aspect of [.44,.9,1.4,3.6]){
      for(const direction of [STUDIO_DIRECTIONS[place.id],[.55,1.35,-1],[-1,.2,.4]]){
        const camera=new PerspectiveCamera(38,aspect,.005,200),view=fittedView(bounds,aspect,38,direction);
        camera.position.copy(view.position);camera.lookAt(view.target);camera.updateMatrixWorld();
        for(const corner of boxCorners(bounds)){
          const ndc=corner.project(camera);
          assert.ok(Math.abs(ndc.x)<.87&&Math.abs(ndc.y)<.87,`${place.id} at aspect ${aspect} keeps margin around every corner`);
          assert.ok(ndc.z>-1&&ndc.z<1,`${place.id} clears the camera clipping planes`);
        }
      }
    }
    if(INTERIOR_CAMERAS[place.id]){
      assert.ok(raw.containsPoint(new Vector3(...INTERIOR_CAMERAS[place.id].position)),`${place.id} interior camera is inside the building bounds`);
      let roofTriangles=0,interiorMeshes=0;
      scene.traverse(o=>{if(o.isMesh){if(roofObject(o.userData.name||o.name))roofTriangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.name.startsWith('Interior'))interiorMeshes++;}});
      assert.ok(roofTriangles>100,`${place.id} cutaway can hide real roof surfaces`);
      assert.ok(interiorMeshes>=5,`${place.id} interior view includes architectural geometry`);
    }
    const geometries=new Set(),materials=new Set();
    scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
});

test('every selectable landmark has Tamil, Sinhala, English and a sourced complete story',()=>{
  for(const place of LANDMARKS){
    assert.ok(place.name.length>0&&/[\u0D80-\u0DFF]/.test(place.sinhala),place.id);
    const story=LANDMARK_STORIES[place.id];
    assert.ok(/[\u0B80-\u0BFF]/.test(story.tamil),`${place.id} Tamil name`);
    for(const field of ['history','architecture','significance'])assert.ok(story[field].length>90,`${place.id} ${field}`);
    assert.ok(story.sources.some(source=>source.url.startsWith('https://')),`${place.id} has a public historical source`);
    for(const source of story.sources)if(source.url.startsWith('/'))assert.ok(fs.existsSync(new URL(`../public${source.url}`,import.meta.url)),`${place.id} reference download exists`);
  }
});
