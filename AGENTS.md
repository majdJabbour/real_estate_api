
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Real Estate API — Engineering Guidelines

## 1. Project Overview

This project is a REST API backend for a bilingual real estate mobile application built with Flutter.

The backend is part of a technical recruitment assessment.

Primary objectives:

- Clean, maintainable, and testable code.
- Clear separation of concerns.
- Server-side search, filtering, sorting, and pagination.
- Arabic and English localization.
- Secure Google authentication through Firebase.
- Consistent and predictable API contracts.
- Production-oriented architecture without unnecessary complexity.

The initial data source is a JSON dataset.
The architecture must allow migration to PostgreSQL or another database without changing the public API contract.

## 2. Technology Stack

- Next.js 16.4.6
- App Router
- TypeScript 5.9.3
- Node.js 24 LTS
- pnpm
- Zod
- Firebase Admin SDK
- Cloud Firestore for persistent favorites
- Vitest
- ESLint
- Vercel

Use the versions installed in package.json.

Do not upgrade, downgrade, install, or remove dependencies without explaining the reason and obtaining approval.

Always use pnpm as the package manager.

## 3. Development Workflow

Before implementing any task:

1. Inspect the existing codebase.
2. Read the relevant local Next.js documentation.
3. Understand the requirements and existing conventions.
4. Identify affected files and dependencies.
5. Propose a concise implementation plan.
6. Implement only the approved scope.
7. Add or update relevant tests.
8. Run validation commands.
9. Report completed changes, decisions, and limitations.

Do not implement unrelated features.

Do not perform broad refactoring without approval.

Do not automatically commit or push changes.

Never claim that a command or test passed unless it was actually executed successfully.

## 4. Architecture

Use a pragmatic feature-based layered architecture.

Dependency flow:

Route Handler
    -> Validation
    -> Service
    -> Repository Interface
    -> Repository Implementation
    -> Data Source

Responsibilities:

### Route Handlers

- Handle HTTP requests and responses.
- Parse and validate request parameters.
- Delegate business operations to services.
- Convert application errors into HTTP responses.
- Keep route handlers thin.

### Services

- Coordinate business operations.
- Apply business rules.
- Work with repository abstractions.
- Remain independent of Next.js HTTP APIs.
- Be independently testable.

### Repositories

- Define clear data-access contracts.
- Encapsulate data-source-specific behavior.
- Support filtered, sorted, and paginated queries.
- Keep storage details outside the service and HTTP layers.

The JSON repository may perform in-memory filtering on the server.

A future database repository must be able to execute filtering, sorting, counting, and pagination directly in the database.

Do not design repository contracts that require retrieving all records.

### Dependency Injection

- Prefer explicit constructor or function-based injection.
- Avoid global mutable dependencies.
- Do not introduce a dependency injection container.

## 5. Project Structure

Expected structure:

    src/
      app/
        api/
          v1/
            properties/
              route.ts
              [id]/
                route.ts
              filter-options/
                route.ts
            auth/
              me/
                route.ts
            favorites/
              route.ts
              [propertyId]/
                route.ts
            health/
              route.ts

      features/
        properties/
          domain/
          application/
          infrastructure/
        authentication/
        favorites/

      core/
        config/
        errors/
        http/
        firebase/

      data/
        properties.json

    tests/
    AGENTS.md
    API_CONTRACT.md
    AI_USAGE.md
    README.md
    .env.example
    vitest.config.ts

Create directories only when they are needed.

Avoid empty architectural layers and unnecessary abstractions.

## 6. TypeScript Standards

- Use strict TypeScript.
- Avoid any.
- Use unknown for untrusted values.
- Validate external data before using it.
- Prefer explicit and descriptive names.
- Prefer immutable data where practical.
- Use readonly where appropriate.
- Avoid non-null assertions unless justified.
- Avoid unnecessary type assertions.
- Avoid magic numbers and duplicated constants.
- Prefer small, focused functions.
- Use named exports where practical.
- Use @/ imports for appropriate internal modules.
- Avoid circular dependencies.

