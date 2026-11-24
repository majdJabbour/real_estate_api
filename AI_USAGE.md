# AI usage

## Phase 0 — Tooling and baseline

**Prompt summary.** Implement only Phase 0 after reading the engineering guidelines, API contract, implementation plan, and installed Next.js guides. Preserve the generated agent rules and dependency versions. Verify the toolchain and stop for developer review.

**Tools and work.** OpenAI Codex used the shell, Git, and pnpm to inspect the scaffold, working tree, lockfile, configuration, and installed versions. It read the installed Next.js guides for Turbopack, agent feedback, Cache Components, Vitest, and route type generation. It checked the deployment runtime mapping against the Vercel documentation. [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

**Decisions.** Codex pinned `engines.node` to `24.x` and added scripts for type checking, tests, watch mode, and coverage. Type checking regenerates Next.js route types before running TypeScript. Turbopack uses the config directory as the root because the home directory also contains lockfiles. Agent feedback and Cache Components were already disabled. Vitest reads the existing TypeScript paths, runs in Node, and uses the installed V8 coverage provider. The smoke test imports the scaffold page through `@/` and renders it with React on the server. Coverage reports are ignored by Git and ESLint.

**Verification.** The default shell selected Node 26.13.1. Validation used Node 24.22.3 LTS (Krypton) and pnpm 12.6.0. The Node binary inside the desktop app could not load native modules due to macOS signing restrictions. Retrying with the standalone Node 24 already on disk resolved the SWC and Rolldown startup errors. The Vitest config uses `.mts` to declare it as ESM without changing the package's module format.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exit 0 outside the sandbox after the initial registry DNS failure in the sandbox. pnpm reused 495 cached packages and ran the existing approved `@firebase/util` and `protobufjs` postinstall scripts. |
| `pnpm peers check` | Exit 0. No peer dependency issues. |
| `pnpm lint` | Exit 0. |
| `pnpm typecheck` | Exit 0. Next.js route types generated and TypeScript passed. |
| `pnpm test` | Exit 0. One file and one smoke test passed. |
| `pnpm test:watch` | Exit 0 after quitting. The smoke test passed and Vitest entered watch mode. |
| `pnpm test:coverage` | Exit 0. V8 generated coverage for the scaffold smoke test. |
| `pnpm build` | Exit 0. Turbopack built the static scaffold routes without a root warning. |
| `git diff --check` | Exit 0. |

Git ignore checks confirmed that environment files, PEM keys, coverage, and Next.js build outputs are ignored. File checksums confirmed preservation of the agent rules, contract, implementation plan, lockfile, and pnpm build approvals. The repository's Aikido MCP scan was unavailable in this session. No developer review or rejection had occurred when this entry was written.

## Phase 1 — Domain models and dataset

**Prompt summary.** After the developer approved Phase 0, implement only the bilingual property domain, contract DTOs, locale mappers, normalized fictional dataset, and tests. Add the Node 24 nvm pin and verify the stock photo URLs.

**Tools and work.** Codex used the shell and Git to inspect the Phase 0 checkout and look for the original `properties.json`. It read the installed Next.js structure and Vitest guides and checked the installed Zod API. It authored the schemas, mappers, and test cases, then used Python to serialize curated bilingual records to a deterministic JSON fixture. It used web search to review Pexels photo descriptions for suitability and curl to check public image URLs.

**Decisions.** The original source fixture was absent from the checkout, sibling Flutter workspace, and available API history. Codex reported this before creating a separate normalized file. English is required internally and Arabic may be absent to support per-field English fallback. The demo fixture includes both locales for every translatable field. The schemas enforce HTTPS image URLs, UTC timestamps in `Z` form, explicit units, unique property IDs, gallery membership for thumbnails, unique review IDs within each property, and consistent details for repeated agent IDs. DTOs explicitly select contract fields and copy nested values. Demo coordinates are approximate. Agent avatars are null, and stock photos are shared as illustrations. One candidate image returned 404 and was replaced. All 18 URLs in the delivered fixture returned HTTP 200 with `image/jpeg`; client rendering was outside the local image check. [Pexels license](https://www.pexels.com/license/)

**Verification.** Node 24.22.3 LTS and pnpm 12.6.0 were used. Phase 1 added 43 tests for schema validation, fixture integrity, nested consistency, numeric constraints, locale mapping, fallback, and DTO boundaries. The full suite includes the Phase 0 smoke test.

| Command | Result |
| --- | --- |
| `pnpm lint` | Exit 0. |
| `pnpm typecheck` | Exit 0. Next.js route types generated and TypeScript passed. |
| `pnpm test` | Exit 0. Two files and 44 tests passed. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (38/38), branches (15/15), functions (9/9), and lines (38/38) for the three instrumented source files. |
| `pnpm build` | Exit 0. Turbopack built the existing scaffold routes. |
| `git diff --check` | Exit 0. |

The Aikido MCP scanner was unavailable in this session. No Phase 1 developer review or rejection had occurred when this entry was written.

## Phase 2 — Query validation and repository

**Prompt summary.** After the developer approved Phase 1, implement the section 4 query schema, bilingual search, a database-compatible repository contract, the JSON adapter, a thin property service, and deterministic tests. Keep HTTP routes and the detailed histogram for their planned phases.

**Tools and work.** Codex used the shell, Git, and pnpm to review the project instructions, installed Next.js guides, Phase 0 setup, Phase 1 domain and tests, and unchanged normalized fixture. It implemented the schema, normalization, repository, service, and tests. It spot-checked the installed Zod behavior for unknown keys and inspected the final working tree.

**Decisions.** The Zod schema checks decoded query entries for repeated keys before strict field validation. Integers use decimal digits and the JavaScript safe integer range. Price and area accept unsigned plain decimals. Search counts Unicode code points after trimming. Type lists preserve the first occurrence of each exact enum value. Search applies NFKC, lowercase, Arabic mark and tatweel removal, common alef folding, and whitespace collapse independently of the response locale. The asynchronous repository contract returns summary source fields and a total, a full record for ID lookup, and global bounds and types for aggregation. JSON records are validated and frozen once per supplied dataset, with a shared prepared copy of the bundled fixture and no per-query record cloning. Combined search and filters precede counting, sorting with ascending ID ties, and slicing. The service maps responses and calculates pagination metadata.

**Verification.** Node 24.22.3 LTS, pnpm 12.6.0, and Vitest 5.1.1 were used. Phase 2 added 87 tests. An initial repository test used a timestamp without seconds, which the existing domain schema rejects. The test now uses a valid fixture timestamp and verifies sub-millisecond ordering and ties across equivalent timestamp strings.

| Command | Result |
| --- | --- |
| `pnpm lint` | Exit 0. |
| `pnpm typecheck` | Exit 0. Route types generated and TypeScript passed. |
| `pnpm test` | Exit 0. Five files and 131 tests passed. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (113/113), branches (86/86), functions (39/39), and lines (109/109) across seven instrumented source files. |
| `pnpm build` | Exit 0. Turbopack built the two existing scaffold routes. |
| `git diff --check` | Exit 0. |

Checksums confirmed the generated agent rules, API contract, implementation plan, dependency manifest, lockfile, and normalized fixture were preserved. The Aikido MCP scanner was unavailable. No Phase 2 developer review or rejection had occurred when this entry was written.

## Phase 3 — Public routes and localization

**Prompt summary.** After the developer approved Phase 2, implement the public health, property listing, and property detail handlers with shared response and error handling, locale negotiation, documentation, and focused verification.

**Tools and work.** Codex used the shell and Git to inspect the project guidelines, installed Next.js Route Handler guides, and existing domain, repository, service, and tests. It implemented the three handlers, then used pnpm and Vitest for local validation and Node fetch for loopback checks against the built Next.js server.

**Decisions.** The property handlers share a module-scoped service built with an explicitly injected JSON repository. The repository reuses the previously validated fixture. Health uses the response helper alone. Localized successes select the highest weighted supported language, break ties by header order, and fall back to English when no named preference qualifies. They set `Content-Language` and `Vary: Accept-Language`. All handler responses set `Cache-Control: no-store`. ID validation accepts 1–128 URL-unreserved characters and excludes standalone dot segments. Listing validation reports field errors without reflecting unknown keys or query values. Unexpected failures emit a fixed log message and a sanitized 500 response.

**Verification.** Node.js 24.22.3 LTS, pnpm 12.6.0, and Vitest 5.1.1 were used. The loopback server needed permission to bind and receive requests outside the sandbox. It ran with a clean process environment and was stopped after verification.

| Command | Result |
| --- | --- |
| `pnpm lint` | Exit 0. |
| `pnpm typecheck` | Exit 0. Generated route types and TypeScript passed. |
| `pnpm test` | Exit 0. Seven files and 175 tests passed, including 44 added tests. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (170/170), branches (111/111), functions (53/53), and lines (163/163) across 15 instrumented source files. |
| `pnpm build` | Exit 0. The build listed all three API routes. |
| Local production HTTP smoke | Seven checks passed. Health, default listing, Arabic listing for English search, and English details returned 200. A reversed range and encoded slash in the ID returned 400. An unknown ID returned 404. JSON, no-store, and the applicable locale headers were verified. |
| `git diff --check` | Exit 0. |

The API contract, implementation plan, generated agent rules, dependencies, and normalized fixture were preserved. The Aikido MCP scan was unavailable. No Phase 3 developer review or rejection had occurred when this entry was written.

## Phase 4 — Filter options and histogram

**Prompt summary.** After the developer approved Phase 3 and reported successful manual API testing, implement the public filter-options endpoint, repository aggregation, localized labels, and contract-defined histogram. Verify the new static route and existing public routes over HTTP.

**Tools and work.** Codex used the shell, Git, and pnpm to inspect the existing implementation and installed Next.js Route Handler docs, author the route and aggregate, and run local checks. It independently counted fixture prices against the expected edges before comparing the results with the API. Node fetch verified the built Next.js server over loopback with a clean process environment.

**Decisions.** The JSON repository computes and deep-freezes global bounds, present types in enum order, and the price histogram when it prepares a dataset. The service reads that aggregate through the repository contract and maps labels with the existing locale resolver and response helpers. The response uses pricing and area constants shared with property validation. Histogram interpolation uses decimal integer arithmetic for 20 equal-width buckets. Comparisons use the serialized numeric edges, with the final upper edge inclusive. Adjacent edges can coincide when numeric precision is insufficient. Interior zero-width buckets are empty, and the final bucket still includes the maximum. Empty datasets return null bounds and empty lists. Equal prices use a single bucket.

**Verification.** Node.js 24.22.3 LTS, pnpm 12.6.0, and Vitest 5.1.1 were used. The fixture returned USD 975–4,250 per month, 26–238 sqm, 0–5 bedrooms, and 1–4 bathrooms. The histogram contained 20 buckets and counted all 30 listings.

| Command | Result |
| --- | --- |
| `pnpm lint` | Exit 0. |
| `pnpm typecheck` | Exit 0. Generated route types and TypeScript passed. |
| `pnpm test` | Exit 0. Nine files and 188 tests passed, including 13 added tests. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (213/213), branches (122/122), functions (66/66), and lines (202/202) across 17 instrumented source files. |
| `pnpm build` | Exit 0. Listed the static-segment filter-options route alongside `[id]`. |
| Local production HTTP smoke | Exit 0. English and Arabic filter options returned 200 with locale, Vary, and no-store headers. A filter-options query returned 400. Health, listing, and a valid property ID returned 200. An unknown property ID returned 404. The server was terminated after the checks. |
| `git diff --check` | Exit 0. |

The generated agent rules, API contract, plan, dependencies, and normalized fixture were preserved. The Aikido MCP scanner was unavailable. No Phase 4 developer review or rejection had occurred when this entry was written.

## Phase 5 — Public integration and regression checks

**Prompt summary.** After the developer approved Phase 4, verify all four public endpoints against a local Next.js production server and add repeatable Vitest HTTP regression tests. Keep the regular suite independent of the server and stop before optional authentication work.

**Tools and work.** Codex inspected the project documents, public API implementation, existing tests, and the installed Next.js production CLI. It added a dedicated Vitest config, a server lifecycle setup, and 24 loopback tests. It used pnpm and Git for verification, Node fetch for HTTP assertions, and separate HEAD requests to confirm the public fixture image URLs.

**Decisions.** The integration command uses an existing production build. Its setup starts the Next.js CLI as a directly owned child on an OS-assigned loopback port, with a minimal environment. It waits for the assigned address and a successful HTTP health probe under a 15-second deadline. Teardown waits for the child to close, with a forced shutdown fallback. The suite checks contract-shaped JSON, fixture-derived filtering and stable pagination, bilingual behavior, histogram membership, and safe application errors. It separately verifies a framework-generated 405.

**Verification.** Node.js 24.22.3 LTS, pnpm 12.6.0, and Vitest 5.1.1 were used on macOS arm64. Loopback verification required sandbox permission. Twelve concurrent requests split between Arabic search and an English price/type filter, plus a follow-up, passed in 8 ms in the verbose local run. Identical inputs produced equivalent responses. The uncompressed English JSON bodies were 6,175 bytes for the default listing, 1,244 bytes for `rental-001`, and 1,184 bytes for filter options. All 18 image URLs returned HTTP 200 with `image/jpeg` in a separate HEAD check. The 30-record loopback check provides functional evidence for request isolation.

| Command | Result |
| --- | --- |
| `pnpm lint` | Exit 0 with no warnings on the final run. |
| `pnpm typecheck` | Exit 0. Generated route types and TypeScript passed. |
| `pnpm test` | Exit 0. Nine files and 188 regular tests passed with no server. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (213/213), branches (122/122), functions (66/66), and lines (202/202) across 17 instrumented source files from the regular suite. |
| `pnpm build` | Exit 0. Listed all four public routes. |
| `pnpm test:integration` | Exit 0. One file and 24 production HTTP tests passed. |
| `pnpm test:integration --reporter=verbose --silent=false` | Exit 0. Confirmed the payload sizes and concurrency observations above. No Next.js process was found after teardown. |
| `git diff --check` | Exit 0. |

The initial tooling check exposed a missing typed `NODE_ENV` field in the child environment and an unused startup event variable. Codex corrected both in the new setup. The HTTP suite found no application regression that required a fix. The generated agent rules, contract, normalized dataset, lockfile, and application source were preserved. The Aikido MCP scan was unavailable. No Phase 5 developer review or rejection had occurred when this entry was written.

## Phase 6 — Firebase Authentication

**Prompt summary.** After the developer approved Phase 5, implement lazy Firebase Admin Auth, an injectable bearer-token guard, and the protected profile endpoint. Verify response contracts and public access without credentials while keeping the local service account configuration confidential.

**Tools and work.** Codex reviewed the repository guidelines, installed Next.js and Firebase Admin sources, and Firebase documentation. It used Git, pnpm, Vitest, and loopback HTTP requests to verify the implementation. It confirmed `.env.local` is ignored and verified configuration using field-level presence and format checks. Credential values were not printed or written to the tracked tree.

**Decisions.** The server-only Node adapter validates and normalizes service-account settings on first protected use. It uses a named app and reuses it only when the project and credential are compatible. The guard verifies one Firebase ID token per request through an injectable verifier and returns only the UID and optional profile claims. Since the contract leaves revocation policy unspecified, this implementation enables revocation and disabled-account checks. The API maps credential rejection to 401 and unavailability to 503. Protected responses use `private, no-store`. SDK emulator mode is rejected in this production verification path.

**Findings.** The local production smoke test found that the supplied `FIREBASE_CLIENT_EMAIL` fails email format validation. The local configuration was left untouched. A direct diagnostic also found that the installed SDK uses `auth/argument-error` for malformed Firebase tokens. The verifier now recognizes that code with the SDK's token-rejection diagnostics. Signing-key fetch errors with the same code remain 503. Both paths have regression tests.

**Verification.** Node.js 24.22.3 LTS, pnpm 12.6.0, and Vitest 5.1.1 were used. The Next.js loader was checked to confirm empty Firebase settings shadowed local dotenv values for the production build and integration run.

| Command or check | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck` | Exit 0. |
| `pnpm test` | Exit 0. Eleven files and 224 tests passed, including 36 added tests. |
| `pnpm test:coverage` | Exit 0. V8 reported 100% statements (260/260), branches (162/162), functions (79/79), and lines (244/244) across 23 instrumented source files. |
| `pnpm build` with Firebase settings blank | Exit 0. The build listed the auth endpoint and all four public routes. |
| `pnpm test:integration` | Exit 0. All 27 HTTP tests passed with Firebase settings blank. |
| Local settings HTTP smoke | All four public routes returned 200. Missing and malformed bearer credentials returned 401. A JWT-shaped invalid token reached configuration validation and returned 503. |
| Synthetic settings HTTP smoke | The real Admin SDK initialized with an in-memory test key and rejected the invalid token with 401 on two consecutive requests. Missing credentials also returned 401. No real Firebase user or token was involved. |
| `git diff --check` | Exit 0. |

All spawned servers were stopped. Successful live sign-in and verification with a real Firebase ID token remain pending. The API contract, generated Next.js agent rules, dependency versions, and dataset were preserved. The Aikido MCP scan was unavailable.

## Phase 7 — Favorites and Firestore

**Prompt summary.** The developer approved Phase 6, reported correcting the Firebase client email, and created the default Firestore database. Implement the authenticated favorites API, atomic mutations, deny-all rules, and offline verification. Real sign-in, real ID-token verification, and authenticated cloud persistence remain pending.

**Tools and work.** Codex inspected the project docs, installed Next.js and Firebase SDK interfaces, and official Firestore guidance. It used Git, pnpm, Vitest, and the existing production HTTP harness. Repository tests use an injected mock with atomic create behavior. No cloud Firestore writes or Security Rules deployment were performed.

**Decisions.** Firestore initializes lazily against the default database using the same compatible named Firebase Admin app as Auth. Each request verifies the Firebase ID token once and uses only its UID to scope the collection. The service reuses property ID validation and rejects Firestore-reserved IDs. The adapter rejects unsafe verified UIDs before resolving a collection. PUT requires an existing property and uses atomic create with a server timestamp. An already-existing document preserves its timestamp. DELETE supports orphan cleanup and repeat calls. GET reads one user's timestamp projection, sorts by full timestamp then ascending ID, and joins against the property repository in one batch. Orphans are excluded before totals and pagination. The local rules file denies direct client access. Admin access uses IAM.

**Verification.** Node.js 24.22.3 LTS and pnpm 12.6.0 were used. The build and integration suite ran with the Firebase credentials blank. No test server remained after teardown. A pre-existing Next.js development server was identified by its start time and left running.

| Command | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck` | Exit 0 on the final runs. |
| `pnpm test` | Exit 0. 248 tests across 13 files, including 24 new cases. |
| `pnpm test:coverage` | Exit 0. V8 reported 99.13% statements, 97.63% branches, 100% functions, and 99.38% lines for the regular instrumented suite. |
| `pnpm build` | Exit 0. Listed all existing routes and both favorites route files. |
| `pnpm test:integration` | Exit 0. All 30 HTTP tests passed. The four public endpoints worked without credentials, and the three unauthenticated favorites requests returned 401, a Bearer challenge, and private no-store caching. |
| `git diff --check` | Exit 0. |

Listing read cost grows with a user's stored references. Mock tests cover ordering, isolation, orphan removal, configuration and storage failures, timestamp preservation, and repeated and concurrent mutations. They do not establish cloud persistence. The API contract, generated Next.js agent rules, dependency versions, normalized dataset, and ignored local credentials were preserved. The Aikido MCP scan was unavailable.

## Phase 7.1 — Favorite IDs and client integration support

**Prompt summary.** After the developer approved Phase 7 and the contract extension, implement `GET /api/v1/favorites/ids` for shared favorite toggles and document how the Flutter client should manage membership.

**Tools and work.** Codex reviewed the project guides, installed Next.js Route Handler and Firestore SDK documentation, and official Firestore pricing guidance. It used Git, pnpm, Vitest, and the production loopback harness to implement and verify the endpoint.

**Decisions.** The ID route authenticates once and uses the verified UID. The adapter runs one Firestore query with an empty projection, and the service deduplicates and sorts document IDs. The query retains stored orphaned references and performs no property lookup or localization. The service preserves existing response and error conventions. Because the static route takes precedence over the dynamic segment, the static route also delegates PUT and DELETE for the literal property ID `ids` to the same mutation helper. The README covers session-scoped Riverpod state, optimistic changes, rollback, refreshes, and stale response handling.

| Command | Result |
| --- | --- |
| `pnpm lint`, `pnpm typecheck` | Exit 0 on Node.js 24.22.3. |
| `pnpm test` | Exit 0. 254 regular tests across 13 files, including six added cases. |
| `pnpm test:coverage` | Exit 0. V8 reported 99.17% statements, 97.60% branches, 100% functions, and 99.40% lines for the regular instrumented suite. |
| `pnpm build` | Exit 0 with Firebase settings blank. Both the literal and dynamic favorites routes were listed. |
| `pnpm test:integration --reporter=verbose` | Exit 0. All 33 production HTTP tests passed. GET, PUT, and DELETE on `/api/v1/favorites/ids` returned 401 with a Bearer challenge and private no-store caching without credentials. Existing favorites and public-route regressions passed. |
| `git diff --check` | Exit 0. |

The projection limits returned fields. Firestore document reads still grow with the user's saved references. Authenticated success was covered by mocks. Live Google Sign-In, real ID-token verification, and authenticated Firestore persistence remain pending. The public property models, fixture, generated agent rules, dependency versions, and local credentials were preserved. The Aikido MCP scan was unavailable.

## Phase 8 — Documentation and deployment readiness

**Prompt summary.** The developer approved Phase 7.1 and requested a repository and Git history review, a static API information page, minimal Vercel configuration, finalized documentation, and local verification. Deployment requires separate approval.

**Tools and work.** Codex reviewed the project guides, installed Next.js documentation, and official Vercel deployment guidance. Git and a Python script checked 144 objects reachable through local refs and reflogs for credential patterns and sensitive file paths. Findings were limited to match counts and file locations. No matches were found for the inspected patterns, and `.env.local` is ignored. The only tracked environment template is `.env.example`, which contains empty values. The review confirmed server-only Firebase Admin imports, private no-store protected responses, and the local deny-all Firestore client rules. Aikido was unavailable.

**Decisions.** The landing page is a prerendered React Server Component using plain CSS and system fonts, with a labeled health-response example and all nine approved operations. The generated Next.js agent rules are byte-identical to the prior revision. The Vercel configuration sets only Frankfurt (`fra1`) for functions and uses standard Next.js build settings. The existing Node 24 engine and pnpm 12.6.0 pin are preserved. The README documents Vercel's Corepack setting, the developer-reported Belgium Firestore location, and deployment and verification steps. Endpoint implementations and contract behavior were preserved.

**Verification.** Node.js 24.22.3 LTS and pnpm 12.6.0 were used.

| Command or check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Exit 0. Lockfile policy checks passed without new resolution or lockfile changes. pnpm printed an informational update notice. |
| `pnpm peers check` | Exit 0. No peer dependency issues. |
| `pnpm lint`, `pnpm typecheck` | Exit 0. |
| `pnpm test` | Exit 0. 254 tests across 13 files. The tooling test checks the landing page title, health link, and endpoint table. |
| `pnpm test:coverage` | Exit 0. V8 reported 99.17% statements (361/364), 97.60% branches (204/209), 100% functions (126/126), and 99.40% lines (334/336) in the regular configured coverage scope. |
| `pnpm build` | Exit 0 with Firebase settings blank. Next.js prerendered the landing page and built all API routes. |
| `pnpm test:integration` | Exit 0. 34 production HTTP tests passed, including the new landing-page request. Public routes returned 200 with blank Firebase credentials. Unauthenticated protected operations returned 401 with a Bearer challenge and private no-store caching. The test server stopped. |
| Endpoint and config comparison | All nine operations match the route exports, contract, engineering guide, README, and landing page. The existing literal-ID PUT and DELETE delegates are covered by integration tests. `vercel.json` parses and sets `fra1`. |
| `git diff --check` | Exit 0. |

The work stayed local. Vercel plan eligibility, build environment, service-account permissions, and effective cloud Firestore rules require verification during the approved release workflow. Live Google Sign-In, real Firebase ID-token verification, and authenticated Firestore persistence remain pending.
