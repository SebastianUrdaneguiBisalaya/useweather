---
name: github
description: Size a task, split it into issues, work one branch per issue, and open PRs that the user merges. Use whenever the user asks for or approves new work in a Git/GitHub repository.
---

# GitHub workflow

Follow this workflow for every task. Details are in `references/`; templates in `templates/`; checks in `scripts/`.

## Workflow

1. **Size the task** (see `references/task-sizing.md`): small = 1 issue, medium = 2-3 issues, large = 1 parent issue + sub-issues.
2. **Create issues** with `templates/issue.md`. Use only what the user said: no assumptions, no invented requirements. Include acceptance criteria and a step-by-step checklist. Create it only with `scripts/create-issue.sh --title "<title>" --body-file <file>`, which validates the body (`validate-issue.sh`) before calling `gh`.
3. **Branch** from an updated `main`: one branch per issue, named `type/<issue-number>-short-title` (e.g. `feat/12-add-installer`). Reuse a branch only if the user explicitly says so, and then update the issues.
4. **Commit** following `references/commit-conventions.md`.
5. **Open a PR** to `main` with `templates/pull-request.md`, ending with `Closes #<issue-number>`. Create it only with `scripts/create-pr.sh --title "<title>" --body-file <file>`, which validates the body (`validate-pr.sh`) before calling `gh`.
6. **Stop and wait.** The user reviews and merges. When they confirm, run `git checkout main && git pull`, then start the next issue.

## Hard rules

- NEVER merge (no `gh pr merge`, no merge via API, no pushing to `main`, no force push). Only the user merges.
- NEVER add `Co-Authored-By`, "Generated with ...", or any agent attribution to commits, issues or PRs. The author is the user (`git config user.name` / `user.email`).
- Only the `gh` commands in `references/allowed-gh-commands.md` may be used; check with `scripts/guard-gh.sh`.
- Create issues and PRs only through `create-issue.sh` / `create-pr.sh`, never with raw `gh issue create` / `gh pr create`.
- Do not start work without an issue.