Use Zod schemas as the source of truth for request validation.

Infer TypeScript types from Zod schemas when appropriate instead of duplicating definitions.

Comments should explain why a decision was made rather than restating the code.

## 7. Naming Conventions

- Files and directories: kebab-case
- Classes and types: PascalCase
- Functions and variables: camelCase
- Constants: UPPER_SNAKE_CASE where appropriate
- Tests: *.test.ts

Examples:

    property.repository.ts
    json-property.repository.ts
    property.service.ts
    property-query.schema.ts
    property.mapper.ts
    property.service.test.ts

Use framework-required filenames such as route.ts without modification.

## 8. API Design

All public REST endpoints must use the prefix:

    /api/v1

Required endpoints:

    GET    /api/v1/health
    GET    /api/v1/properties
    GET    /api/v1/properties/:id
    GET    /api/v1/properties/filter-options
    GET    /api/v1/auth/me
    GET    /api/v1/favorites
    PUT    /api/v1/favorites/:propertyId
    DELETE /api/v1/favorites/:propertyId

Property endpoints are public.

Authentication and favorites endpoints require a verified Firebase ID token.

Use HTTP methods and status codes according to their semantics.

PUT favorite operations must be idempotent.

Do not introduce breaking changes to the API contract without approval.

## 9. Property Models

Maintain separate representations for:

- Internal property entity.
- Property summary response.
- Property details response.
- Property query.
- Property filter options.
- Pagination metadata.

Property summary responses should contain only the fields required by property cards.

Property details responses may include:

- Description
- Images
- Bedrooms
- Bathrooms
- Area
- Facilities
- Agent
- Location
- Reviews

Do not return full property details in listing endpoints.

Supported property types:

- apartment
- townhome
- house
- condo
- duplex
- studio

Use stable identifiers and explicit units.

All prices must use a consistent currency and pricing period.

All areas must use a consistent measurement unit.

Validate the JSON dataset against its defined schema.

## 10. Search and Filtering

Search and filtering must be performed on the server.

Supported query parameters:

- search
- types
- minPrice
- maxPrice
- minBedrooms
- minBathrooms
- minArea
- maxArea
- featured
- sortBy
- sortOrder
- page
- limit

Multiple property types must support OR semantics.

Different filter categories must support AND semantics.

Numeric ranges must be inclusive.

Bedrooms and bathrooms filters represent minimum required counts.

Search must:

- Support Arabic and English.
- Be case-insensitive where applicable.
- Trim unnecessary whitespace.
- Normalize Arabic text consistently.
- Search relevant property fields.

Validate all query parameters.

Reject invalid numeric ranges and unsupported property types.

Do not silently ignore invalid parameters.

Avoid loading unnecessary property details for listing requests.

## 11. Sorting and Pagination

Default pagination:

    page = 1
    limit = 20

Maximum page size:

    limit = 100

Supported sorting fields:

- createdAt
- price
- rating
- area

Default sorting:

    sortBy = createdAt
    sortOrder = desc

Apply operations in this logical order:

1. Search.
2. Filtering.
3. Count matching records.
4. Stable sorting.
5. Pagination.
6. Response mapping.

Never paginate before filtering.

Use a deterministic secondary sorting key to prevent inconsistent page ordering.

Return pagination metadata:

- page
- limit
- total
- totalPages
- hasNextPage
- hasPreviousPage

Empty search results are successful responses with an empty data array.

## 12. Filter Options

The filter-options endpoint must provide:

- Available property types.
- Minimum and maximum prices.
- Currency and pricing period.
- Price distribution histogram.
- Minimum and maximum building area.
- Area measurement unit.
- Bedroom count range.
- Bathroom count range.

Calculate values from the dataset.

Do not hardcode filter limits from the Figma design.

Histogram buckets must cover the complete price range without double-counting boundary values.

