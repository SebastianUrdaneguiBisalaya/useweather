// Rejects commit messages that don't follow Conventional Commits (https://www.conventionalcommits.org/).
// Used by .husky/commit-msg: `node scripts/check-commit-msg.mjs <path to the message file>`.
import { readFileSync } from "node:fs";

const TYPES = [
  "feat",
  "fix",
  "docs",
  "test",
  "refactor",
  "chore",
  "ci",
  "perf",
  "build",
  "style",
  "revert",
];
const MAX_HEADER = 100;
const HEADER = new RegExp(
  `^(${TYPES.join("|")})(\\([a-z0-9][a-z0-9/._-]*\\))?!?: \\S`,
);
// Messages git writes itself, or that `git rebase --autosquash` consumes.
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! )/;

/** The first line that isn't a git comment or blank. */
const header = (message) =>
  message
    .split("\n")
    .find((line) => line.trim() !== "" && !line.startsWith("#"))
    ?.trimEnd() ?? "";

/** Null when `message` is acceptable, otherwise why it isn't. */
const check = (message) => {
  const first = header(message);
  if (first === "") return "the commit message is empty";
  if (GENERATED.test(first)) return null;
  if (!HEADER.test(first)) {
    return `"${first}" doesn't follow Conventional Commits: <type>(<optional scope>)!: <summary>, with type one of ${TYPES.join(", ")}`;
  }
  if (first.length > MAX_HEADER) {
    return `the first line has ${first.length} characters; keep it at ${MAX_HEADER} or fewer`;
  }
  return null;
};

if (process.argv[2] !== undefined) {
  const problem = check(readFileSync(process.argv[2], "utf8"));
  if (problem !== null) {
    console.error(
      `✖ ${problem}\n  Examples: "feat(core): add hail bounce", "fix(react): keep children interactive", "docs: …"`,
    );
    process.exit(1);
  }
}
