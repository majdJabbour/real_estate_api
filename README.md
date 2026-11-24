# Real Estate API

This Next.js App Router project is the backend scaffold for a bilingual Flutter real estate assessment. [API_CONTRACT.md](API_CONTRACT.md) describes the planned REST API.

## Local development

Use Node.js 24 LTS and pnpm 12.6.0. The scaffold runs without Firebase credentials.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The starter page is available at [localhost:3000](http://localhost:3000).

## Validation

```sh
pnpm peers check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Use `pnpm test:watch` during development and `pnpm start` to serve the local production build.

The Node.js range in `package.json` selects the Node 24 runtime for a future Vercel deployment. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
