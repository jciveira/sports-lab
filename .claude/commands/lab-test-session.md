---
model: sonnet
---
FIRST: run `echo -ne "\033]0;🧪 LAB TEST\007"` to set tab title. Tell user to type `/color red` and `/name TEST` manually.

## Sport detection
Determine which sport context from the issue's `sport:handball` or `sport:basketball` label before setting up any worktree:
- `sport:handball` → work inside the repo root (npm install there)
- `sport:basketball` → work inside `basketball/` subdir (npm install there)

All GitHub operations use `jciveira/sports-lab`. No account switching needed.

## MANDATORY: Cost control
- **Default model is Sonnet** (set via frontmatter). Subagents don't inherit this — always pass `model: "sonnet"` to Agent calls.
- **Prefer direct `Read`, `Grep`, `Glob`** over Agent/Explore subagents — targeted searches are faster and cheaper.
- **Suggest Opus when it matters**: if the conversation shifts to architecture decisions, complex debugging, or root-cause analysis that isn't obvious, proactively tell the user: _"This kind of reasoning benefits from Opus — consider `/model opus` for this part."_ Don't switch yourself; let the user decide.

You are the **single** tester session for sports-lab. Only one test session runs at a time — this avoids race conditions on main, README conflicts, and leaked uncommitted files. Process multiple issues sequentially within this session for speed.

## 1. Find issues in review and let user pick
- Search GitHub Issues: `gh issue list --repo jciveira/sports-lab --state open --label "in-review" --json number,title,labels,body`
- **Filter out** any issues that also have the `in-test` label — a previous test session may have left them
- Present the filtered list to the user and **ask which issues to test** (can be one or multiple)
- **Immediately after user confirms**, claim ALL selected issues by adding the `in-test` label to each:
  `gh issue edit <number> --repo jciveira/sports-lab --add-label "in-test"`
  Do this BEFORE switching branches or running any tests.

## 1.5 Batch setup (when testing 2+ issues)

When the user selects 2+ issues, run this block **before** the per-issue loop.

### Conflict scan — determines testing mode
```bash
REPO=~/code/work/sandbox/sports-lab
for BRANCH in $BRANCH1 $BRANCH2; do
  git -C $REPO fetch origin $BRANCH
  echo "=== $BRANCH ===" && git -C $REPO diff main...origin/$BRANCH --name-only
done
```

**Decision logic:**
- Shared load-bearing files (`App.tsx`, `src/types/index.ts`, main store files, `package.json`) → **Sequential mode**: run full per-issue suite including regression + responsive before each merge
- No shared load-bearing files → **Batch mode**: parallel setup, per-issue build+unit+component+smoke only, single regression+responsive at §4 as the acceptance gate

Also check `batch:` labels — if all selected issues share the same `batch:<group>` label (set by the dev session), batch mode is expected. The conflict scan confirms or overrides.

**Announce the chosen mode and the reason before proceeding.**

### Parallel worktree setup
`git worktree add` must be sequential (git lock), but `npm install` runs in parallel:
```bash
REPO=~/code/work/sandbox/sports-lab
# Create worktrees sequentially
git -C $REPO worktree add ~/code/work/sandbox/sports-test-$ISSUE1 $BRANCH1
git -C $REPO worktree add ~/code/work/sandbox/sports-test-$ISSUE2 $BRANCH2

# npm install in parallel (handball = root, basketball = basketball/)
(cd ~/code/work/sandbox/sports-test-$ISSUE1 && npm install) &
(cd ~/code/work/sandbox/sports-test-$ISSUE2 && npm install) &
wait

# Copy .env to all worktrees
cp $REPO/.env ~/code/work/sandbox/sports-test-$ISSUE1/.env
cp $REPO/.env ~/code/work/sandbox/sports-test-$ISSUE2/.env
```

## 2. Process each issue sequentially

For each confirmed issue, repeat steps 2a–2f, then proceed to the batch steps (3–5) once all issues are done.

**Batch mode**: skip regression + responsive in §2b — they run once as the mandatory acceptance gate in §4. Per-issue checks (build + unit + component + smoke) still run individually.

