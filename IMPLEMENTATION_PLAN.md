# Real Estate API — Implementation Plan

Status: proposed execution plan for developer approval.

## 1. Working agreement

Read `AGENTS.md`, `API_CONTRACT.md`, and the relevant installed Next.js documentation before editing. Preserve the generated Next.js rules block. The contract is authoritative for public behavior; report conflicts before changing it. Inspect actual files and versions rather than assuming the scaffold configuration. Execute one approved phase at a time. No automatic commits, pushes, deployments, dependency changes or secret creation. Record actual AI assistance and verification in `AI_USAGE.md` from phase 0 onward.

The primary deliverable is the Flutter recruitment assessment (suggested total 12–14 hours). Keep backend work small: target roughly 3–4 focused hours for the public API and smoke tests, subject to actual scope and debugging. Authentication and persistent favorites are optional extensions until the employer confirms scope; prioritize Flutter fidelity, localization, state handling and tests over them. Confirm the selected Figma screens, color variant, and custom API acceptance. Do not block public API development on Firebase setup.

## 2. Sequence and checkpoints

| Phase | Scope | Depends on | Priority |
|---|---|---|---|
| 0 | Tooling and baseline | Existing scaffold | Required |
| 1 | Models and normalized fixture | 0 | Required |
| 2 | Query validation and repository | 1 | Required |
| 3 | Public HTTP API and localization | 2 | Required |
| 4 | Filter options and histogram | 3 | Required |
| 5 | Public API integration verification | 4 | Required |
| 6 | Firebase authentication | 5; confirmed scope | Conditional |
| 7 | Firestore favorites | 6; confirmed scope | Conditional |
| 7.1 | Favorite IDs and client integration support | 7; approved extension | Required for favorite toggles |
| 8 | Documentation and deployment readiness | 5, plus approved extensions | Required |
| 9 | Flutter handoff | 8 | Required |

## Phase 0 — Tooling and baseline

- Inspect `package.json`, lockfile, `pnpm-workspace.yaml`, `next.config.ts`, `tsconfig.json`, current Node version and Git status.
- Verify Node 24 runtime (types alone do not set runtime); align `engines.node` and deployment runtime. Keep installed package versions unless a change is approved.
- Preserve reviewed pnpm build-script approvals. Investigate the home-directory workspace warning and explicitly set the project Turbopack root if needed. Disable unnecessary experimental feedback and Cache Components if still enabled, preserving unrelated config.
- Ensure scripts `lint`, `typecheck`, `test`, `test:watch`, `test:coverage`, `build` exist. Configure Vitest for Node and the actual TypeScript alias; add a minimal meaningful configuration smoke test. Do not require Firebase credentials.
- Create `AI_USAGE.md` with actual tool/prompt/verification entries, not fabricated reviews. Keep secrets and build/coverage artifacts ignored.

Acceptance: frozen lockfile install, peer check, lint, typecheck, smoke test and production build pass or blockers are documented. No feature endpoints yet. Record actual command output summaries.

## Phase 1 — Domain models and dataset

Suggested locations: `src/features/properties/domain/`, `src/data/`, adjacent tests. Use actual root layout if different.

- Implement Zod schemas and inferred types for internal records, summary/details and stable property types. Validate unique IDs, dates, finite positive price/area, ratings, room counts, coordinates, HTTPS URLs and nullable agent avatar.
- Preserve original `properties.json` as a source fixture. Create a separate normalized fixture of 30 synthetic rentals covering all six types (apartment, townhome, house, condo, duplex, studio). Curate condo/duplex examples; do not simply relabel villas. Use explicit synthetic USD monthly rents, sqm, bilingual title/description/address/review comments and ISO UTC timestamps. Stable facility keys and stable references; do not fabricate real listings.
- Ensure useful variation for search, combinations, boundary tests and featured results. Verify image availability and suitability separately; document failures and illustrative nature. Do not claim image checks were performed if they were not.

Acceptance: dataset schema tests pass, all six categories present, duplicate IDs/invalid URLs and invalid numeric data rejected, original preserved. Review sample records in both languages.

