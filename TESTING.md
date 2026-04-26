# HandBallLab Testing Strategy

## Test Pyramid

```
         ┌─────────────┐
         │  Responsive  │  5 tests × 3 viewports = 15 runs
         │  (layout)    │  Mobile, iPhone SE, Desktop
         ├─────────────┤
         │  Regression  │  14 tests × 2 viewports = 28 runs
         │  (journeys)  │  Mobile, Desktop
         ├─────────────┤
         │    Smoke     │  12 tests × 1 viewport = 12 runs
         │  (crashes)   │  Desktop only
    ┌────┴─────────────┴────┐
    │     Component tests    │  ~100 tests
    │   (interactions only)  │  jsdom, no browser
    ├───────────────────────┤
    │      Unit tests        │  ~200 tests
    │   (logic, state, rules)│  pure functions
    ├───────────────────────┤
    │   Integration tests    │  ~10 tests
    │  (DB write-path smoke) │  real Supabase, local only
    └───────────────────────┘
```

## Layers and What They Test

### Integration (`tests/integration/` — `npm run test:integration`)

Hits the **real Supabase DB** — requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`. Not run in CI.

Covers:

- **Schema smoke**: SELECT expected columns with `limit(0)` — fails immediately if a migration is missing
- **Write smoke**: calls `syncMatchToServer` with real store state and asserts the DB row matches
- **Event type smoke**: inserts a `match_events` row for each known type (including `exclusion_end`) and asserts no constraint violation
- Tests create and clean up their own fixtures in `beforeAll`/`afterAll`

**When to run**: before marking any scorekeeper-touching issue as `in-review`. A single run catches the class: "code writes field X → DB doesn't have column X → upsert silently fails."

**What does NOT belong here**: component behaviour, store logic, UI rendering — those go in unit/component layers where mocking is appropriate.

---

### Unit (`tests/unit/` — `npm run test:unit`)

Pure logic with no rendering. Covers:

- **Zustand store actions**: score, clock, half transitions, timeouts, exclusions, penalties, config
- **Game rules**: `rules.ts` config presets, validation
- **Hooks**: `usePwaInstall`, `usePlayersStore`, `useTeamsStore`, `useTournamentStore`
- **Utilities**: formatting, session management, access control

**What belongs here**: anything that takes input and returns output without touching React or the DOM.

**What does NOT belong here**: TypeScript type checks (the compiler already validates these), static text assertions, CSS class checks.

### Component (`tests/component/` — `npm run test:component`)

React component rendering via `@testing-library/react` in jsdom. Tests **interactive behavior**:

- Button clicks that trigger state changes or callbacks
- Form validation (disabled states, error messages on invalid input)
- Conditional rendering driven by store state (role-based visibility, status-dependent UI)
- Multi-step flows (open modal → fill → submit → confirmation)

**What belongs here**: tests where user interaction changes what's on screen.

**What does NOT belong here**:
- Static text rendering ("shows title") — smoke tests catch crashes; if the text renders at all, it works
- CSS class assertions — use responsive E2E for layout
- Loading/error states that just display a string — one test per pattern is enough, not one per page
- Negative-case mirrors ("shows X" + "does not show X when Y") — keep the more interesting case

### Smoke E2E (`e2e/smoke.spec.ts` — `npm run test:smoke`)

Runs on **Desktop Chrome only**. Pure crash detection:

- Navigate to page
- Assert one key element exists
- Verify no console errors

Every routable page gets one smoke test. No behavioral assertions, no form filling, no navigation flows.

### Regression E2E (`e2e/regression.spec.ts` — `npm run test:regression`)

Runs on **Mobile + Desktop** (2 viewports). Golden-path user journeys:

- Full match lifecycle (create → play → halftime → finish)
- Cancel match with confirmation
- Timeout and exclusion controls
- Score reset flow
- Navigation between pages
- Form validation (join page, new match, tournament wizard)
- Help page content

These are the flows that must never break. If a new feature adds a critical user journey, add it here.

### Responsive E2E (`e2e/responsive.spec.ts`)

Runs on **3 viewports** (Mobile, iPhone SE, Desktop). Layout-only checks:

- No horizontal scrollbar
- Interactive elements visible without scrolling
- Touch targets ≥ 44px
- Content fits within viewport

Only visual/layout assertions belong here. Never test behavior or text content in responsive tests.

## Viewport Strategy

| Spec file | Viewports | Rationale |
|-----------|-----------|-----------|
| `smoke.spec.ts` | Desktop only | Crash detection doesn't need multiple viewports |
| `regression.spec.ts` | Mobile + Desktop | Behavioral tests on the two extreme breakpoints |
| `responsive.spec.ts` | Mobile + iPhone SE + Desktop | Layout must work everywhere, iPhone SE (375px) is tightest |

This is configured in `playwright.config.ts` via 6 named projects. Do not add catch-all projects that run all specs on all viewports.

## Anti-Patterns to Avoid

### 1. Testing TypeScript types at runtime
```typescript
// BAD: TypeScript already validates this at compile time
it('supabase client has correct type', () => {
  expect(typeof supabase.from).toBe('function')
})
```

### 2. Static text rendering assertions in component tests
```typescript
// BAD: if the page renders at all, the title is there. Smoke test catches this.
it('shows page title', () => {
  render(<MyPage />)
  expect(screen.getByText('My Title')).toBeInTheDocument()
})

