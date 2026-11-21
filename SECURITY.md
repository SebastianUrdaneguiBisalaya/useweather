# Security Policy

## Supported versions

useweather is in pre-release. Once published, security fixes target the latest released minor version of each package (`@useweather/core` and `@useweather/react`). Upgrade to the latest version before reporting.

## Reporting a vulnerability

**Please do not report security issues in public issues, pull requests or discussions.**

Report them privately through GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, the affected package and version, and steps to reproduce it (a minimal snippet or project is ideal).

The maintainer will acknowledge the report, investigate, and keep you updated through the advisory. Response times are best effort: this is a volunteer-maintained project. Once a fix is released, the advisory is published and you are credited, unless you prefer to stay anonymous.

## Scope

useweather is a client-side rendering library. It does not make network requests, store data, read cookies or storage, or handle credentials. Relevant reports include, for example:

- Injection through props or options that leads to script execution or arbitrary CSS/HTML being applied.
- Ways to make the library crash or hang the page, or exhaust memory or CPU, through valid public API usage.
- Problems in the published packages themselves, such as malicious or unexpected code in the tarball or compromised build provenance.

Out of scope:

- Vulnerabilities in your own application, or in React, Next.js or other dependencies of your app (report those upstream).
- The playground in `apps/website`, which is a development tool and is never published.
- Visual issues without a security impact (please open a normal issue).

## Supply chain

- `@useweather/core` has no runtime dependencies, and `@useweather/react` only peers on React.
- All development dependencies are pinned to exact versions.
- Packages are published only from GitHub Actions with npm provenance, never from a local machine.
