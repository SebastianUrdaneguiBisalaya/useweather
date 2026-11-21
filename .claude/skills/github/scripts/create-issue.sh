#!/usr/bin/env bash
# Validates an issue and, only if valid, creates it with `gh issue create`.
# Usage: create-issue.sh --title "<title>" --body-file <file>
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

if printf '%s\n' "$title" | grep -qiE 'co-authored-by|generated (with|by)|🤖|noreply@anthropic\.com'; then
  echo "FAILED: agent attribution is not allowed in the title" >&2; exit 1
fi
types="feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"
[[ "$title" =~ ^(${types})(\([a-z0-9._/-]+\))?!?:\ [^[:space:]] ]] || {
  echo "FAILED: title must be 'type(scope): subject' (types: ${types//|/, })" >&2; exit 1; }

"$dir/validate-issue.sh" "$body"
"$dir/guard-gh.sh" "gh issue create"
exec gh issue create --title "$title" --body-file "$body"
