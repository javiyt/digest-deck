# DigestDeck

DigestDeck is a static web application for preparing newsletters throughout the day by pasting links. The browser stores all user data in IndexedDB; the Cloudflare Worker only extracts metadata from external pages and never stores users, sessions, articles, or newsletters.

## Architecture

```text
Browser
  ↓
GitHub Pages / React / IndexedDB
  ↓
Cloudflare Worker
  ↓
External pages
```

```text
Browser
  ↓
IndexedDB
```

The monorepo uses npm workspaces:

- `apps/web`: React, TypeScript, Vite, Tailwind, Dexie, dnd-kit, Vitest, and React Testing Library.
- `apps/worker`: Cloudflare Worker written in TypeScript with Wrangler. API: `POST /api/extract`.
- `packages/shared`: types, Zod schemas, URL normalization, models, and the single email renderer.

## Local Development

Requirements: Node 22 and npm.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run dev:web
npm run dev:worker
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Copy `.env.example` if you need to adjust URLs:

```bash
VITE_EXTRACTOR_API_URL=http://localhost:8787/api/extract
VITE_BASE_PATH=/digest-deck/
WORKER_ALLOWED_ORIGIN=http://localhost:5173
```

## Features

- Paste one or more URLs, one per line.
- Empty or invalid entries are reported individually.
- URLs are processed with limited concurrency.
- URLs are normalized for duplicate detection.
- Each card lets you edit title, description, source, author, date, link, and image.
- Cards can be reordered with drag and drop or move up/down buttons.
- All changes are automatically saved to IndexedDB.
- Preview uses the same renderer as the copied HTML.
- `Copy for Gmail` writes `text/html` and `text/plain` when supported by the browser.
- `+ New newsletter` archives the current newsletter if it has content.
- History lets you open, duplicate, and delete previous newsletters.

## Cloudflare Worker

Versioned configuration: `apps/worker/wrangler.jsonc`.

The Worker applies basic SSRF protections:

- accepts `https` only;
- rejects embedded credentials;
- rejects localhost, loopback, private networks, and link-local networks;
- validates redirects;
- limits URLs per request;
- limits HTML size;
- never returns the full remote HTML to the client.

Development and deploy:

```bash
npm run dev:worker
npm run deploy:worker
```

For production, configure `ALLOWED_ORIGIN` with the exact GitHub Pages origin, for example:

```text
https://<user>.github.io
```

The deploy workflow uses:

```yaml
command: deploy --var ALLOWED_ORIGIN:${{ vars.WORKER_ALLOWED_ORIGIN }}
```

### Configure the Worker in Cloudflare

1. In Cloudflare, select the account that will own the Worker.
2. Go to Workers & Pages.
3. Create a Worker named `digest-deck-extractor`, or let Wrangler create it on the first deploy.
4. Copy the account ID from the Cloudflare dashboard. Use this as the GitHub Actions secret `CLOUDFLARE_ACCOUNT_ID`.
5. Create an API token for GitHub Actions:
   - Go to My Profile → API Tokens → Create Token.
   - Use a custom token.
   - Account permissions: `Workers Scripts:Edit` / `Workers Scripts Write`.
   - Account resources: include the account from step 1.
   - Do not use the global API key.
6. Copy the token value immediately and add it as the GitHub Actions secret `CLOUDFLARE_API_TOKEN`.
7. In GitHub, go to Settings → Secrets and variables → Actions.
8. Add repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
9. Add repository variables:
   - `WORKER_ALLOWED_ORIGIN=https://<user>.github.io` for GitHub Pages, or `https://javi.yt` for the custom domain.
   - `VITE_EXTRACTOR_API_URL=https://digest-deck-extractor.<workers-subdomain>.workers.dev/api/extract`
10. Run the `Deploy` workflow from GitHub Actions, or push to `main`.
11. After deploy, test the Worker endpoint:

```bash
curl -i https://digest-deck-extractor.<workers-subdomain>.workers.dev/api/extract
```

Expected result for `GET` is `405 Method Not Allowed`. That confirms the Worker is reachable; the app uses `POST /api/extract`.