### 2a. Set up worktree for testing
- Read the issue comments to find the feature branch name: `gh issue view <number> --repo jciveira/sports-lab --json comments`
- Create a worktree:
  ```bash
  REPO=~/code/work/sandbox/sports-lab
  ISSUE=<number>
  BRANCH=<branch-from-comments>
  WT=~/code/work/sandbox/sports-test-${ISSUE}

  git -C $REPO fetch origin $BRANCH
  git -C $REPO worktree add $WT $BRANCH
  cd $WT && npm install   # or: cd $WT/basketball && npm install for basketball issues
  ```
- If the worktree already exists (dev session created it), use it directly — skip worktree add.
- **Copy `.env` from main repo to worktree** — worktrees don't inherit it and E2E tests will silently fail:
  ```bash
  cp $REPO/.env $WT/.env
  ```
- If branch name isn't in the comments, look for branches matching the issue number: `git -C $REPO branch -r | grep <number>`
- **Handball**: all testing inside `$WT/` · **Basketball**: all testing inside `$WT/basketball/`
- **Batch mode**: if §1.5 already created this worktree, skip the setup commands above and jump to §2a.5.

### 2a.5 Fast-path baseline before testing

Run these before classifying scope — fast, cheap, and catches the most common blockers early.

1. **Build first** (~30s, catches TypeScript errors immediately):
   ```bash
   cd $WT && npm run build   # or: cd $WT/basketball && npm run build
   ```
   If it fails → stop. Send back with `needs-fix`, include the TypeScript errors in the comment. No point running tests.

2. **Baseline test count on main** (establishes pre-existing failures):
   ```bash
   cd ~/code/work/sandbox/sports-lab
   npm test 2>&1 | grep -E "Tests |failed|passed" | tail -3
   ```
   Record the result. Any test failing on **both** main and the feature branch = pre-existing. Check the pitfalls list first — if already documented, skip immediately. If not documented: one fix attempt ≤5 min, then open a GitHub issue, add to pitfalls, and move on. Do not iterate.

### 2b. Assess scope and pick test strategy

Read the issue description and the files it touched. Classify the scope:

| Scope | What changed | Tests to run | Skip |
|-------|-------------|-------------|------|
| **Store/logic** | Zustand actions, hooks, utils, rules, lib/ | `npm run test:unit` | E2E |
| **Component** | React component in src/components/ or src/pages/ | `npm run test:unit` + `npm run test:component` | E2E |
| **New page/route** | New route added to router, new page file | `npm test` + `npm run test:smoke` | regression, match-flow |
| **Styling/responsive** | Tailwind classes, layout, CSS | `npm run test:smoke` + `npx playwright test e2e/responsive.spec.ts` | unit, component |
| **Full feature** | Store + component + page + new user journey | `npm run test:all` | nothing |
| **Infra/config** | Vite config, package.json, tsconfig, SW, manifest | `npm run build` + `npm run test:smoke` | unit, component |
| **Docs only** | README, GUIA_PADRES, HelpPage text | `npm run build` | all tests (just verify build) |

**Build already ran in §2a.5** — re-run `npm run build` only if you modified files during test writing.

State your classification and reasoning before running tests.

When in doubt, go one level broader — it's better to run an extra layer than miss a regression.

**Batch mode — E2E deferral**: in batch mode (decided in §1.5), skip regression + responsive for this issue. Run smoke only if this issue adds new routes. Regression + responsive run once at §4.

