# Source Code Guidelines — mybandnow-web

## ⛔ HARD GATES — NEVER skip these

These are mandatory stops, not suggestions. An agent that skips any gate is operating outside the rules of this project.

Skills are loaded **lazily** — only when the corresponding gate is reached, not at session start.

### Gate 1 — Before writing any production code

When about to write code for the first time in a task:

1. READ `.agents/skills/tdd/SKILL.md`
2. Output this block before writing a single line of code:

```
## Pre-implementation gate
- tdd skill loaded: ✅ .agents/skills/tdd/SKILL.md
- Failing test planned: <file path and test description>
```

Do NOT proceed to implementation until this block is visible in the conversation.

### Gate 2 — Before proposing any commit

When about to propose or apply a commit:

1. Run `make unit-tests` — confirm 0 failures before proposing.
2. READ `.agents/skills/commit/SKILL.md` — group changes by work unit
3. Output this block before proposing any commit message:

```
## Pre-commit gate
- Unit tests: ✅ X passed, 0 failed
- commit skill loaded: ✅ .agents/skills/commit/SKILL.md
- Proposed commits: <N blocks listed below>
```

Do NOT apply any commit until the user approves the proposed blocks.

---

> **Skills Reference**: For detailed patterns, use these skills:
>
> - [`tdd`](../.agents/skills/tdd/SKILL.md) — Test-Driven Development workflow
> - [`test-unit`](../.agents/skills/test-unit/SKILL.md) — Unit testing using vitest-mock-extended and Object Mothers
> - [`typescript`](../.agents/skills/typescript/SKILL.md) — TypeScript types and interfaces
> - [`zod-4`](../.agents/skills/zod-4/SKILL.md) — Environment variable schema validation
> - [`hexagonal-feature`](../.agents/skills/hexagonal-feature/SKILL.md) — Full vertical slice: domain + application + infrastructure
> - [`object-mother`](../.agents/skills/object-mother/SKILL.md) — Object Mothers, TestCase, Mock patterns
> - [`jira-confluence`](../.agents/skills/jira-confluence/SKILL.md) — Jira issues, Confluence sync, and branch task mapping
> - [`living-blueprint`](../.agents/skills/living-blueprint/SKILL.md) — Maintain docs/ and Confluence in sync after every feature merge

---

## CRITICAL RULES — NON-NEGOTIABLE

### Domain Layer (`src/domain/`)

- **ALWAYS**: validate invariants in value object constructors; throw exceptions on violation.
- **ALWAYS**: use value objects — never pass raw primitives across domain boundaries.
- **ALWAYS**: declare repository interfaces (e.g. `BandRepository`) here.
- **NEVER**: import from `application/`, `infrastructure/`, or `ui/` inside `domain/`.
- **NEVER**: call external APIs from domain classes.

### Application Layer (`src/application/`)

- **ALWAYS**: create one Use Case class per user action (e.g., `GetBandsUseCase`).
- **ALWAYS**: inject repository interfaces from `domain/` — never concrete implementations.
- **NEVER**: import from `infrastructure/` or `ui/` inside `application/`.

### Infrastructure Layer (`src/infrastructure/`)

- **ALWAYS**: implement the domain repository interface using Axios (e.g., `AxiosBandRepository`).
- **ALWAYS**: map Axios responses to Domain Entities/Value Objects.
- **NEVER**: import from `ui/` inside `infrastructure/`.

### UI Layer (`src/ui/`)

- **ALWAYS**: use standard Vue 3 Composition API (`<script setup>`).
- **ALWAYS**: inject use cases into components/Pinia stores rather than calling Axios directly.
- **NEVER**: import repositories directly into components. The component calls the Use Case or Store.

---

## DECISION TREES

### Adding a new view/feature

```
1. Model the domain (Entities, Value Objects, Repository Interface) in src/domain/<module>/
2. Write the Use Case in src/application/<module>/
3. Write the Axios implementation in src/infrastructure/<module>/
4. Wire it to Vue in src/ui/views/<module>/ and configure the router.
```

### Adding a new external provider

```
1. Create the API client adapter in src/infrastructure/http/
2. Ensure the global `httpClient.ts` is used so x-correlation-id is injected.
```

---

## TECH STACK

| Concern        | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Runtime        | Node.js 24 / TypeScript 5.4                              |
| UI Framework   | Vue 3 (Composition API) + Vite                           |
| Styling        | Bootstrap 5                                              |
| State Mgmt     | Pinia                                                    |
| HTTP Client    | Axios                                                    |
| Env validation | Zod                                                      |
| Tests          | Vitest (Unit) / Playwright (E2E)                         |

---

## PROJECT STRUCTURE

```
src/
├── domain/           # 1. CORE PURO: Modelos, Value Objects e Interfaces.
├── application/      # 2. CASOS DE USO: Orquestan el dominio.
├── infrastructure/   # 3. ADAPTADORES: Implementaciones con Axios.
└── ui/               # 4. PRESENTACIÓN: Vue.js, Componentes, Layouts, Router.
```

---

## NAMING CONVENTIONS

| Entity                                | Pattern                               | Example                                                                                                      |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Aggregate/Entity                      | `<Name>`                              | `Band`, `Song`                                                                                               |
| Value object                          | `<Aggregate><Concept>`                | `BandId`, `BandName`                                                                                         |
| Repository interface                  | `<Aggregate>Repository`               | `BandRepository`                                                                                             |
| Repository implementation             | `Axios<Aggregate>Repository`          | `AxiosBandRepository`                                                                                        |
| Use case                              | `<Action><Aggregate>UseCase`          | `CreateBandUseCase`, `GetBandsUseCase`                                                                       |
| Vue Component                         | `<Name>Component.vue`                 | `BandListComponent.vue`                                                                                      |
| Vue View                              | `<Name>View.vue`                      | `BandsView.vue`                                                                                              |
| Pinia Store                           | `use<Name>Store`                      | `useBandsStore`                                                                                              |

---

## COMMANDS

```bash
# Start dev server
make watch

# Run unit tests
make unit-tests

# E2E tests (Playwright)
make e2e-tests
```

---

## QA CHECKLIST

- [ ] Domain logic uses Value Objects and respects invariants.
- [ ] No Vue, Axios, or Browser API imports (`window`, `localStorage`) inside `domain/` or `application/`.
- [ ] UI components only orchestrate and display; complex logic is delegated to `application/`.
- [ ] Axios calls correctly use `httpClient` and include the `x-correlation-id` interceptor.
