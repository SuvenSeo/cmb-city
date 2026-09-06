# Deploying Colombo Atlas

The live site is hosted on **Cloudflare Pages**, with two large files in a private
**R2** bucket. Visitors use the same website for the map and all downloads.

Pages accepts files up to 25 MiB. The city core and the complete landmark ZIP are
larger, so the Pages build moves them out of the static upload and adds a small
request handler. It streams those two files from R2, supports resumed downloads,
and caches complete responses at the edge. Everything else stays on Pages'
static hosting. The models are unchanged.

## Current setup

| Setting | Value |
| --- | --- |
| Website | `https://colombo.prabhavalabs.com` |
| Pages project | `colombo-atlas` |
| Pages address | `https://colombo-atlas.pages.dev` |
| Production branch | `main` |
| R2 bucket | `colombo-atlas-assets` |
| R2 binding | `LARGE_ASSETS` |
| Node.js | 24 |

This project uses **Direct Upload**. A GitHub push by itself does not deploy it.
The deployment command builds locally, uploads the large files, then publishes
the Pages site. Cloudflare Pages and R2 usage are covered by the hosting account's
plans; R2 storage, operations and Pages Functions can incur charges beyond their
included allowances.

## Deploy an update

From a clean checkout of `main`, with Node.js installed:

```sh
npm ci
npx wrangler login
npm test
npm run deploy
```

Use a Cloudflare login that can access this Pages project and R2 bucket. Credentials
stay in Wrangler's local configuration. Never put tokens in the source files.

Each large file gets a content-hashed object key. The deployed handler refers to
those exact versions, so updating a model cannot silently change an older Pages
deployment. Keep old bucket objects while those deployments may need to be restored.

For a new Cloudflare account, create the resources before the first deployment:

```sh
npx wrangler r2 bucket create colombo-atlas-assets
npx wrangler pages project create colombo-atlas --production-branch main
```

Project names must be available in the target account. If you rename resources,
update `wrangler.json` and the project name in the `deploy` command too.

## Check the build without publishing

```sh
npm run build:pages
```

The website is in `dist/`. Large files and their upload manifest are staged in
`.cloudflare-build/`; both directories are local build output. Always run the full
build before uploading. `npm run deploy` does this automatically and stops if an
upload fails.

For normal local development and a complete static build, keep using `npm run dev`
and `npm run build`. `npm run preview` is for that normal build; the Pages build
needs its R2 binding to serve the large files.

## Domain setup

In Cloudflare, open **Workers & Pages → colombo-atlas → Custom domains** and add
`colombo.prabhavalabs.com`. Confirm the CNAME to `colombo-atlas.pages.dev` in the
`prabhavalabs.com` zone. Register the custom domain with Pages before adding DNS,
then wait for Cloudflare to show it as active and issue its HTTPS certificate.

See Cloudflare's [Pages limits](https://developers.cloudflare.com/pages/platform/limits/),
[R2 with Pages guide](https://developers.cloudflare.com/pages/tutorials/use-r2-as-static-asset-storage-for-pages/)
and [custom domain instructions](https://developers.cloudflare.com/pages/configuration/custom-domains/).
