#!/usr/bin/env bash
# Validates an issue body against templates/issue.md.
# Usage: validate-issue.sh <body-file>
set -euo pipefail

f="${1:-}"
[[ -n "$f" && -f "$f" ]] || { echo "usage: $0 <issue-body-file>" >&2; exit 2; }

errors=0
err() { echo "  - $1" >&2; errors=$((errors + 1)); }

# Prints the content of a "## <name>" section (without the heading).
section() {
  awk -v n="$1" '
    /^## / { on = (tolower(substr($0, 4)) == tolower(n)); next }
    on { print }
  ' "$f"
}

echo "issue validation: $f" >&2

for s in "Description" "Acceptance criteria" "Checklist"; do
  if ! grep -qiE "^## ${s}[[:space:]]*$" "$f"; then
    err "missing section '## ${s}'"
    continue
  fi
  body="$(section "$s" | grep -vE '^[[:space:]]*(<!--.*-->)?[[:space:]]*$' || true)"
  [[ -n "$body" ]] || err "section '${s}' is empty"
done

for s in "Acceptance criteria" "Checklist"; do
  section "$s" | grep -qE '^- \[[ xX]\] +[^[:space:]]' || err "section '${s}' needs at least one '- [ ] item'"
done

grep -qE '<!--|Step 1|Step 2' "$f" && err "template placeholders or comments left in the body"
grep -qiE 'co-authored-by|generated (with|by)|🤖|noreply@anthropic\.com' "$f" && err "agent attribution is not allowed"

if (( errors > 0 )); then
  echo "FAILED: ${errors} problem(s). Fix them using templates/issue.md." >&2
  exit 1
fi
echo "OK" >&2
