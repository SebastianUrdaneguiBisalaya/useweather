# Commit conventions

Format: `type(scope): subject`

## Types
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Rules
- Subject: imperative, lowercase, no trailing period.
- Header at most 72 characters; scope optional, lowercase.
- Optional body explains what and why, wrapped at ~72 characters.
- Breaking changes: `!` after the type/scope and a `BREAKING CHANGE:` footer.
- Author is the user's `git config user.name` / `user.email`.
- No `Co-Authored-By`, "Generated with ...", or any agent attribution.

## Branches
`type/<issue-number>-short-title`, one per issue, e.g. `fix/7-handle-empty-input`.

## Pull requests
Title follows the commit format. Body follows `templates/pull-request.md` and ends with `Closes #<issue-number>`.