### 2c. Write new tests for untested functionality
- **Check what the dev shipped first**: `git log origin/$BRANCH --oneline` and `git show origin/$BRANCH -- tests/ e2e/` — if the dev wrote tests for the new functionality, just run them. Only write new tests for gaps. If you're writing tests for things the dev should have covered, note it explicitly in the issue comment.
- **Read `TESTING.md` first** — it defines the test pyramid, viewport strategy, and anti-patterns to avoid
- Read the issue description to understand what was built
- Read all source files referenced in the issue
- Check if existing tests cover the new/changed behavior
- **Before writing any Vitest mocks**: read the adjacent test files in the same directory first — copy an existing `vi.mock` pattern, never write one from scratch. The wrong mock can cause a 15-minute worker hang (see pitfalls).
- Follow existing patterns in the test files
- **Where to add tests** (test pyramid — prefer higher layers only when lower layers can't cover it):
  - **Unit tests** (`tests/unit/`): new store actions, config changes, hooks, utility functions
  - **Component tests** (`tests/component/`): interactive behavior ONLY — button clicks, form validation, state-driven conditional rendering. Do NOT add static text assertions, CSS class checks, or mirror negative tests (see `TESTING.md` anti-patterns)
  - **Smoke tests** (`e2e/smoke.spec.ts`): new pages/routes — one test per route: goto + check key element + no console errors. Runs on Desktop only.
  - **Regression tests** (`e2e/regression.spec.ts`): new critical user journeys — golden paths that must never break. Runs on Mobile + Desktop (2 viewports).
- **Viewport strategy** (configured in `playwright.config.ts`):
  - Smoke: Desktop Chrome only (1 viewport)
  - Regression: Pixel 7 + Desktop Chrome (2 viewports)
  - Responsive: Pixel 7 + iPhone SE + Desktop Chrome (3 viewports)
- When mocking Supabase in E2E, use `page.route('**/rest/v1/<table>**', ...)` — see `regression.spec.ts` for pattern
- WebKit (iPhone SE) quirk: set up route mocks before `page.goto()`, and prefer direct navigation over SPA clicks when mocks are involved

### 2d. Commit new tests to the feature branch
```bash
cd $WT
git add tests/ e2e/
git commit -m "test: add tests for #<number>"
```

### 2e. Merge to main
```bash
REPO=~/code/work/sandbox/sports-lab
cd $REPO
git checkout main
git pull origin main
git merge --no-ff $BRANCH -m "merge: <short description> #<number>"
```
- If merge conflicts occur, resolve them, re-run the relevant tests, then commit
- **Post-merge dependency check**: `git diff HEAD~1 -- package.json` — verify no unexpected version changes
- Run `npm run build` to confirm merged state builds
- **Push main immediately**: `git push origin main` — push right after each merge before doing anything else
- Delete the feature branch: `git branch -d $BRANCH && git push origin --delete $BRANCH`
- **Clean up worktrees**:
  ```bash
  git -C $REPO worktree remove ~/code/work/sandbox/sports-test-${ISSUE} 2>/dev/null
  git -C $REPO worktree remove ~/code/work/sandbox/sports-wt-${ISSUE} 2>/dev/null
  ```

### 2f. Close the issue
- Close: `gh issue close <number> --repo jciveira/sports-lab --comment "Tested and verified"`
- Remove labels: `gh issue edit <number> --repo jciveira/sports-lab --remove-label "in-review" --remove-label "in-test"`
- Add a comment with:
  - What was verified (bullet list)
  - Scope classification used (e.g. "Store/logic → unit + build")
  - Test results: which layers ran and pass count (e.g. "unit: 153/153, build: clean")
  - Number of new tests added (if any)
- If an issue fails testing, remove "in-review" and "in-test", add "needs-fix", and comment with:
  - What was tested and what failed or was missing
  - Exactly what the dev needs to do to pass review (checklist)
  - Relevant context: file paths, components, related issues
- **Then proceed to the next issue (back to 2a) or to the batch steps if all issues are done.**

## 3. Update documentation (once, after all issues merged)
- Update `README.md`: feature checklist, test counts, coverage table
- Update `docs/GUIA_PADRES.md` if any user-facing flow changed (Spanish parent guide)
- Update `src/pages/HelpPage.tsx` to match GUIA_PADRES.md content (in-app help must stay in sync)
- Update `ARCHITECTURE.md` if design decisions evolved during implementation
- Update memory files if new patterns or conventions were discovered

## 4. Final commit and push
- Run `npm run test:all` — mandatory acceptance gate. In batch mode, regression + responsive run here for the first time; they are blocking.
- Stage and commit ALL remaining changes: README, docs, any fixups
- Commit message: `docs: update README + test counts for #N #M`
- Push: `git push origin main`
- Do NOT end the session with uncommitted work

## 5. Mirror to personal repo (once, at the end)
- Mirror **once** after all issues are merged and docs are committed — not per-issue
- Follow mandatory rules:
  - Scan for PII/adidas references before mirroring
  - Use temp dir with orphan commit, personal git identity (`jciveira <jonlecarre@gmail.com>`)
  - **Run `npm ci && npm run build` in the temp dir before pushing** — catches dependency issues Vercel would hit
  - If the clean build fails, fix the issue on main first, then re-mirror
  - Push to `git@github-personal:jciveira/handball-lab.git`

## 6. Bug fix protocol
When a bug is found:
1. **Root-cause the test gap first** — before fixing anything, ask: why did existing tests miss this?
2. **Update the test suite to close the gap** — strengthen the layer that was weak
3. **Add a regression test** that reproduces the specific bug scenario
4. Fix the bug in the source code
5. Verify `npm run test:all` passes
6. Commit test improvements + bug fix together in one commit
7. **Update "Common pitfalls" below** if the root cause reveals a new pattern worth documenting

### Common pitfalls to test for
- **Missing imports**: TypeScript catches most, but runtime errors in lazy-loaded routes can slip through
- **Null/undefined state**: Zustand store accessed before initialization
- **Responsive layout**: E2E runs on 3 viewports — iPhone SE (375px) is the tightest constraint
- **Touch targets**: Buttons must be at least 44x44px for game-time usability
- **WebKit route mocks**: `page.route()` must be set before navigation; SPA-internal navigation can race with mocks on WebKit
- **Supabase data in E2E**: Tests hit real Supabase — mock API routes when you need deterministic data (teams, matches)
- **Placeholder/text mismatches**: Always check actual component text before writing locators — don't assume
- **Silent dependency drift on merge**: Git can auto-merge `package.json` and take a feature branch's dependency versions over main's. Always diff `package.json` after merge. Vite is pinned with tilde (`~`) to prevent major version jumps that break `vite-plugin-pwa`
- **`vi.mock` Supabase worker hang**: `vi.mock('../../src/lib/supabase', ...)` with `{ from: vi.fn() }` causes vitest worker to hang. Use `supabase: {}` (empty object) + pre-populate Zustand store via `setState()` so fetch never gets called.
- **`.env` not in worktree**: Always `cp $REPO/.env $WT/.env` at worktree setup. Without it, E2E tests that hit Supabase will silently time out (30s per test).
- **BugReportButton on Mobile**: Button is `fixed bottom-20 right-4`. If E2E tests on Pixel 7 fail to click the `Más` tab due to overlap, use `page.goto('/mas')` directly.

## Test scripts reference
| Script | What it runs |
|--------|-------------|
| `npm test` | All vitest tests (unit + component) |
| `npm run test:unit` | Unit tests only |
| `npm run test:component` | Component tests only |
| `npm run test:e2e` | Full Playwright suite |
| `npm run test:smoke` | Smoke tests only |
| `npm run test:regression` | Regression tests only |
| `npm run test:all` | Everything: vitest + playwright |
| `npm run test:watch` | Vitest in watch mode (for dev) |

## Key references
- Main repo: `~/code/work/sandbox/sports-lab/` (stays on `main`)
- Worktree: `~/code/work/sandbox/sports-test-<issue>/`
- GitHub: `jciveira/sports-lab`
- Handball root: `~/code/work/sandbox/sports-lab/` · Basketball: `basketball/`
- Architecture: `ARCHITECTURE.md` (handball) · `basketball/ARCHITECTURE.md`
- Types: `src/types/index.ts` (handball) · `basketball/src/types/index.ts`
- State: `src/hooks/useMatchStore.ts`
- Testing strategy: `TESTING.md`
- Parent guide: `docs/GUIA_PADRES.md` + `src/pages/HelpPage.tsx` (must stay in sync)
- Stack: React 19 + Vite + TypeScript + Tailwind v4 + Zustand + Supabase
- Test stack: Vitest + @testing-library/react + Playwright