## Phase 2 — Query validation and repository

Suggested files: `property-query.schema.ts`, `property.repository.ts`, `json-property.repository.ts`, `property.service.ts`, search normalization helper and tests.

- Implement the exact query rules in contract section 4, including strict booleans and numeric parsing, unknown/duplicate keys, page 1–1000000, limit 1–100, search max 120, CSV type deduplication and reversed range rejection.
- Repository accepts a validated query and returns paginated matching records and total, supports lookup by ID and filter aggregation. Do not force a future database repository to fetch all rows. Inject dependencies explicitly; no DI framework.
- Normalize both language versions of title, address and description. Implement substring search, inclusive numeric ranges, OR within types and AND across filters. Zero room minimum imposes no restriction. Filter before count, sort, paginate and mapping; stable ID ascending tie-breaker. Avoid mutating the fixture.
- Keep internal JSON access read-only and validated once where practical.

Acceptance: deterministic unit tests for Arabic diacritics/tatweel/alef normalization, English case, empty search, invalid values, combinations, featured=false, exact numeric boundaries, stable sorting, empty/out-of-range pages and accurate metadata. No HTTP or Firebase dependencies in business logic.

## Phase 3 — Public routes and localization

Implement GET `/api/v1/health`, `/api/v1/properties`, `/api/v1/properties/:id` with thin App Router handlers. Use installed documentation for route parameter signatures.

- Shared success/error helpers and application errors; 400 invalid input, 404 unknown property, 500 unexpected failures. No stack traces or secret data in responses. Do not implement or claim rate limiting.
- Map summary separately from details; localize only specified fields. Negotiate Accept-Language primary subtags and valid quality weights, English fallback, Content-Language, Vary and no-store per contract. Keep IDs/enums/numeric values stable. No public favorite flags.
- Validate ID syntax according to contract. Health is liveness only. Public routes must work with no Firebase credentials.

Acceptance: handler tests cover response envelopes, malformed query, missing ID, language negotiation, summary field exclusion, localized detail and no credentials. Build confirms API routes exist.

## Phase 4 — Filter options

Implement GET `/api/v1/properties/filter-options`, rejecting query parameters. Return global dataset bounds, six available type labels (only present types, stable order), currency/period, area unit, room bounds and 20 equal-width price buckets as specified in contract section 6.

Acceptance: histogram counts sum to dataset size; internal boundaries counted once, final max included; empty data returns null bounds/empty buckets/types; equal prices produce one bucket. Labels localized. No download of the full property dataset to Flutter.

## Phase 5 — Public integration and regression checks

- Run lint, typecheck, all Vitest tests, coverage and build; record actual results. Prefer meaningful assertions over arbitrary coverage targets.
- Start local server and smoke-test health, default list, combined filters, Arabic/English headers, details, invalid parameters, empty results and filter options using curl or an equivalent HTTP client. Test pagination across pages and verify totals/IDs.
- Review image URLs, payload size, no unintended credential requirement, no raw bilingual object leakage. Document the JSON mock limitation and offset pagination; no claim of 100k-record production capacity.

Acceptance: public API is ready for Flutter. Stop here for review before optional authentication work.

## Phase 6 — Firebase authentication (conditional)

- Configure Google provider and Android/iOS OAuth settings in Firebase separately with developer account access. Never paste secrets into prompts or commit service account JSON. Provide safe `.env.example` placeholders; configure actual values locally and on hosting through approved secret management.
- Lazy Firebase Admin initialization on Node runtime; reuse initialized app. Verify Bearer ID token via injectable verifier; derive UID only from verified claims. Distinguish invalid/expired token (401) from infrastructure failure (503). Implement GET `/api/v1/auth/me` with nullable email/name/avatar and private, no-store caching.
- Flutter handles sign-in and token refresh using Firebase SDK; no custom JWT endpoint.

Acceptance: mocked tests for missing/malformed/invalid/expired tokens, successful identity, infrastructure failures; public API works without Firebase credentials. Real sign-in smoke test only after actual Firebase configuration, report if not performed.

