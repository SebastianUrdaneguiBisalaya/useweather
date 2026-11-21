#!/usr/bin/env bash
# Checks a shell command against the skill's allowed Git/GitHub commands.
# Usage: guard-gh.sh "<command>"      (exit 0 = allowed, 1 = blocked)
# Can be wired as a pre-tool-use hook for agents that support it.
set -euo pipefail

cmd="${1:-}"
[[ -n "$cmd" ]] || { echo "usage: $0 \"<command>\"" >&2; exit 2; }

block() {
  echo "BLOCKED: $1" >&2
  echo "  command: $cmd" >&2
  echo "  see references/allowed-gh-commands.md" >&2
  exit 1
}

# Split chained commands so each part is checked.
while IFS= read -r part; do
  part="$(echo "$part" | sed -E 's/^[[:space:]]+//')"
  [[ -n "$part" ]] || continue

  if [[ "$part" =~ ^gh([[:space:]]|$) ]]; then
    read -r -a w <<<"$part"
    group="${w[1]:-}"; action="${w[2]:-}"
    case "$group $action" in
      "issue create"|"issue view"|"issue list"|"issue edit") ;;
      "pr create"|"pr view"|"pr list"|"pr status"|"pr checks") ;;
      "repo view") ;;
      "pr merge") block "agents must never merge; only the user merges" ;;
      *) block "gh command not in the allowed list: gh ${group} ${action}" ;;
    esac
  fi

  if [[ "$part" =~ ^git[[:space:]]+merge([[:space:]]|$) ]]; then
    block "agents must never merge"
  fi
  if [[ "$part" =~ ^git[[:space:]]+push ]]; then
    [[ "$part" =~ (--force|[[:space:]]-f([[:space:]]|$)|--force-with-lease|--delete) ]] && block "force push / branch deletion is forbidden"
    [[ "$part" =~ (^|[[:space:]:/])main([[:space:]]|$) || "$part" =~ HEAD:main ]] && block "pushing to main is forbidden"
  fi
done < <(echo "$cmd" | sed -E 's/(&&|\|\||;|\|)/\n/g')

exit 0
