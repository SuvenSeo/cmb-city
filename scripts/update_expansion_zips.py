import json, zipfile
from pathlib import Path

root = Path('public/landmarks')
catalog_file = root / 'expansion_catalog.json'
catalog = json.loads(catalog_file.read_text())
for item in catalog:
    dest = root / item['id']
    map_glb = dest / 'map.glb'
    item['bytes'] = map_glb.stat().st_size
    zip_path = dest / f"{item['id']}-model.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in item.get('files', []):
            if (dest / f).exists():
                z.write(dest / f, f"{item['id']}/{f}")
    item['downloadBytes'] = zip_path.stat().st_size
    (dest / 'metadata.json').write_text(json.dumps(item, indent=2))

catalog_file.write_text(json.dumps(catalog, indent=2))
print('Updated expansion_catalog.json and zips successfully.')
