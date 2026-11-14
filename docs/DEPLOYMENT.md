# Deployment Guide

Chord Sheet Studio is a static Vite app. The production build is deployed to GitHub Pages by the workflow in [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml).

## Live site

- **URL:** https://rayfoolshs.github.io/ChordSheetStudioPro/
- **Repository:** https://github.com/rayfoolshs/ChordSheetStudioPro

## How the base path works

GitHub Pages project sites are served from a subpath:

```text
https://<owner>.github.io/<repository>/
```

This project uses `/ChordSheetStudioPro/` as its production base path. `vite.config.ts` selects it only when `GITHUB_PAGES=true`:

```ts
const base = process.env.GITHUB_PAGES === 'true' ? '/ChordSheetStudioPro/' : '/';
```

The base path is applied to:

- script and stylesheet URLs emitted by Vite
- the icon and apple-touch-icon links in `index.html`
- the PWA manifest `id`, `start_url`, `scope`, and icon URLs
- the header wordmark link and brand icon via `import.meta.env.BASE_URL`

Local development and ordinary production previews keep the root base path (`/`) so `http://localhost:3000` continues to work.

## Automatic deployment

Every push to `main` runs the Pages workflow. It can also be started manually from the Actions tab (`workflow_dispatch`).

```text
push to main
  → checkout
  → install Bun
  → bun install --frozen-lockfile
  → bun run build (GITHUB_PAGES=true)
  → upload dist/ as a Pages artifact
  → deploy with actions/deploy-pages
```

The workflow uses the official GitHub Pages actions and requires these permissions:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

## One-time GitHub Pages setup

Pages must be configured to use **GitHub Actions** as its source. This can be done in:

```text
Repository → Settings → Pages → Build and deployment → Source → GitHub Actions
```

Or with the GitHub CLI:

```bash
gh api -X POST repos/rayfoolshs/ChordSheetStudioPro/pages \
  -f build_type=workflow
```

After the first successful workflow run, the site is available at the URL above.

## Building for Pages locally

Use the same environment flag as the workflow:

```bash
GITHUB_PAGES=true npm run build
npm run preview
```

Vite prints the local preview URL. Because the base path is `/ChordSheetStudioPro/`, open the preview at:

```text
http://localhost:4173/ChordSheetStudioPro/
```

Inspect `dist/index.html` and `dist/manifest.webmanifest` if you need to confirm that the base path was applied.

## PWA and service worker notes

- `vite-plugin-pwa` writes the service worker to `dist/sw.js` and registers it from `src/main.tsx`.
- The generated manifest scope is `/ChordSheetStudioPro/` in a Pages build.
- Workbox precache URLs are stored relative to the service worker, so they resolve correctly under the project site path.
- If a previously installed copy keeps serving old assets, unregister the service worker in DevTools → Application → Service Workers, or clear site data and reload.
- SoundFonts and Google Fonts are cached at runtime by the service worker, so the app can be reused offline after the first visit.

## Troubleshooting

### Blank page after deployment

1. Open the browser console and check for 404s.
2. Confirm the workflow built with `GITHUB_PAGES=true`.
3. Confirm asset URLs in `dist/index.html` start with `/ChordSheetStudioPro/`.
4. Confirm Pages is set to deploy from GitHub Actions.

### Assets load but the PWA does not install

- Open the site over HTTPS (GitHub Pages provides this).
- Check that `manifest.webmanifest` is reachable at `/ChordSheetStudioPro/manifest.webmanifest`.
- Confirm the icon URLs in the manifest return `200`.
- Clear stale site data if a previous manifest was installed from a different base path.

### Workflow fails during install

The repository ships `bun.lock`. Run the same install locally to reproduce:

```bash
bun install --frozen-lockfile
```

If the lockfile is intentionally updated, regenerate it with `bun install` and commit the new `bun.lock`.

### Workflow fails during build

Run the production build locally with the Pages flag:

```bash
GITHUB_PAGES=true npm run build
```

The build also runs `tsc --noEmit` implicitly through the Vite plugin pipeline; run `npm run lint` to isolate type errors.

### Port already in use during local development

Vite automatically selects the next free port. Check the terminal output for the actual `Local:` URL.

## Rollback

The Pages site always deploys the latest successful `main` build. To roll back, revert the relevant commit on `main`; the next workflow run republishes the previous state. Alternatively, re-run an earlier successful workflow from the Actions tab.