Handle empty datasets and equal minimum and maximum prices correctly.

## 13. Localization

Supported languages:

- en
- ar

Default language:

    en

Use the Accept-Language request header to determine the response language.

Store translatable content internally using localized values.

Example:

    {
      "en": "Modern Apartment",
      "ar": "شقة عصرية"
    }

Map localized fields to strings at the API boundary.

Use English as the fallback language.

Keep identifiers, enum values, and numeric values language-independent.

Search should support both languages regardless of the selected response language.

Set Content-Language appropriately.

Responses that vary by language must include appropriate Vary headers and caching policies.

## 14. API Response Format

Successful response:

    {
      "success": true,
      "data": {}
    }

Paginated response:

    {
      "success": true,
      "data": [],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 0,
        "totalPages": 0,
        "hasNextPage": false,
        "hasPreviousPage": false
      }
    }

Error response:

    {
      "success": false,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid query parameters"
      }
    }

Validation errors may include structured field-level details.

Error codes must remain stable and language-independent.

## 15. Error Handling

Use centralized application error handling.

Supported error categories:

- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- PROPERTY_NOT_FOUND
- RATE_LIMIT_EXCEEDED
- INTERNAL_SERVER_ERROR
- SERVICE_UNAVAILABLE

Requirements:

- Use appropriate HTTP status codes.
- Handle unexpected exceptions.
- Do not expose stack traces to API consumers.
- Do not expose database errors or internal implementation details.
- Log unexpected server errors safely.
- Distinguish operational errors from programming errors.

Do not advertise rate limiting unless it is actually implemented.

## 16. Firebase Authentication

Use Firebase Authentication for Google Sign-In.

The Flutter client obtains a Firebase ID token.

Authenticated requests include:

    Authorization: Bearer <firebase-id-token>

The backend must:

- Verify ID tokens using Firebase Admin SDK.
- Extract the authenticated user ID from the verified token.
- Never trust user identifiers supplied by the client.
- Reject missing, invalid, or expired tokens.
- Enforce resource ownership.
- Avoid implementing a separate custom JWT system.

Initialize Firebase Admin safely.

Reuse the initialized Firebase application when possible.

Use the Node.js runtime for Firebase Admin integrations.

Do not expose Firebase Admin credentials to client-side code.

## 17. Favorites

Store persistent favorites in Cloud Firestore.

Scope favorites to the authenticated Firebase user.

Adding a favorite must be idempotent.

Removing a favorite must be safe to repeat.

Validate property identifiers.

Do not allow users to access or modify another user's favorites.

Do not store per-user state in process memory or the deployed JSON file.

## 18. Environment Configuration

Keep environment-specific values in environment variables.

Maintain an .env.example file containing variable names and safe placeholders.

Never commit:

- Service account credentials.
- Private keys.
- Access tokens.
- Refresh tokens.
- Real environment secret files.

Validate required environment variables when needed.

Public property endpoints should not require Firebase credentials.

Do not initialize authentication services unnecessarily during build or unrelated requests.

## 19. Security

- Treat all client input as untrusted.
- Validate requests at the API boundary.
- Enforce authentication and authorization on protected resources.
- Limit maximum page sizes.
- Bound search input length.
- Never log authentication tokens.
- Never expose secrets through API responses.
- Do not disable security controls to resolve build issues.
- Do not enable arbitrary package installation scripts without review.
- Avoid unnecessary dependencies.
- Use HTTPS in deployed environments.

Add CORS configuration only when required.

Native Flutter applications do not generally require browser CORS configuration.

## 20. Caching and Performance

- Avoid unnecessary repeated data loading.
- Keep immutable mock data separate from request-specific state.
- Never cache authenticated user responses publicly.
- Ensure localized responses are cached correctly if caching is introduced.
- Prefer correctness before optimization.
- Avoid unnecessary network calls.
- Avoid N+1 data-access patterns.
- Do not rely on mutable local filesystem storage on Vercel.

