# npm Publish Preflight - 2026-06-01

## Current Decision

Package name: `change-proof`

Package type: unscoped public package

Registry: `https://registry.npmjs.org/`

GitHub repository: https://github.com/ccmqcy/change-proof

npm publication status: not published

Prepared npm-ready version: `0.1.1`

## Official Requirements Checked

Based on current npm documentation:

- Unscoped npm packages are public and are referenced by package name only.
- Before publishing an unscoped public package, an npm user account is required.
- Direct publishing with `npm publish` requires either 2FA on the npm account or a granular access token with bypass 2FA enabled.
- npm recommends trusted publishing for CI-based publishing because it avoids long-lived tokens.
- Trusted publishing from GitHub Actions can automatically generate provenance attestations when the repo and package are public.
- Provenance requires the `package.json` repository to match the public repository used for publishing.
- First-time public publish can also use staged publishing: `npm stage publish`, followed by maintainer approval with 2FA.

## Local Findings

已验证:

- Local npm CLI: `11.9.0`.
- Local Node.js: `v24.14.0`.
- Project-level `package.json` repository URL matches `git+https://github.com/ccmqcy/change-proof.git`.
- Official npm registry ping succeeded with `--registry https://registry.npmjs.org/`.
- `change-proof@0.1.1` is not currently published on the official npm registry.
- `change-proof` package name returned `E404` on the official npm registry at the time of this check.
- `npm run verify` passed locally.
- `npm run publish:dry` passed locally.
- Dry-run tarball preview: `change-proof-0.1.1.tgz`.
- Dry-run package size: 15.5 kB.
- Dry-run package contents: 19 files.
- `npm publish --dry-run` only warned that npm login is required for a real publish.

未验证:

- npm account ownership, because this machine is not authenticated to npm.
- npm trusted publisher configuration, because it requires npm-side account/package configuration.
- Actual `npm publish`, intentionally not run.

## Important Local Registry Note

The machine-level npm registry currently points to:

```text
https://registry.npmmirror.com
```

For publishing, all scripts and docs must explicitly use:

```text
https://registry.npmjs.org/
```

This prevents package-name checks or publish commands from accidentally using a mirror registry.

## Prepared Scripts

```powershell
npm run npm:preflight
npm run pack:dry
npm run publish:dry
npm run verify:install
npm run verify
```

Meaning:

- `npm:preflight`: checks package metadata, official registry reachability, current version availability, and npm auth state.
- `pack:dry`: runs `npm pack --dry-run` against the official npm registry.
- `publish:dry`: runs `npm publish --dry-run` against the official npm registry.
- `verify:install`: packs the package into a temp directory, installs it into a temp consumer project, and verifies `change-proof --version`.
- `verify`: runs tests, npm preflight, pack dry-run, and install verification.

## publish:dry Result

Command:

```powershell
npm run publish:dry
```

Result: PASS.

Evidence summary:

- `prepublishOnly` ran `npm run verify`.
- 8 tests passed.
- Official npm registry preflight passed.
- `pack:dry` produced `change-proof-0.1.1.tgz`.
- `verify:install` installed the packed tarball into a temp consumer project and verified the CLI version.
- `npm publish --dry-run` completed with `+ change-proof@0.1.1`.
- Expected warning: this machine is not logged in to `https://registry.npmjs.org/`; real publish still requires authentication, trusted publishing, or staged publishing approval.

## Recommended First Publish Path

Recommended safest path:

1. Log in to npm on this machine or configure npm trusted publishing.
2. Run:

```powershell
npm run verify
npm run publish:dry
```

3. Publish using one of these options:

Direct local publish:

```powershell
npm run publish:manual
```

Staged publish:

```powershell
npm stage publish --registry https://registry.npmjs.org/
```

Trusted publishing preparation:

```powershell
npm trust github change-proof --repo ccmqcy/change-proof --file npm-publish.yml --allow-stage-publish
```

For maximum security, prefer trusted publishing with stage-only permission, then approve the staged package with 2FA.

## Workflow Note

`docs/npm-publish-workflow.example.yml` contains a GitHub Actions workflow template for future trusted staged publishing. It has intentionally not been copied into `.github/workflows/` yet, because npm-side trusted publisher configuration is not verified.

## Sources

- https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/cli/v11/commands/npm-trust/
