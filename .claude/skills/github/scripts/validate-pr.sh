#!/usr/bin/env bash
# Validates a pull request body against templates/pull-request.md.
# Usage: validate-pr.sh <body-file>
set -euo pipefail

f="${1:-}"
[[ -n "$f" && -f "$f" ]] || { echo "usage: $0 <pr-body-file>" >&2; exit 2; }

errors=0
err() { echo "  - $1" >&2; errors=$((errors + 1)); }

echo "pull request validation: $f" >&2

for s in "Summary" "Checklist"; do
  if ! grep -qiE "^## ${s}[[:space:]]*$" "$f"; then
    err "missing section '## ${s}'"
  fi
done

grep -qE '^- \[[ xX]\] +[^[:space:]]' "$f" || err "checklist needs at least one '- [ ] item'"
grep -qE '^(Closes|Fixes|Resolves) #[0-9]+[[:space:]]*$' "$f" || err "missing closing line 'Closes #<issue-number>'"
grep -qE '#<issue-number>|<!--' "$f" && err "template placeholders or comments left in the body"
grep -qiE 'co-authored-by|generated (with|by)|🤖|noreply@anthropic\.com' "$f" && err "agent attribution is not allowed"

if (( errors > 0 )); then
  echo "FAILED: ${errors} problem(s). Fix them using templates/pull-request.md." >&2
  exit 1
fi
echo "OK" >&2
