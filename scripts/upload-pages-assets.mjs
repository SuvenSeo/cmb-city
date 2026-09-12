import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await readFile(path.join(root, 'wrangler.json'), 'utf8'));
const bucket = config.r2_buckets?.find(binding => binding.binding === 'LARGE_ASSETS')?.bucket_name;
if (!bucket) {
  console.log('No R2 bucket configured. Large assets are served via static chunks in Pages.');
  process.exit(0);
}
const assets = JSON.parse(await readFile(path.join(root, '.cloudflare-build/assets.json'), 'utf8'));
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');

for (const [url, asset] of Object.entries(assets)) {
  const filename = path.join(root, '.cloudflare-build/files', url.slice(1));
  const bytes = await readFile(filename);
  if (bytes.length !== asset.size || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
    throw new Error(`Asset changed after build: ${url}. Run npm run build:pages again.`);
  }
  const result = spawnSync(process.execPath, [wrangler, 'r2', 'object', 'put', `${bucket}/${asset.key}`,
    '--remote', '--file', filename, '--content-type', asset.contentType], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