## Phase 7 — Favorites (conditional)

- Firestore repository scoped to verified UID: `users/{uid}/favorites/{propertyId}`. GET paginated summaries, PUT idempotent atomic add without resetting original timestamp, DELETE repeatable no-op and orphan cleanup. Exclude orphaned IDs from list and totals. Implement stable ordering and input validation as in contract section 8. No per-user process memory or JSON writes.
- Before building card-level favorite state at scale, resolve contract gap: paged favorite list cannot establish membership of arbitrary visible cards. Propose a bounded batch membership endpoint or other explicit contract extension for developer approval; do not silently change public APIs.
- Test ownership, isolation, repeat/concurrent add semantics, delete, orphan references and invalid property ID using deterministic mocks; use emulator or configured test project for actual Firestore behavior verification if available.

Acceptance: no cross-user access; repeated mutations safe; authenticated responses never publicly cached. Document unverified real-cloud behavior. If omitted, document that favorites are out of approved scope rather than claiming implementation.

## Phase 7.1 — Favorite IDs and client integration support

- Implement the approved `GET /api/v1/favorites/ids` extension from contract section 8. Scope one ID-only Firestore query to the verified UID, return unique IDs in ascending order, and preserve private no-store caching. Orphaned IDs may be returned.
- Preserve the paginated favorites and mutation contracts, including PUT and DELETE for the property ID `ids`. Keep public property models independent of authenticated favorite state.
- Document Riverpod state, optimistic mutations, rollback, session isolation, and refresh behavior. A bounded batch membership API remains a future option for very large collections.

Acceptance: deterministic mocked verification of empty and populated responses, sorting, uniqueness, owner isolation, errors and route compatibility. The credential-free production HTTP suite verifies a 401 for the new endpoint and keeps public-route regression coverage.

## Phase 8 — Documentation and deployment readiness

- Update README with install/run commands, architecture, assumptions, dataset migration, API examples, locale, test results, limitations, optional Firebase configuration and deployment. Keep API_CONTRACT aligned with approved behavior; mark omitted optional features accurately. Complete actual AI_USAGE entries and record developer changes/rejections only if they occurred.
- Replace the starter page with a static API reference and check it against the nine approved operations. Review tracked files and inspectable Git history for credentials without exposing their values.
- Prepare repository configuration for Vercel with Next.js defaults, Node 24, pinned pnpm via Corepack, and Frankfurt functions (`fra1`). Document the manual deployment steps, plan eligibility and limits, and secret configuration.
- Deploy only after separate developer approval. After deployment, check the public and unauthenticated protected routes at the live HTTPS URL. Verify authenticated behavior when a real Firebase ID token is available and record actual results.

Acceptance: frozen install, peer check, lint, typecheck, unit tests, coverage, credential-free build and HTTP integration tests, and a clean whitespace check. The repository remains local until the developer approves deployment.

## Phase 9 — Flutter handoff

- Share actual API base URL, contract, sample responses and error codes. Implement Dio client with timeouts, language header, cancellation, and Firebase token interceptor only if auth approved.
- Use server-side filters/search/sort/pagination; reset page on query/locale changes, debounce search, discard stale responses, load filter options without fetching all listings. UI supports loading, error/retry, empty, image failures, ARB localization and RTL/LTR with persisted language.
- Verify selected Figma screens and interactions; prioritize Flutter testing and delivery artifacts per assessment. Do not treat backend test coverage as substitute for Flutter tests.

## 3. Phase report template

At the end of each phase report: approved scope; changed files; key decisions; actual commands and exit results; tests added; limitations/blockers; AI_USAGE updates; suggested next phase. Stop for developer review. Never invent results or approvals.

## 4. Quality commands

```sh
pnpm install --frozen-lockfile
pnpm peers check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Run applicable commands only after scripts/tests exist. Report any unavailable command or pre-existing warning separately. Review `git diff` and `git status --short` before handoff.
