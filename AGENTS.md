# Repository Guidelines

## How to Use This Guide

- This is the single AGENTS.md for **mybandnow-web** — a Vue 3 / TypeScript frontend SPA with Hexagonal Architecture and DDD.
- `src/AGENTS.md` contains implementation patterns: layer rules, naming conventions, decision trees, QA checklist.
- `docs/AGENTS.md` contains the documentation style guide: writing conventions, ADR format, feature doc format.
- Those files override this one when guidance conflicts.

## Engram Persistent Memory

**MANDATORY RULE:** If you attempt to use Engram (e.g., `mem_save` or CLI) and receive an `unknown_project` error indicating that the project is not backed by known context, YOU MUST INITIALIZE IT IMMEDIATELY. Do not stop or ask the user. Run the following command in the terminal to initialize it:

```bash
engram save "Init project" "Initializing the project in engram" --type config --project <project-name>
```

Then proceed with your original task or save operation.

## Available Skills

Use these skills for detailed patterns on-demand:

### Generic Skills (Any Project)

| Skill        | Description                                                                   | URL                                            |
| ------------ | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `typescript` | Const types, flat interfaces, utility types                                   | [SKILL.md](.agents/skills/typescript/SKILL.md) |
| `zod-4`      | New API (z.email(), z.uuid()) — used for env var schema validation at startup | [SKILL.md](.agents/skills/zod-4/SKILL.md)      |
| `test-unit`  | Unit testing with vitest-mock-extended and Object Mothers (Domain/App layers) | [SKILL.md](.agents/skills/test-unit/SKILL.md)  |
| `tdd`        | Test-Driven Development workflow                                              | [SKILL.md](.agents/skills/tdd/SKILL.md)        |

### Project-Specific Skills (Frontend)

| Skill                | Description                                                               | URL                                                    |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `changelog`          | Changelog entries (keepachangelog.com)                                    | [SKILL.md](.agents/skills/changelog/SKILL.md)          |
| `ci`                 | CI pipeline guidance (Jenkins/GitHub Actions)                             | [SKILL.md](.agents/skills/ci/SKILL.md)                 |
| `commit`             | Conventional commits — one-line format, no body                           | [SKILL.md](.agents/skills/commit/SKILL.md)             |
| `coverage-review`    | Review merged test coverage and enforce the 90% target                    | [SKILL.md](.agents/skills/coverage-review/SKILL.md)    |
| `pr`                 | Pull request conventions                                                  | [SKILL.md](.agents/skills/pr/SKILL.md)                 |
| `docs`               | Documentation style guide                                                 | [SKILL.md](.agents/skills/docs/SKILL.md)               |
| `hexagonal-feature`  | Full vertical slice: domain + application + infrastructure + Vue UI       | [SKILL.md](.agents/skills/hexagonal-feature/SKILL.md)  |
| `object-mother`      | Object Mothers, TestCase, Mock assertion patterns for unit tests          | [SKILL.md](.agents/skills/object-mother/SKILL.md)      |
| `jira-confluence`    | Jira issues, Confluence PRD sync, and branch task mapping workflow        | [SKILL.md](.agents/skills/jira-confluence/SKILL.md)    |
| `skill-creator`      | Create new AI agent skills                                                | [SKILL.md](.agents/skills/skill-creator/SKILL.md)             |
| `living-blueprint`   | Maintain docs/ and Confluence in sync after every feature merge           | [SKILL.md](.agents/skills/living-blueprint/SKILL.md)          |
| `upgrade-version`    | Bump version, generate changelog, and commit using Makefile               | [SKILL.md](.agents/skills/upgrade-version/SKILL.md)    |
| `security`           | Security and implementation QA checklist for frontend apps                | [SKILL.md](.agents/skills/security/SKILL.md)           |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding a new external provider (Axios API) | `hexagonal-feature` |
| Adding a new use case (command or query) | `hexagonal-feature` |
| Adding a new use case (command or query) | `security` |
| After completing an SDD archive phase | `living-blueprint` |
| After completing an SDD tasks phase | `jira-confluence` |
| After creating/modifying a skill | `skill-sync` |
| Archiving SDD artifacts to Confluence | `jira-confluence` |
| Create a PR with gh pr create | `pr` |
| Creating a git commit | `commit` |
| Creating a new module | `hexagonal-feature` |
| Creating domain aggregates, value objects | `hexagonal-feature` |
| Creating domain aggregates, value objects | `security` |
| Creating new skills | `skill-creator` |
| Creating test data factories | `object-mother` |
| Fixing bug | `security` |
| Fixing bug | `tdd` |
| Implementing feature | `security` |
| Implementing feature | `tdd` |
| Modifying existing skills structure | `skill-creator` |
| Modifying the Zod env schema | `zod-4` |
| Planning branching strategy | `jira-confluence` |
| Publishing business documentation to Confluence | `living-blueprint` |
| Publishing to Confluence | `jira-confluence` |
| Refactoring code | `security` |
| Refactoring code | `tdd` |
| Regenerate AGENTS.md Auto-invoke tables (sync.sh) | `skill-sync` |
| Reviewing test coverage | `coverage-review` |
| Syncing docs with codebase | `living-blueprint` |
| Testing Application Use Cases | `object-mother` |
| Testing Application Use Cases | `test-unit` |
| Testing Domain Aggregates | `object-mother` |
| Testing Domain Aggregates | `test-unit` |
| Troubleshoot CI/CD failures | `ci` |
| Troubleshoot why a skill is missing from AGENTS.md auto-invoke | `skill-sync` |
| Update CHANGELOG.md | `changelog` |
| Updating documentation after feature merge | `living-blueprint` |
| Working on Jira integration | `jira-confluence` |
| Working on task | `security` |
| Working on task | `tdd` |
| Writing TypeScript types/interfaces | `typescript` |
| Writing documentation | `docs` |
| Writing unit tests | `object-mother` |
| Writing unit tests | `test-unit` |

