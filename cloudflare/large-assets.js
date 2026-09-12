// Only files listed by the build can be read from the private bucket.
export function createAssetHandler(assets) {
  return {
    async fetch(request, env, context) {
      const url = new URL(request.url);
      const asset = assets[url.pathname];
      if (!asset) return env.ASSETS.fetch(request);
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
      }

      const etag = `"${asset.sha256}"`;
      const headers = new Headers({
        'Content-Type': asset.contentType,
        'Content-Length': String(asset.size),
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'ETag': etag,
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
      });
      if (asset.filename) headers.set('Content-Disposition', `attachment; filename="${asset.filename}"`);
      const matches = request.headers.get('If-None-Match')?.split(',').some(value => {
        const candidate = value.trim().replace(/^W\//, '');
        return candidate === '*' || candidate === etag;
      });
      if (matches) {
        headers.delete('Content-Length');
        return new Response(null, { status: 304, headers });
      }
      if (request.method === 'HEAD') return new Response(null, { headers });

      const ifRange = request.headers.get('If-Range');
      const range = !ifRange || ifRange === etag
        ? parseRange(request.headers.get('Range'), asset.size) : null;
      if (range === false) {
        headers.set('Content-Range', `bytes */${asset.size}`);
        headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
      }

      try {
        const cache = globalThis.caches?.default;
        const cacheKey = new Request(`${url.origin}/__large-assets/${asset.sha256}`);
        if (!range && cache) {
          const cached = await cache.match(cacheKey);
          if (cached) return new Response(cached.body, { headers });
        }
        let body;
        if (env.LARGE_ASSETS) {
          const object = await env.LARGE_ASSETS.get(asset.key, range ? { range } : undefined);
          if (!object) return new Response('Asset not found', { status: 404 });
          body = object.body;
        } else if (asset.chunks && env.ASSETS) {
          body = await getChunkedStream(env.ASSETS, url.origin, asset.chunks, range, asset.size);
          if (!body) return new Response('Asset not found', { status: 404 });
        } else {
          return new Response('Asset storage not configured', { status: 503, headers: { 'Retry-After': '30' } });
        }

        if (range) {
          headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${asset.size}`);
          headers.set('Content-Length', String(range.length));
        }
        const response = new Response(body, { status: range ? 206 : 200, headers });
        if (!range && cache) {
          const cached = response.clone();
          cached.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          context?.waitUntil?.(cache.put(cacheKey, cached).catch(() => {}));
        }
        return response;
      } catch {
        return new Response('Asset temporarily unavailable', { status: 503, headers: { 'Retry-After': '30' } });
      }
    },
  };
}

async function getChunkedStream(envAssets, origin, chunks, range, totalSize) {
  const targetOffset = range ? range.offset : 0;
  const targetLength = range ? range.length : totalSize;
  const targetEnd = targetOffset + targetLength;

  const overlapping = chunks.filter(c => {
    const cEnd = c.offset + c.length;
    return c.offset < targetEnd && cEnd > targetOffset;
  });
  if (!overlapping.length) return null;

  let chunkIdx = 0;
  let currentReader = null;
  let currentSkip = 0;
  let currentRemaining = 0;

  return new ReadableStream({
    async pull(controller) {
      while (chunkIdx < overlapping.length) {
        const chunk = overlapping[chunkIdx];
        if (!currentReader) {
          const chunkUrl = new URL(chunk.url, origin).toString();
          const resp = await envAssets.fetch(new Request(chunkUrl));
          if (!resp.ok) {
            controller.error(new Error(`Failed to load asset chunk: ${chunk.url}`));
            return;
          }
          if (resp.body?.getReader) {
            currentReader = resp.body.getReader();
          } else {
            const buf = await resp.arrayBuffer();
            const chunkData = new Uint8Array(buf);
            const chunkStartInRequested = Math.max(0, targetOffset - chunk.offset);
            const chunkEndInRequested = Math.min(chunk.length, targetEnd - chunk.offset);
            controller.enqueue(chunkData.subarray(chunkStartInRequested, chunkEndInRequested));
            chunkIdx++;
            return;
          }
          const chunkStartInRequested = Math.max(0, targetOffset - chunk.offset);
          currentSkip = chunkStartInRequested;
          const chunkEndInRequested = Math.min(chunk.length, targetEnd - chunk.offset);
          currentRemaining = chunkEndInRequested - currentSkip;
        }

        if (currentRemaining <= 0) {
          currentReader = null;
          chunkIdx++;
          continue;
        }

        const { value, done } = await currentReader.read();
        if (done) {
          currentReader = null;
          chunkIdx++;
          continue;
        }

        let chunkData = value;
        if (currentSkip > 0) {
          if (chunkData.length <= currentSkip) {
            currentSkip -= chunkData.length;
            continue;
          }
          chunkData = chunkData.subarray(currentSkip);
          currentSkip = 0;
        }

        if (chunkData.length > currentRemaining) {
          chunkData = chunkData.subarray(0, currentRemaining);
        }

        currentRemaining -= chunkData.length;
        controller.enqueue(chunkData);

        if (currentRemaining <= 0) {
          currentReader = null;
          chunkIdx++;
        }
        return;
      }
      controller.close();
    },
    cancel(reason) {
      if (currentReader?.cancel) currentReader.cancel(reason);
    }
  });
}

// Malformed or multipart ranges are ignored; unsatisfiable single ranges return 416.
export function parseRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : null;
  const end = match[2] ? Number(match[2]) : null;
  if ([start, end].some(n => n !== null && !Number.isSafeInteger(n))) return null;
  if (start === null) {
    if (!end || !size) return false;
    const length = Math.min(end, size);
    return { offset: size - length, length };
  }
  if (start >= size || (end !== null && end < start)) return false;
  return { offset: start, length: Math.min(end ?? size - 1, size - 1) - start + 1 };
}
