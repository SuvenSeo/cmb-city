import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('all map assets resolve locally with valid models and matching placement data', () => {
  const publicRoot = new URL('../public/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('map/manifest.json', publicRoot)));
  for (const [name, asset] of Object.entries(manifest.assets)) {
    assert.match(asset.url, /^\/map\/[\w.-]+$/);
    const filename = new URL(asset.url.slice(1), publicRoot);
    assert.equal(fs.statSync(filename).size, asset.bytes, `${name} asset is complete`);
    if (asset.url.endsWith('.glb')) {
      const file = fs.openSync(filename, 'r'), header = Buffer.alloc(12);
      try { fs.readSync(file, header); } finally { fs.closeSync(file); }
      assert.equal(header.toString('ascii', 0, 4), 'glTF');
      assert.equal(header.readUInt32LE(4), 2);
      assert.equal(header.readUInt32LE(8), asset.bytes);
    }
  }
  const trees = JSON.parse(fs.readFileSync(new URL('map/trees.json', publicRoot)));
  assert.equal(trees.instances.length, manifest.trees);
  assert.ok(trees.instances.every(pose => pose.length === 8 && pose.every(Number.isFinite) && pose[7] >= 0 && pose[7] < 5));
  assert.equal(manifest.cameras.length, 3);
  assert.ok(manifest.cameras.every(c => c.location.length === 3 && c.target.length === 3 && [...c.location, ...c.target, c.lens].every(Number.isFinite)));
  assert.ok(fs.statSync(new URL('environment/daylight.hdr', publicRoot)).size > 0);
});
