# Allowed `gh` commands

## Allowed
- `gh issue create | view | list | edit`
- `gh pr create | view | list | status | checks`
- `gh repo view`

## Forbidden
- `gh pr merge` (only the user merges)
- `gh repo delete`
- `gh api -X DELETE` and any other destructive API call
- Anything not listed under "Allowed"

Also forbidden outside `gh`: pushing to `main` and force pushes.
Enforced by `scripts/guard-gh.sh`.
