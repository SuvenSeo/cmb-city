"""Compress web meshes and assemble redistributable model download packages.
Run after Blender export: python3 scripts/package_landmarks.py
"""
import json, subprocess, zipfile, struct, re, shutil, os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/landmarks'
if os.name == 'nt':
    # .cmd shims are not valid Win32 applications for CreateProcess; invoke the
    # Node CLI entry point directly so packaging works on Windows too.
    PACK_CMD=[shutil.which('node') or 'node', str(ROOT/'node_modules/gltfpack/cli.js')]
else:
    PACK_CMD=[str(ROOT/'node_modules/.bin/gltfpack')]
catalog=json.loads((OUT/'catalog.json').read_text())
for item in catalog:
    dest=OUT/item['id'];original=dest/'map.glb';packed=dest/'map-packed.glb'
    # Never repeatedly quantize an already packed mesh.
    with original.open('rb') as f:
        f.seek(12);length,_=struct.unpack('<II',f.read(8));header=json.loads(f.read(length))
    if 'EXT_meshopt_compression' not in header.get('extensionsUsed',[]):
        # The Museum's repeated archivolts use a separate city LOD; full sources stay intact.
        simplify=['-si','0.4','-se','0.001','-sp'] if item['id']=='museum' else []
        subprocess.run([*PACK_CMD,'-i',str(original),'-o',str(packed),'-cc','-ce','ext','-vp','16','-vn','12','-km','-ke',*simplify],check=True)
        packed.replace(original)
    item['bytes']=original.stat().st_size
    with original.open('rb') as f:
        f.seek(12);length,_=struct.unpack('<II',f.read(8));packed_header=json.loads(f.read(length))
    item['mapTriangles']=sum(packed_header['accessors'][p['indices']]['count']//3 for mesh in packed_header['meshes'] for p in mesh['primitives'])
    readme=dest/'README.md';notes=readme.read_text()
    if 'Meshopt' not in notes:readme.write_text(notes+'\nThe map.glb export uses Meshopt compression and KHR_mesh_quantization; use a compatible glTF loader. The detailed GLB is uncompressed for broad compatibility.\n')
    notes=readme.read_text()
    notes=re.sub(r'Map mesh: [\d,]+ triangles',f"Map mesh: {item['mapTriangles']:,} triangles",notes)
    if item['id']=='museum' and '0.1%' not in notes:
        notes+='\nThe Museum city LOD targets 40% of its exterior triangles with a 0.1% relative mesh-error bound. The detailed GLB and Blender source retain the full architectural geometry.\n'
    readme.write_text(notes)
    with zipfile.ZipFile(dest/(item['id']+'-model.zip'),'w',zipfile.ZIP_DEFLATED) as archive:
        for filename in item.get('files',[item['id']+'.blend',item['id']+'.glb','map.glb','preview.png','detail.png','README.md']):
            archive.write(dest/filename,item['id']+'/'+filename)
    item['downloadBytes']=(dest/(item['id']+'-model.zip')).stat().st_size
    (dest/'metadata.json').write_text(json.dumps(item,indent=2))
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2))
with zipfile.ZipFile(OUT/'colombo-landmarks.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for item in catalog:
        for filename in item.get('files',[item['id']+'.blend',item['id']+'.glb','map.glb','preview.png','detail.png','README.md']):
            archive.write(OUT/item['id']/filename,item['id']+'/'+filename)
    archive.write(OUT/'catalog.json','catalog.json')
print(json.dumps({'webBytes':sum(i['bytes'] for i in catalog),'collectionBytes':(OUT/'colombo-landmarks.zip').stat().st_size,'models':len(catalog)}))
