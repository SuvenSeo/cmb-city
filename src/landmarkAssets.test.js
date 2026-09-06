import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3,PerspectiveCamera,Matrix4,Vector3} from 'three';
import {cameraFieldOfView} from './mapMath.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {LANDMARKS} from './landmarks.js';

const root=new URL('../public/landmarks/',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('catalog.json',root)));

test('all five downloadable landmark meshes decode at metre scale within the web budget',async()=>{
  assert.equal(catalog.length,5);
  assert.ok(catalog.reduce((n,m)=>n+m.bytes,0)<2_500_000);
  for(const entry of catalog){
    assert.ok(LANDMARKS.some(place=>place.id===entry.id));
    const folder=new URL(`${entry.id}/`,root);
    const bytes=fs.readFileSync(new URL('map.glb',folder));
    assert.equal(bytes.length,entry.bytes);
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    const bounds=new Box3().setFromObject(scene),expectedMin=[entry.bounds[0][0],entry.bounds[0][2],-entry.bounds[1][1]],expectedMax=[entry.bounds[1][0],entry.bounds[1][2],-entry.bounds[0][1]];
    for(let i=0;i<3;i++){
      assert.ok(Math.abs(bounds.min.getComponent(i)-expectedMin[i])<2,`${entry.id} minimum ${i}`);
      assert.ok(Math.abs(bounds.max.getComponent(i)-expectedMax[i])<2,`${entry.id} maximum ${i}`);
    }
    let triangles=0,meshes=0;
    scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok(o.material.isMeshStandardMaterial);o.geometry.dispose();o.material.dispose();}});
    assert.ok(meshes<25,`${entry.id} material batches`);
    assert.ok(triangles>10000&&triangles<80000,`${entry.id} triangle budget`);
    for(const file of [`${entry.id}.blend`,`${entry.id}.glb`,'preview.png','detail.png','README.md'])assert.ok(fs.statSync(new URL(file,folder)).size>100);
    assert.equal(fs.statSync(new URL(`${entry.id}-model.zip`,folder)).size,entry.downloadBytes);
  }
  assert.ok(fs.statSync(new URL('colombo-landmarks.zip',root)).size>1_000_000);
});


test('complete landmark bounds fit phone camera views below the controls',()=>{
  for(const model of catalog){
    const place=LANDMARKS.find(p=>p.id===model.id),camera=new PerspectiveCamera(cameraFieldOfView(place.lens,390/844),390/844,3,30000);
    camera.position.fromArray(place.mobileView||place.view);camera.lookAt(...place.target);camera.updateMatrixWorld();
    const matrix=new Matrix4().makeRotationY(model.rotation);matrix.setPosition(...model.position);
    for(const x of [model.bounds[0][0],model.bounds[1][0]])for(const y of [model.bounds[0][2],model.bounds[1][2]])for(const z of [-model.bounds[0][1],-model.bounds[1][1]]){
      const p=new Vector3(x,y,z).applyMatrix4(matrix).project(camera),screenY=(1-p.y)*422;
      assert.ok(Math.abs(p.x)<.95,model.id+' fits the phone width');
      assert.ok(screenY>215&&screenY<650,model.id+' clears the header and caption');
    }
  }
});

function readGlbHeader(url) {
  const bytes=fs.readFileSync(url);
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
}

test('heritage downloads include interior architecture without loading it into the city',()=>{
  for(const id of ['fort','museum']){
    const model=catalog.find(m=>m.id===id),folder=new URL(`${id}/`,root);
    assert.equal(model.interiors,true);
    const detailed=readGlbHeader(new URL(`${id}.glb`,folder)),web=readGlbHeader(new URL('map.glb',folder));
    const interior=detailed.nodes.filter(n=>n.name?.startsWith('Interior /')&&n.mesh!==undefined);
    assert.ok(interior.length>=5,`${id} has actual interior mesh collections`);
    assert.ok(interior.every(n=>n.extras?.detail===true),`${id} interiors excluded by export selection`);
    assert.ok(!web.nodes.some(n=>n.name?.startsWith('Interior /')),`${id} map carries no interiors`);
    for(const file of ['interior.png','cutaway.png','REFERENCES.md','FONT-LICENSE.txt']){
      assert.ok(model.files.includes(file));
      assert.ok(fs.statSync(new URL(file,folder)).size>100);
    }
    assert.equal(detailed.images?.length||0,0,'download has no external photograph dependencies');
  }
  const fort=readGlbHeader(new URL('fort/fort.glb',root));
  assert.ok(fort.nodes.some(n=>n.name?.includes('Olcott memorial')));
  assert.ok(fort.nodes.some(n=>n.name?.includes('Sinhala and English signage')));
  const museum=readGlbHeader(new URL('museum/museum.glb',root));
  assert.ok(museum.nodes.some(n=>n.name?.includes('bifurcated staircase')));
});

test('station forecourt faces north toward Olcott Mawatha',()=>{
  const station=catalog.find(m=>m.id==='fort');
  // Front is local Blender -Y, i.e. glTF +Z. Rotation must point it north (-Z).
  const front=new Vector3(0,0,1).applyAxisAngle(new Vector3(0,1,0),station.rotation);
  assert.ok(front.z<-.98);
  const view=LANDMARKS.find(p=>p.id==='fort');
  assert.ok(view.view[2]<view.target[2]&&view.mobileView[2]<view.target[2]);
});

test('Sinhala station lettering is shaped into real contours with no missing glyphs',()=>{
  const signs=JSON.parse(fs.readFileSync(new URL('../scripts/heritage_lettering.json',import.meta.url)));
  const sign=signs['කොටුව දුම්රිය ස්ථානය'];
  assert.equal(sign.missingGlyphs,0);
  assert.ok(sign.glyphCount>10&&sign.contours.length>15);
  assert.ok(sign.contours.every(path=>path.length>2&&path.every(p=>p.length===2&&p.every(Number.isFinite))));
});
