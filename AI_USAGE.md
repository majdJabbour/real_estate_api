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
