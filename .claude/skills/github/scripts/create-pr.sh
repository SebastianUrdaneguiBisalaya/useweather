#!/usr/bin/env bash
# Validates a pull request and, only if valid, creates it with `gh pr create`.
# Usage: create-pr.sh --title "<title>" --body-file <file>
# The PR always targets main and is opened from the current branch.
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
title=""; body=""
while (( $# )); do
  case "$1" in
    --title) title="${2:-}"; shift 2 ;;
    --body-file) body="${2:-}"; shift 2 ;;
    *) echo "usage: $0 --title \"<title>\" --body-file <file>" >&2; exit 2 ;;
  esac
done
[[ -n "$title" && -n "$body" ]] || { echo "usage: $0 --title \"<title>\" --body-file <file>" >&2; exit 2; }

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "main" ]]; then
  echo "FAILED: open the PR from a work branch, not from main" >&2; exit 1
fi
if printf '%s\n' "$title" | grep -qiE 'co-authored-by|generated (with|by)|🤖|noreply@anthropic\.com'; then
  echo "FAILED: agent attribution is not allowed in the title" >&2; exit 1
fi
types="feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"
[[ "$title" =~ ^(${types})(\([a-z0-9._/-]+\))?!?:\ [^[:space:]] ]] || {
  echo "FAILED: title must be 'type(scope): subject' (types: ${types//|/, })" >&2; exit 1; }

"$dir/validate-pr.sh" "$body"
"$dir/guard-gh.sh" "gh pr create"
exec gh pr create --base main --title "$title" --body-file "$body"
