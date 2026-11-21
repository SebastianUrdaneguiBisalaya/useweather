# Task sizing

Size the task before creating anything.

| Size | Signs | Issues |
| --- | --- | --- |
| Small | One focused change, one area, quick to verify | 1 |
| Medium | Several related changes or areas, can ship in parts | 2 to 3 |
| Large | Multiple independent parts, long-running, or cross-cutting | 1 parent issue + one sub-issue per part |

Guidelines:
- Each issue must be independently reviewable and map to one branch and one PR.
- Split by deliverable, not by file.
- Order issues by dependency; work them one at a time.
- A parent issue tracks sub-issues in a checklist (`- [ ] #<n>`), and is closed by the user after all are merged.
- If unsure between two sizes, pick the smaller number of issues that keeps each PR reviewable.
