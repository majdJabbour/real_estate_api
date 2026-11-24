# Real Estate API

This Next.js App Router project is the backend for a bilingual Flutter real estate assessment. [API_CONTRACT.md](API_CONTRACT.md) describes the REST API.

## Local development

Use Node.js 24 LTS and pnpm 12.6.0. The public API runs without Firebase credentials.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

The starter page is available at [localhost:3000](http://localhost:3000).

## Public API

The local base URL is [http://localhost:3000/api/v1](http://localhost:3000/api/v1).

| Request | Response |
| --- | --- |
| `GET /health` | Liveness response with `status: "ok"` in `data`. |
| `GET /properties` | Property summaries and pagination. Defaults to page 1, 20 listings, newest first. |
| `GET /properties/:id` | Full details for the property ID. |
| `GET /properties/filter-options` | Global filter bounds, price histogram, and localized type labels. |

```sh
curl -i 'http://localhost:3000/api/v1/health'
curl -i 'http://localhost:3000/api/v1/properties?types=apartment,condo&minBedrooms=2&maxPrice=3000&featured=false&sortBy=price&sortOrder=asc&page=2&limit=2'
curl -i -H 'Accept-Language: ar-SY, en;q=0.5' 'http://localhost:3000/api/v1/properties?search=Sunlit&limit=1'
curl -i -H 'Accept-Language: en-US' 'http://localhost:3000/api/v1/properties/rental-001'
curl -i -H 'Accept-Language: en' 'http://localhost:3000/api/v1/properties/filter-options'
curl -i -H 'Accept-Language: ar' 'http://localhost:3000/api/v1/properties/filter-options'
```

The property routes choose the supported language with the highest positive quality weight. Equal weights use header order. Regional tags match by primary language, and malformed preferences are skipped. English is the fallback when no named preference qualifies. Localized successes include `Content-Language` and `Vary: Accept-Language`. All API responses use `Cache-Control: no-store`.

Invalid listing queries and malformed IDs return `400 VALIDATION_ERROR`. A syntactically valid ID that has no match returns `404 PROPERTY_NOT_FOUND`. IDs use URL-unreserved characters, have a maximum length of 128, and exclude the standalone dot segments `.` and `..`. Unmatched routes and requests rejected before reaching the handler use Next.js responses.

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

The JSON repository validates and indexes the bundled fixture once per module instance. It filters before counting and sorting, breaks sort ties by ascending ID, and then slices the requested page. JSON queries run in memory over the demo fixture.

### Filter options

`GET /api/v1/properties/filter-options` returns bounds over the entire dataset and rejects query parameters. It returns available types in enum order. IDs and numeric values are stable across locales. For example, `apartment` is labeled `Apartment` in English and `شقة` in Arabic.

For a dataset with distinct minimum and maximum prices, the response contains 20 equal-width buckets in ascending order. Each bucket includes its lower edge and excludes its upper edge, except the final bucket, which also includes the maximum. Equal prices produce one bucket with identical edges. An empty dataset produces null bounds and empty type and histogram arrays.

The JSON adapter builds and freezes the aggregate once for each validated dataset. Bucket edges are calculated in decimal arithmetic and converted to JSON numbers. In a range near JavaScript's precision limit, adjacent edges can round to the same number. Matching uses the returned edges and still counts every listing exactly once.
