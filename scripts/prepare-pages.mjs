import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const staging = path.join(root, '.cloudflare-build');
const maxSize = 25 * 1024 * 1024;
const assets = {};
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });

async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await prepare(filename); continue; }
    const { size } = await stat(filename);
    if (size <= maxSize) continue;
    const relative = path.relative(dist, filename).split(path.sep).join('/');
    if (!/\.(glb|zip)$/.test(relative)) throw new Error(`Unexpected oversized Pages asset: ${relative}`);
    const sha256 = createHash('sha256').update(await readFile(filename)).digest('hex');
    assets[`/${relative}`] = {
      key: `${sha256}/${relative}`, sha256, size,
      contentType: relative.endsWith('.glb') ? 'model/gltf-binary' : 'application/zip',
      ...(relative.endsWith('.zip') ? { filename: path.basename(relative) } : {}),
    };
    const target = path.join(staging, 'files', relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(filename, target);
    await rm(filename);
  }
}

await prepare(dist);
const worker = await readFile(path.join(root, 'cloudflare/large-assets.js'), 'utf8');
await writeFile(path.join(dist, '_worker.js'), `${worker}\nexport default createAssetHandler(${JSON.stringify(assets, null, 2)});\n`);
await writeFile(path.join(dist, '_routes.json'), JSON.stringify({ version: 1, include: Object.keys(assets), exclude: [] }, null, 2));
await writeFile(path.join(staging, 'assets.json'), JSON.stringify(assets, null, 2));
console.log(`Pages build ready. ${Object.keys(assets).length} large assets will be served from R2.`);
