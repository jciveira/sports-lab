#!/usr/bin/env bash
# check-deploy.sh — Poll Vercel deployment status for the latest commit on jciveira/handball-lab
# Usage: ./scripts/check-deploy.sh [commit_sha] [timeout_seconds]
# Defaults: HEAD commit, 300s timeout

set -euo pipefail

REPO="jciveira/handball-lab"
COMMIT="${1:-$(git rev-parse HEAD)}"
TIMEOUT="${2:-300}"
INTERVAL=15

echo "🔍 Checking deploy status for $REPO @ ${COMMIT:0:7}"
echo "   Polling every ${INTERVAL}s, timeout ${TIMEOUT}s"
echo ""

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT" ]; do
  # Get deployment statuses for this commit
  result=$(gh api "repos/$REPO/commits/$COMMIT/status" --jq '{state: .state, statuses: [.statuses[] | {context: .context, state: .state, description: .description, target_url: .target_url}]}' 2>/dev/null || echo '{"state":"pending","statuses":[]}')

  state=$(echo "$result" | jq -r '.state')

  # Check for Vercel-specific statuses
  vercel_status=$(echo "$result" | jq -r '[.statuses[] | select(.context | test("vercel|deployment"; "i"))] | first // empty')

  if [ -n "$vercel_status" ]; then
    vercel_state=$(echo "$vercel_status" | jq -r '.state')
    vercel_desc=$(echo "$vercel_status" | jq -r '.description // "no description"')
    vercel_url=$(echo "$vercel_status" | jq -r '.target_url // "n/a"')

    case "$vercel_state" in
      success)
        echo "✅ Deploy succeeded!"
        echo "   Commit:  ${COMMIT:0:7}"
        echo "   Status:  $vercel_desc"
        echo "   URL:     $vercel_url"
        exit 0
        ;;
      failure|error)
        echo "❌ Deploy FAILED!"
        echo "   Commit:  ${COMMIT:0:7}"
        echo "   Status:  $vercel_desc"
        echo "   URL:     $vercel_url"
        echo ""
        echo "   Check Vercel dashboard for full error log."
        exit 1
        ;;
      pending)
        # Still deploying, continue polling
        ;;
    esac
  fi

  # Also check GitHub deployments API (Vercel uses this too)
  deploy_result=$(gh api "repos/$REPO/deployments?sha=$COMMIT&per_page=1" --jq '.[0] // empty' 2>/dev/null || echo '')

  if [ -n "$deploy_result" ]; then
    deploy_id=$(echo "$deploy_result" | jq -r '.id')
    latest_status=$(gh api "repos/$REPO/deployments/$deploy_id/statuses?per_page=1" --jq '.[0] // empty' 2>/dev/null || echo '')

    if [ -n "$latest_status" ]; then
      ds_state=$(echo "$latest_status" | jq -r '.state')
      ds_desc=$(echo "$latest_status" | jq -r '.description // "no description"')
      ds_url=$(echo "$latest_status" | jq -r '.environment_url // .target_url // "n/a"')

      case "$ds_state" in
        success)
          echo "✅ Deploy succeeded!"
          echo "   Commit:  ${COMMIT:0:7}"
          echo "   Status:  $ds_desc"
          echo "   URL:     $ds_url"
          exit 0
          ;;
        failure|error)
          echo "❌ Deploy FAILED!"
          echo "   Commit:  ${COMMIT:0:7}"
          echo "   Status:  $ds_desc"
          echo "   URL:     $ds_url"
          echo ""
          echo "   Check Vercel dashboard for full error log."
          exit 1
          ;;
        inactive|pending|queued|in_progress)
          # Still deploying, continue polling
          ;;
      esac
    fi
  fi

  printf "   ⏳ Waiting... (%ds / %ds)\r" "$elapsed" "$TIMEOUT"
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo ""
echo "⚠️  Timeout after ${TIMEOUT}s — deploy status still pending."
echo "   Commit: ${COMMIT:0:7}"
echo "   Check manually: https://vercel.com/dashboard"
exit 2
