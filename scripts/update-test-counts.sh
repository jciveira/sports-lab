#!/usr/bin/env bash
#
# Update test counts in README.md and TESTING.md by running the test suite.
# Usage: npm run test:counts   (or: cd experiments/handball-lab && bash scripts/update-test-counts.sh)
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Counting tests ==="

echo "  Unit tests..."
UNIT_COUNT=$(npx vitest run tests/unit/ 2>&1 | grep -oE 'Tests\s+[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
echo "  → $UNIT_COUNT"

echo "  Component tests..."
COMPONENT_COUNT=$(npx vitest run tests/component/ 2>&1 | grep -oE 'Tests\s+[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
echo "  → $COMPONENT_COUNT"

echo "  Smoke E2E..."
SMOKE_RUNS=$(npx playwright test e2e/smoke.spec.ts 2>&1 | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
echo "  → $SMOKE_RUNS runs"

echo "  Regression E2E..."
REGRESSION_RUNS=$(npx playwright test e2e/regression.spec.ts 2>&1 | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
echo "  → $REGRESSION_RUNS runs"

echo "  Responsive E2E..."
RESPONSIVE_RUNS=$(npx playwright test e2e/responsive.spec.ts 2>&1 | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | head -1)
echo "  → $RESPONSIVE_RUNS runs"

# Smoke runs on 1 viewport, regression on 2, responsive on 3
SMOKE_TESTS=$SMOKE_RUNS
REGRESSION_TESTS=$((REGRESSION_RUNS / 2))
RESPONSIVE_TESTS=$((RESPONSIVE_RUNS / 3))

PW_TOTAL=$((SMOKE_RUNS + REGRESSION_RUNS + RESPONSIVE_RUNS))
VITEST_TOTAL=$((UNIT_COUNT + COMPONENT_COUNT))
GRAND_TOTAL=$((VITEST_TOTAL + PW_TOTAL))

TODAY=$(date +%Y-%m-%d)

echo ""
echo "=== Results ==="
echo "Unit:       $UNIT_COUNT"
echo "Component:  $COMPONENT_COUNT"
echo "Vitest:     $VITEST_TOTAL"
echo "Smoke:      $SMOKE_TESTS tests × 1 = $SMOKE_RUNS runs"
echo "Regression: $REGRESSION_TESTS tests × 2 = $REGRESSION_RUNS runs"
echo "Responsive: $RESPONSIVE_TESTS tests × 3 = $RESPONSIVE_RUNS runs"
echo "Playwright: $PW_TOTAL runs"
echo "Grand total: $GRAND_TOTAL"
echo ""

# Update README.md summary line
sed -i '' "s/\*\*Current coverage\*\*:.*/\*\*Current coverage\*\*: ${GRAND_TOTAL} tests (${VITEST_TOTAL} vitest + ${PW_TOTAL} Playwright)/" README.md

# Update README.md table rows (preserve the "What's covered" column)
sed -i '' "s/| Unit | ~[0-9]* | [0-9]* |/| Unit | ~${UNIT_COUNT} | ${UNIT_COUNT} |/" README.md
sed -i '' "s/| Component | ~[0-9]* | [0-9]* |/| Component | ~${COMPONENT_COUNT} | ${COMPONENT_COUNT} |/" README.md
sed -i '' "s/| Smoke E2E | [0-9]* | [0-9]* |/| Smoke E2E | ${SMOKE_TESTS} | ${SMOKE_RUNS} |/" README.md
sed -i '' "s/| Regression E2E | [0-9]* | [0-9]* |/| Regression E2E | ${REGRESSION_TESTS} | ${REGRESSION_RUNS} |/" README.md
sed -i '' "s/| Responsive E2E | [0-9]* | [0-9]* |/| Responsive E2E | ${RESPONSIVE_TESTS} | ${RESPONSIVE_RUNS} |/" README.md

# Update TESTING.md counts
sed -i '' "s/## Test Counts (as of .*)/## Test Counts (as of ${TODAY})/" TESTING.md
sed -i '' "s/| Unit | ~[0-9]* | [0-9]* |/| Unit | ~${UNIT_COUNT} | ${UNIT_COUNT} |/" TESTING.md
sed -i '' "s/| Component | ~[0-9]* | [0-9]* |/| Component | ~${COMPONENT_COUNT} | ${COMPONENT_COUNT} |/" TESTING.md
sed -i '' "s/| Smoke E2E | [0-9]* | [0-9]* |/| Smoke E2E | ${SMOKE_TESTS} | ${SMOKE_RUNS} |/" TESTING.md
sed -i '' "s/| Regression E2E | [0-9]* | [0-9]* |/| Regression E2E | ${REGRESSION_TESTS} | ${REGRESSION_RUNS} |/" TESTING.md
sed -i '' "s/| Responsive E2E | [0-9]* | [0-9]* |/| Responsive E2E | ${RESPONSIVE_TESTS} | ${RESPONSIVE_RUNS} |/" TESTING.md
sed -i '' "s/| \*\*Total\*\* | \*\*~[0-9]*\*\* | \*\*~[0-9]*\*\* |/| **Total** | **~${VITEST_TOTAL}** | **~${GRAND_TOTAL}** |/" TESTING.md

echo "✓ Updated README.md and TESTING.md"
