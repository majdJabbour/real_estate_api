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
