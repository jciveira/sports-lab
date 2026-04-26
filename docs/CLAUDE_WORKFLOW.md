# Claude Code Workflow — HandBallLab

Project-specific workflow guide for running Claude Code sessions on HandBallLab.
For the generic version (adaptable to any project), see the [Confluence page](https://confluence.tools.3stripes.net/spaces/~civeijua/pages/1673911698/Claude+Code+Parallel+Session+Workflow).

## Session Types

| Session | Command | Model | Can run in parallel? |
|---------|---------|-------|----------------------|
| **Groom** | `/hbl-groom` | Sonnet | Yes (read-only) |
| **Dev** | `/hbl-dev-session` | Sonnet | Yes (worktrees) |
| **Test** | `/hbl-test-session` | Sonnet | **No — one at a time** |

## Model Strategy

**Default: Sonnet for all sessions.** Opus is reserved for specific high-reasoning tasks.

### When to use Sonnet (default)

- **Dev sessions** — specs are groomed, ACs are clear, pure implementation
- **Test sessions** — mechanical: run tests, verify ACs, merge, update docs
- **Groom sessions** — labeling, sizing, writing ACs for individual issues
- **Routine tasks** — commits, label changes, Confluence publishing, mirroring
- **Agent subagents** — always pass `model: "sonnet"` to Agent calls
- **File exploration** — use direct `Read`/`Grep`/`Glob` instead of Explore agents when target files are known

### When to use Opus (switch explicitly)

- **Architecture / new phase planning** — reasoning about trade-offs, system design, multi-component interactions
- **Debugging hard issues** — when root cause isn't obvious after initial Sonnet investigation
- **Code review of complex PRs** — catching subtle logic errors, security issues
- **Epic decomposition** — breaking a large epic into well-scoped stories during grooming

### How to switch

```bash
# In Claude Code CLI
/model opus    # switch to Opus for architecture/debugging
/model sonnet  # switch back when done with the hard thinking
```

### Rule of thumb

**Opus thinks, Sonnet builds.** If the task is "figure out *what* to do" → Opus. If the task is "do *what's already figured out*" → Sonnet.

### Cost context

A dev session using 2 Explore agents on Opus cost $28+ in cache reads (40M tokens). The same work with direct reads on Sonnet would have cost ~$2-3. Opus adds value only when reasoning quality matters more than throughput.

## Worktree Conventions

```bash
# Dev session — one worktree per issue
REPO=~/code/work/sandbox/adidas-ai-sandbox
ISSUE=42
BRANCH=feat/${ISSUE}-budget-view
WT=~/code/work/sandbox/handball-wt-${ISSUE}

git -C $REPO fetch origin main
git -C $REPO branch $BRANCH origin/main
git -C $REPO worktree add $WT $BRANCH
cd $WT/experiments/handball-lab && npm install

# Test session — separate worktree
WT_TEST=~/code/work/sandbox/handball-test-${ISSUE}
git -C $REPO fetch origin $BRANCH
git -C $REPO worktree add $WT_TEST $BRANCH
cd $WT_TEST/experiments/handball-lab && npm install
```

| Session | Worktree path | Example |
|---------|---------------|---------|
| Dev | `~/code/work/sandbox/handball-wt-<issue>/` | `handball-wt-45` |
| Test | `~/code/work/sandbox/handball-test-<issue>/` | `handball-test-45` |

## Label Pipeline

```
ready → in-progress → in-review → in-test → (closed)
```

- Dev checks for `in-progress` first, skips those
- Test claims all selected issues with `in-test` before testing
- On failure: remove `in-review` + `in-test`, add `needs-fix`
- **`batch:<group>`** — set by dev session when issues are coupled (share `App.tsx`, `src/types/index.ts`, main store, or build on each other). Signals test session to group them and use batch mode. Examples: `batch:admin-shell`, `batch:viewer-auth`

## Batch Testing (2+ connected issues)

When the test session picks 2+ issues, a conflict scan determines the testing mode before any worktrees are created.

### Conflict scan
```bash
git -C $REPO diff main...origin/$BRANCH --name-only  # run for each branch
```

| Condition | Mode | Per-issue | Once at §4 (acceptance gate) |
|---|---|---|---|
| Shared load-bearing files (`App.tsx`, `src/types/index.ts`, main store, `package.json`) | **Sequential** | Full suite incl. regression + responsive | — |
| No shared load-bearing files | **Batch** | build + unit + component + smoke (if new route) | regression + responsive |

`batch:` labels signal expected mode; conflict scan confirms or overrides. Announce mode + reason before proceeding.

### Parallel worktree setup
`git worktree add` must be sequential (git lock); `npm install` runs in parallel:
```bash
git -C $REPO worktree add ~/code/work/sandbox/handball-test-$ISSUE1 $BRANCH1
git -C $REPO worktree add ~/code/work/sandbox/handball-test-$ISSUE2 $BRANCH2

(cd ~/code/work/sandbox/handball-test-$ISSUE1/experiments/handball-lab && npm install) &
(cd ~/code/work/sandbox/handball-test-$ISSUE2/experiments/handball-lab && npm install) &
wait

cp $REPO/experiments/handball-lab/.env ~/code/work/sandbox/handball-test-$ISSUE1/experiments/handball-lab/.env
cp $REPO/experiments/handball-lab/.env ~/code/work/sandbox/handball-test-$ISSUE2/experiments/handball-lab/.env
```

### Dev responsibilities for connected issues
When an issue is coupled with another:
- Add `batch:<feature-group>` label to both: `gh issue edit <number> --repo jciveira/handball-lab --add-label "batch:admin-shell"`
- Note `Merge order: after #X` in the in-review comment

## Key Paths

- **Main repo**: `~/code/work/sandbox/adidas-ai-sandbox/` (stays on `main`)
- **Project subdir**: `experiments/handball-lab/`
- **GitHub issues**: `jciveira/handball-lab`
- **Test commands**: `npm test`, `npx tsc --noEmit`, `npx vite build`
- **E2E**: `npm run test:e2e`

## Doc Ownership

- **Dev session**: never touches README, ARCHITECTURE.md, GUIA_PADRES.md, or HelpPage.tsx
- **Test session**: updates all docs on main after merge
