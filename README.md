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

## Firebase Authentication

Use a Firebase project with Authentication enabled and Google enabled under **Authentication → Sign-in method**. Register the Flutter client with the same project and complete the platform-specific Google OAuth configuration. The backend needs a service account with access to read users for its revocation check. [Flutter Google Sign-In setup](https://firebase.google.com/docs/auth/flutter/federated-auth#google) · [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup)

Use [.env.example](.env.example) as a template for the ignored `.env.local`. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` from the service account. The private key can be a quoted multiline value or contain escaped `\n` sequences. Keep these values and the original service account file outside version control. Use server-only variable names and restart the API process after changing credentials.

After Google sign-in, the Firebase client SDK returns a Firebase ID token for the signed-in user and handles refresh. To test the protected endpoint, use that token in the Authorization field of a local HTTP client and send the following request. Keep the token out of logs and shared command history. [Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)

```http
GET /api/v1/auth/me
Authorization: Bearer <firebase-id-token>
```

The local URL is `http://localhost:3000/api/v1/auth/me`. A successful response contains the verified `id`, `email`, `name`, and `avatar` in `data`. Optional profile fields can be null. Missing or invalid credentials return `401 UNAUTHORIZED`. Firebase configuration or verification infrastructure failures return `503 SERVICE_UNAVAILABLE`. All handler responses use `Cache-Control: private, no-store`.

The API verifies project binding, signature, expiry, revocation, and account status with the Admin SDK. Revocation checking adds a Firebase backend lookup for otherwise valid tokens. For a future Vercel deployment, configure the same three variables as sensitive server environment variables for the intended deployment environment and use HTTPS. [Firebase session management](https://firebase.google.com/docs/auth/admin/manage-sessions) · [Vercel sensitive environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

Automated verification uses SDK mocks and credential-free HTTP tests. Successful live Google Sign-In and verification of a real Firebase ID token remain pending Flutter integration.

## Favorites

Favorites use the Firebase project's default Cloud Firestore database. The development database was configured as Standard Edition on the Spark plan in Belgium (`europe-west1`). The API uses its existing Firebase Admin service account. Grant the account the minimum IAM access needed to read and write favorites. [Firestore IAM](https://firebase.google.com/docs/firestore/security/iam)

Each favorite is stored at `users/{uid}/favorites/{propertyId}` with `propertyId` and a server-generated `createdAt`. The property ID is the document ID. The API creates the favorite document directly without creating a parent user document. It takes the UID from the verified token and uses `Cache-Control: private, no-store` on all handler responses.

| Request | Response |
| --- | --- |
| `GET /api/v1/favorites?page=1&limit=20` | Paginated property summaries, newest favorite first, with ascending property IDs for timestamp ties. |
| `PUT /api/v1/favorites/rental-001` | `{"success":true,"data":{"propertyId":"rental-001","isFavorite":true}}` |
| `DELETE /api/v1/favorites/rental-001` | `{"success":true,"data":{"propertyId":"rental-001","isFavorite":false}}` |

Send `Authorization: Bearer <firebase-id-token>` with each request. Send `Accept-Language: ar` on GET for Arabic summaries. An unknown property returns 404 on PUT. PUT uses an atomic create, so concurrent or repeated requests preserve the original timestamp. DELETE succeeds when the reference is already absent and can remove references to properties that no longer exist. [Firestore document operations](https://googleapis.dev/nodejs/firestore/latest/DocumentReference.html)

The repository's [firestore.rules](firestore.rules) defines a deny-all policy for direct client access. Flutter accesses favorites through the REST API. Firebase Admin calls use IAM and bypass Firestore Security Rules. The rules file is a local artifact, with cloud deployment handled separately. [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

For this demo, each listing request reads the user's favorite timestamp projection and resolves the property summaries in one batch. Orphans are excluded before calculating the page and total. Read cost grows with the user's saved references, and absence from one page does not establish whether a listing is favorited. Firestore behavior is covered by mocks, and authenticated cloud persistence remains pending live verification.

## Validation

```sh
pnpm peers check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:integration
```

`pnpm test` runs unit and direct route-handler tests. Use `pnpm test:watch` during development. These tests run without an HTTP server.

Run `pnpm build` before `pnpm test:integration` and rebuild after changing application code. The integration suite starts `next start` on an OS-assigned loopback port, waits for a successful health response, and stops its child process after the run. It requires local socket access and runs without Firebase credentials or external services. Use `pnpm start` to serve the production build manually.

The Node.js range in `package.json` selects the Node 24 runtime for a future Vercel deployment. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

## Demo property dataset

The [normalized JSON fixture](src/data/properties.normalized.json) has 30 fictional rentals, five per property type, with prices of USD 975–4,250 per month and areas of 26–238 m². Locations are approximate neighborhood coordinates in Chicago, Austin, Denver, Portland, and Minneapolis. Listings, agents, and reviews are fictional. Agent avatars are set to `null`. The original `properties.json` described in the contract was absent from the checkout and available Git history.

The full fixture is parsed by Zod in the test suite. The property mappers accept `en` or `ar` and use English per field when Arabic is missing. Each fixture title, description, address, and review comment includes both translations.

The fixture uses 18 stock photos hosted by `images.pexels.com`. Images are shared across listings and illustrate property styles. Each unique URL returned HTTP 200 with `image/jpeg` in a HEAD check on 2026-11-24. The API returns image links. Rendering and continued CDN availability depend on the client and Pexels. The integration suite checks the links in the fixture without fetching the images. [Pexels license](https://www.pexels.com/license/)

## Property search and filtering

The property query schema validates decoded `URLSearchParams` and preserves repeated keys long enough to reject them. Integers use ASCII digits and must fit JavaScript's safe integer range. Decimals use ASCII digits with an optional fractional part, such as `100` or `100.50`. Type lists use exact enum values separated by commas. The search limit is 120 Unicode code points after trimming.

Search applies Unicode NFKC, lowercase conversion, Arabic combining-mark and tatweel removal, replacement of `أ إ آ ٱ` with `ا`, and trimming and collapsing whitespace to single spaces. It checks for a substring within each available English or Arabic title, address, and description. A term that becomes empty applies no search constraint. The response language is selected separately.

The JSON repository validates and indexes the bundled fixture once per module instance. It filters before counting and sorting, breaks sort ties by ascending ID, and then slices the requested page using offset pagination. Page boundaries are stable for an unchanged query and dataset. JSON queries run in memory over the 30-record demo fixture. The concurrent loopback check exercises request isolation at that size.

### Filter options

`GET /api/v1/properties/filter-options` returns bounds over the entire dataset and rejects query parameters. It returns available types in enum order. IDs and numeric values are stable across locales. For example, `apartment` is labeled `Apartment` in English and `شقة` in Arabic.

For a dataset with distinct minimum and maximum prices, the response contains 20 equal-width buckets in ascending order. Each bucket includes its lower edge and excludes its upper edge, except the final bucket, which also includes the maximum. Equal prices produce one bucket with identical edges. An empty dataset produces null bounds and empty type and histogram arrays.

The JSON adapter builds and freezes the aggregate once for each validated dataset. Bucket edges are calculated in decimal arithmetic and converted to JSON numbers. In a range near JavaScript's precision limit, adjacent edges can round to the same number. Matching uses the returned edges and still counts every listing exactly once.