The JSON dataset is a mock data source, not a production database.

Do not claim production-scale performance without measurements.

## 21. Testing

Use Vitest.

Write meaningful tests for:

- Dataset validation.
- Property mapping.
- Arabic and English search.
- Numeric range filtering.
- Multiple property types.
- Combined filters.
- Sorting and stable ordering.
- Pagination metadata.
- Empty results.
- Invalid query parameters.
- Price histogram calculation.
- Localization fallback.
- Error response mapping.
- Authentication failures.
- Favorite ownership and idempotency.

Prefer deterministic tests.

Do not require real network requests or Firebase production credentials for unit tests.

Use dependency injection and mocks where appropriate.

Avoid testing implementation details unnecessarily.

Do not modify tests merely to hide failing behavior.

## 22. Quality Gates

Run relevant validation commands after implementing changes:

    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build

Run coverage when appropriate:

    pnpm test:coverage

Resolve errors introduced by the implementation.

Report existing unrelated warnings separately.

Never suppress lint or type errors without a documented justification.

## 23. Documentation

Maintain:

### README.md

Include:

- Project overview.
- Architecture.
- Prerequisites.
- Installation.
- Environment configuration.
- Development commands.
- API usage examples.
- Authentication setup.
- Testing instructions.
- Deployment instructions.
- Assumptions and limitations.

### API_CONTRACT.md

Document:

- Endpoints.
- Request parameters.
- Response models.
- Validation rules.
- Authentication.
- Error codes.
- Localization.
- Pagination semantics.

### AI_USAGE.md

Record actual AI-assisted work:

- Tools used.
- Purpose of each tool.
- Relevant prompts or prompt summaries.
- Generated or reviewed components.
- Verification commands and results.
- AI suggestions modified or rejected by the developer.
- Reasons for those decisions.

Never fabricate developer reviews, test results, or rejected suggestions.

Update documentation when API behavior changes.

## 24. Git Guidelines

Use clear and meaningful commit messages.

Suggested conventions:

    chore: configure project tooling
    feat: implement property repository
    feat: add server-side property filtering
    feat: implement property pagination
    feat: integrate Firebase authentication
    test: cover property filtering
    docs: document API contract

Do not create artificial commit history.

Do not commit secrets, generated build outputs, or unrelated files.

## 25. Scope Control

This project is primarily a backend supporting a Flutter recruitment assessment.

Do not introduce:

- Unnecessary web interfaces.
- Microservices.
- Complex dependency injection frameworks.
- Custom authentication protocols.
- Unnecessary ORMs.
- Message queues.
- Redis without a demonstrated requirement.
- Excessive architectural abstractions.

Favor the simplest solution that satisfies the requirements while preserving clear boundaries and future extensibility.

## 26. Definition of Done

A task is complete when:

- Its approved requirements are implemented.
- Relevant tests are added or updated.
- TypeScript validation passes.
- ESLint validation passes.
- Relevant tests pass.
- Production build succeeds when applicable.
- Documentation is updated.
- Security implications are reviewed.
- Known limitations are communicated.
- No unrelated changes are introduced.

## API Contract Reference

API_CONTRACT.md is the authoritative specification
for the public REST API.

Read it before implementing or modifying any endpoint,
request schema, response model, or business rule.

Do not introduce contract changes without explicit
developer approval.

If AGENTS.md and API_CONTRACT.md contain conflicting
requirements, report the conflict before implementation.

## Implementation Plan Reference

Follow IMPLEMENTATION_PLAN.md for the approved
implementation sequence and acceptance criteria.

Implement one phase at a time.

Do not proceed to the next phase without explicit
developer approval.

After completing each phase, report:

- Implemented changes.
- Created and modified files.
- Engineering decisions.
- Tests added.
- Validation commands and actual results.
- Known limitations.
- Recommended next phase.

Keep AI_USAGE.md updated throughout development.