// GOOD: test the interaction, not the label
it('submit button disabled until form valid', async () => {
  render(<MyPage />)
  expect(screen.getByText('Submit')).toBeDisabled()
  await user.type(input, 'valid data')
  expect(screen.getByText('Submit')).not.toBeDisabled()
})
```

### 3. Running non-visual tests on 3 viewports
```typescript
// BAD: behavioral test in responsive.spec.ts → runs 3x for no reason
test('clicking save calls API', ...)

// GOOD: put behavioral tests in regression.spec.ts (2 viewports)
// or component tests (0 browser overhead)
```

### 4. Mirror negative tests
```typescript
// BAD: two tests that are logical inverses
it('shows cancel button for operators', ...)
it('hides cancel button for non-operators', ...)

// GOOD: one test covering the interesting conditional
it('shows cancel button only for operators during active game', ...)
```

### 5. One test per loading/error/empty state per page
```typescript
// BAD: 3 tests × 15 pages = 45 tests that all do the same thing
it('shows loading state', ...)
it('shows error state', ...)
it('shows empty state', ...)

// GOOD: keep these only for pages with non-trivial state handling
// Smoke tests already verify pages don't crash
```

## When to Add Tests

| Change type | Test layer | Skip |
|------------|-----------|------|
| Store action / hook / util | Unit | E2E |
| React component interaction | Component | E2E |
| New page / route | Smoke + component if interactive | Responsive (unless layout-specific) |
| Styling / responsive | Responsive E2E | Unit, component |
| Full feature (store + UI + route) | Unit + component + regression | Nothing |
| Infra / config | `npm run build` + smoke | Unit, component |
| DB schema change / scorekeeper sync | Integration | E2E |
| Docs only | `npm run build` | All tests |

## Running Tests

| Command | What it runs | When to use |
|---------|-------------|-------------|
| `npm test` | All vitest (unit + component) | After any code change |
| `npm run test:unit` | Unit tests only | After store/logic changes |
| `npm run test:component` | Component tests only | After UI changes |
| `npm run test:e2e` | Full Playwright suite | Before merge |
| `npm run test:smoke` | Smoke only | After adding routes |
| `npm run test:regression` | Regression only | After touching user journeys |
| `npm run test:all` | Everything | Before merge to main |
| `npm run test:integration` | Integration tests (real DB) | Before marking scorekeeper issues in-review |
| `npm run build` | TypeScript + Vite build | Always (catches type errors) |
| `npm run test:counts` | Run all + update README/TESTING.md counts | After adding/removing tests |

## Cross-Cutting Changes and E2E Impact

Some changes affect many routes at once — auth gates, layout wrappers, routing restructures, global middleware. These are easy to miss because unit and component tests pass, but E2E tests break across the board.

**Before merging a cross-cutting change**, grep the E2E specs for affected patterns:

| Change | Grep for | Why |
|--------|----------|-----|
| New auth gate / guard | `page.goto('/admin` | All protected routes need auth setup before navigation |
| Route restructure | `page.goto('` | Any renamed/moved route breaks smoke + regression |
| Global layout wrapper | `getByText`, `getByRole` | New DOM wrappers can break locators |
| New modal / overlay | `toBeVisible` | Global overlays can obscure elements E2E tests expect to find |

**Admin auth in E2E**: Use the shared `authenticateAdmin(page)` helper from `e2e/helpers.ts` instead of inline `sessionStorage.setItem`. This gives a single place to update if the auth mechanism changes.

```typescript
import { authenticateAdmin } from './helpers'

test('admin page loads', async ({ page }) => {
  await authenticateAdmin(page)
  await page.goto('/admin/new-match')
  // ...
})
```

## Test Counts (as of 2026-03-30)

| Layer | Tests | Runs |
|-------|-------|------|
| Unit | ~230 | 230 |
| Component | ~144 | 144 |
| Smoke E2E | 16 | 16 |
| Regression E2E | 13 | 26 |
| Responsive E2E | 5 | 15 |
| **Total** | **~374** | **~431** |

Previous total was ~558 runs. Reduced by ~36% by eliminating redundant viewport multiplication, static text assertions, type-testing-at-runtime, and mirror negative tests.