---

## Project Overview

**mybandnow-web** is a Frontend SPA following strict Hexagonal Architecture (Ports & Adapters) with Domain-Driven Design.

| Item            | Value                       |
| --------------- | --------------------------- |
| Runtime         | Node.js 24 / TypeScript 5.4 |
| Framework       | Vue 3 (Composition API)     |
| Bundler         | Vite                        |
| State Mgmt      | Pinia                       |
| HTTP Client     | Axios                       |
| Test runner     | Vitest / Playwright         |

### Architecture — Hexagonal (strict)

```
ui/            → Entry points (Vue, Router, Pinia); imports application and infrastructure
application/   → Use cases (commands, queries, handlers); imports domain only
domain/        → Aggregates, value objects, domain events, repository interfaces; NO external imports
infrastructure → Concrete implementations (Axios API Clients, LocalStorage); imports domain only
```

### Module structure

Every module follows:

```
src/
├── application/      # Commands, queries, handlers
├── domain/           # Aggregates, value objects, domain events, repository interfaces
├── infrastructure/   # Axios API clients, LocalStorage adapters
└── ui/               # Vue components, Views, Layouts, Router
```

---

## Development

```bash
# Start the development container (Vite)
make watch

# Install dependencies inside the container
make init
```

### Testing

```bash
make unit-tests          # Unit tests (Vitest)
make e2e-tests           # E2E tests (Playwright)
make tests               # Run all tests
```

### Security Audits

```bash
make audit       # Informational audit (for local development)
make audit-ci    # Strict audit with allowlist (for CI/CD)
```

---

## Commit & Pull Request Guidelines

Follow conventional-commit style: `<type>[scope]: <description>`

**Types:** `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `style`, `test`

**Scopes:** `core`, `ui`, `auth`, `shared`

**Format:** one-line only — no body, no footer. Example:

```
feat(ui): add dashboard layout with sidebar
fix(core): correct x-correlation-id interceptor
```

### Git Commit Rules

**NEVER use `git commit --no-verify` unless explicitly instructed by the user.**

## Security Checklist (per change)

- **No secrets in code**: credentials always come from environment variables validated by Zod at startup.
- **No sensitive data in logs**: never log personal data or sensitive content in plain form. Mask or omit any PII before logging.
- **Domain value objects enforce invariants**: use them; never bypass with raw primitives.
- **Exception details stay internal**: log internally; never show raw stack traces to the end user in the UI.

---

## Persistent Memory with Engram

At the start of each session, call `mem_current_project` to verify the detected project and `mem_context` to retrieve the context from previous sessions.
At the end of each session, call `mem_session_summary` with a summary of what was accomplished.

## Post-Compaction

If the context was compacted, immediately execute:

1. `mem_current_project` — confirm project
2. `mem_context` — retrieve context from previous sessions
3. `mem_search "current task"` — search for memory relevant to the work in progress