Common deploy errors:

- `Invalid access token [code: 9109]`: rotate `CLOUDFLARE_API_TOKEN`; the token value is invalid, expired, or copied incorrectly.
- `Authentication error [code: 10000]`: check that the token belongs to the same account as `CLOUDFLARE_ACCOUNT_ID` and has `Workers Scripts:Edit` / `Workers Scripts Write`.
- CORS errors in the browser: set `WORKER_ALLOWED_ORIGIN` to the exact frontend origin, without a trailing slash.

## GitHub Pages

The app supports `/digest-deck/` through `VITE_BASE_PATH`.

In GitHub:

1. Go to Settings → Pages.
2. Under Build and deployment, select GitHub Actions.
3. Configure the repository variable `VITE_EXTRACTOR_API_URL`, for example:
   `https://digest-deck-extractor.<subdomain>.workers.dev/api/extract`.
4. Keep `VITE_BASE_PATH=/digest-deck/` unless you change the repository name or use a custom domain.

## Cloudflare Pages

The frontend can also be deployed as a Cloudflare Pages project from the monorepo.

In Cloudflare Pages, set:

- Root directory: repository root
- Build command: `npm run build`
- Build output directory: `apps/web/dist`
- Deploy command: `npx wrangler pages deploy apps/web/dist --project-name digest-deck`

Do not use `npx wrangler deploy` for the frontend. That command deploys Workers and will fail when Wrangler tries to detect an application from the monorepo root.

For a custom domain such as `https://javi.yt`, set:

- `VITE_BASE_PATH=/`
- `VITE_EXTRACTOR_API_URL=https://digest-deck-extractor.<subdomain>.workers.dev/api/extract`

## CI/CD

Pull requests run:

- `npm ci`;
- lint;
- typecheck;
- tests with coverage;
- build.

Pushes to `main` run:

1. quality;
2. Cloudflare Worker deploy with Wrangler;
3. frontend build with the Worker URL;
4. GitHub Pages deploy with the official Pages actions.

Dependabot is configured in `.github/dependabot.yml` for npm and GitHub Actions. It opens weekly updates, groups patch/minor updates, and labels PRs as `dependencies`.

The workflow `.github/workflows/dependabot-auto-merge.yml` enables auto-merge for Dependabot patch, minor, and security update PRs. For this to work in GitHub:

1. Enable Settings → General → Pull Requests → Allow auto-merge.
2. Protect `main` and require CI checks to pass before merging.
3. Review Dependabot major updates manually.

Required secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required repository variables:

- `WORKER_ALLOWED_ORIGIN`: CORS-allowed origin, for example `https://<user>.github.io`.
- `VITE_EXTRACTOR_API_URL`: public Worker endpoint URL, for example `https://digest-deck-extractor.<subdomain>.workers.dev/api/extract`.

The Cloudflare token should have the minimum permissions required to edit Workers Scripts in the target account.
If Wrangler reports `Invalid access token [code: 9109]`, rotate `CLOUDFLARE_API_TOKEN`; that error means the token value itself is invalid or expired. The token used by GitHub Actions must be scoped to the account in `CLOUDFLARE_ACCOUNT_ID` and allow Workers script writes.

## First Deployment

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Create or confirm the `digest-deck-extractor` Worker in Cloudflare.
5. Get `CLOUDFLARE_ACCOUNT_ID`.
6. Create `CLOUDFLARE_API_TOKEN` with permissions to deploy Workers.
7. Add both values as GitHub Actions secrets.
8. Add `WORKER_ALLOWED_ORIGIN=https://<user>.github.io`.
9. Add `VITE_EXTRACTOR_API_URL=https://digest-deck-extractor.<subdomain>.workers.dev/api/extract`.
10. In Settings → Pages, select GitHub Actions.
11. Push to `main`.

## v1 Limitations

- No remote JavaScript rendering, Puppeteer, or browser rendering.
- Some blocked, incomplete, or JavaScript-dependent sites may produce only minimal metadata.
- Images are not downloaded or stored; only image URLs are saved.
- No email sending, authentication, or cross-device sync.
