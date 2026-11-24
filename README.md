# Real Estate API

This Next.js App Router project is the backend scaffold for a bilingual Flutter real estate assessment. [API_CONTRACT.md](API_CONTRACT.md) describes the planned REST API.

## Local development

Use Node.js 24 LTS and pnpm 12.6.0. The scaffold runs without Firebase credentials.

```sh
nvm use
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

## Demo property dataset

The [normalized JSON fixture](src/data/properties.normalized.json) has 30 fictional rentals, five per property type, with prices of USD 975–4,250 per month and areas of 26–238 m². Locations are approximate neighborhood coordinates in Chicago, Austin, Denver, Portland, and Minneapolis. Listings, agents, and reviews are fictional. Agent avatars are set to `null`. The original `properties.json` described in the contract was absent from the checkout and available Git history.

The full fixture is parsed by Zod in the test suite. The property mappers accept `en` or `ar` and use English per field when Arabic is missing. Each fixture title, description, address, and review comment includes both translations.

The fixture uses 18 stock photos hosted by `images.pexels.com`. Images are shared across listings and illustrate property styles. Each unique URL returned HTTP 200 with `image/jpeg` in a HEAD check on 2026-11-24. No fixture URL remains unverified at the HTTP level. Image rendering and continued CDN availability depend on the client and Pexels. Tests run offline. [Pexels license](https://www.pexels.com/license/)

## Property search and filtering

The property query schema validates decoded `URLSearchParams` and preserves repeated keys long enough to reject them. Integers use ASCII digits and must fit JavaScript's safe integer range. Decimals use ASCII digits with an optional fractional part, such as `100` or `100.50`. Type lists use exact enum values separated by commas. The search limit is 120 Unicode code points after trimming.

Search applies Unicode NFKC, lowercase conversion, Arabic combining-mark and tatweel removal, replacement of `أ إ آ ٱ` with `ا`, and trimming and collapsing whitespace to single spaces. It checks for a substring within each available English or Arabic title, address, and description. A term that becomes empty applies no search constraint. The response language is selected separately.

The JSON repository validates and indexes the bundled fixture once per module instance. It filters before counting and sorting, breaks sort ties by ascending ID, and then slices the requested page. The repository also supplies global property types and numeric bounds. JSON queries run in memory over the demo fixture.
