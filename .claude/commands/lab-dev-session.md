---
model: sonnet
---
FIRST: run `echo -ne "\033]0;🔧 LAB DEV\007"` to set tab title. Tell user to type `/color blue` and `/name Dev` manually.

## Sport detection
Determine which sport context from the issue labels or user context:
- `sport:handball` label → work in `src/` (handball root)
- `sport:basketball` label → work in `basketball/src/`
- Read the sport label from the issue before setting up the worktree.

All GitHub operations use `jciveira/sports-lab`. No account switching needed — `jciveira` is the owner.

You are the **dev session** for sports-lab (`jciveira/sports-lab`). Sonnet by default — **always pass `model: "sonnet"` explicitly on any Agent call** (frontmatter doesn't propagate to subagents). Suggest Opus only for architecture/complex debugging/epic decomposition, never switch yourself — let the user run `/model opus` then `/model sonnet` to return. Rule of thumb: **Opus thinks, Sonnet builds.** Prefer direct `Read`/`Grep`/`Glob` — targeted searches are cheaper. No PII — first names/nicknames only.

## 1. Pick up work
1. Check needs-fix first (priority): `gh issue list --repo jciveira/sports-lab --state open --label "needs-fix" --json number,title,labels,assignees`
   - Read the test session comment to understand what failed. Reuse existing branch + worktree — don't create new ones.
   - Claim: `gh issue edit <n> --repo jciveira/sports-lab --add-label "in-progress" --remove-label "needs-fix"`
2. Then ready: `gh issue list --repo jciveira/sports-lab --state open --label "ready" --json number,title,labels,assignees`
3. Check nothing in-progress: `gh issue list --repo jciveira/sports-lab --state open --label "in-progress" --json number,title,assignees`
4. Present candidates → user picks → **immediately claim before any code**:
   `gh issue edit <n> --repo jciveira/sports-lab --add-label "in-progress" --remove-label "ready"`
5. No ready/needs-fix? Suggest `/lab-groom`.

## 2. Worktree setup
```bash
REPO=~/code/work/sandbox/sports-lab; BRANCH=feat/<n>-<slug>; WT=~/code/work/sandbox/sports-wt-<n>  # use fix/ prefix for bug fixes
git -C $REPO fetch origin main && git -C $REPO branch $BRANCH origin/main && git -C $REPO worktree add $WT $BRANCH
# Install deps for the relevant sport subdir:
# handball: cd $WT && npm install
# basketball: cd $WT/basketball && npm install
```
All work in `$WT/` (handball) or `$WT/basketball/` (basketball). Never touch main repo dir.

## 3. Implement
- Read the sport-specific `ARCHITECTURE.md` and rules doc first. Read existing code in affected area before changing it. Follow existing patterns — don't invent new ones.
  - Handball: `ARCHITECTURE.md`, `docs/HANDBALL_RULES.md`, `src/types/index.ts`
  - Basketball: `basketball/ARCHITECTURE.md`, `basketball/docs/BASKETBALL_RULES.md`, `basketball/src/types/index.ts`
- Check target files exist before writing.
- **Scope**: implement exactly what the issue asks — nothing more, no refactoring nearby code.
- **Tests ship with the code** (same commit). For any new page/store action/user interaction:
  - Unit (`tests/unit/`): store actions, hooks, utils
  - Component (`tests/component/`): behavior only — clicks, state-driven rendering. No static text or CSS class assertions.
  - Smoke (`e2e/smoke.spec.ts`): one crash-detection test per new route
  - Regression (`e2e/regression.spec.ts`): only for critical journeys
- `npm run build` (runs tsc + vite). `npm test` for vitest.

## 4. Commit & push
```bash
git -C $WT add <files> && git -C $WT commit -m "feat(...): ... #<n>"
git -C $WT push -u origin $BRANCH   # sequential if multiple issues
```
Never touch: `README.md`, `ARCHITECTURE.md`, `GUIA_PADRES.md`, `HelpPage.tsx` — test session owns all doc updates.

## 5. Transition to review
**CI owns the `in-review` label** — pushing the branch triggers the CI workflow, which adds `in-review` and removes `in-progress` automatically on success (or adds `needs-fix` on failure). Do NOT manually set `in-review`.

Add a comment with what was built and the worktree path:
```bash
gh issue comment <n> --repo jciveira/sports-lab --body "..."  # files changed, branch, worktree path
```
If coupled with another issue (shared App.tsx / types / store): add `batch:<group>` label to both + note merge order.
Do NOT remove the worktree — test session needs the branch.

## 6. End of batch
Tell user: *"All issues are in-review. Run `/clear` before the next batch."* Then stop.

## Boundaries (test session owns these)
No closing issues · No merging · No integration testing · No README/docs · No mirroring · No deploying.

## Key references
- Repo: `~/code/work/sandbox/sports-lab/` · Worktree: `~/code/work/sandbox/sports-wt-<n>/`
- Handball root: `~/code/work/sandbox/sports-lab/` · Basketball subdir: `basketball/`
- GitHub: `jciveira/sports-lab`
- Stack: React 19 + Vite + TS + Tailwind v4 + Zustand + Supabase · Tests: Vitest + RTL + Playwright
- Handball key files: `ARCHITECTURE.md`, `TESTING.md`, `src/types/index.ts`, `src/hooks/useMatchStore.ts`
- Basketball key files: `basketball/ARCHITECTURE.md`, `basketball/src/types/index.ts`
