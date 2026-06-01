# npm Publish Preflight - 2026-06-01

## Current Decision

Package name: `change-proof`

Package type: unscoped public package

Registry: `https://registry.npmjs.org/`

GitHub repository: https://github.com/ccmqcy/change-proof

npm publication status: published

Published version: `0.1.2`

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
- `change-proof@0.1.2` is published on the official npm registry.
- `change-proof` package name was initially available, then reserved by the successful `0.1.2` publish.
- `npm run verify` passed locally.
- `npm run publish:dry` passed locally.
- Dry-run tarball preview: `change-proof-0.1.2.tgz`.
- Dry-run package size: 15.8 kB.
- Dry-run package contents: 19 files.
- `npm publish --dry-run` completed against the authenticated account and did not upload the package.
- `npm publish` completed successfully after interactive npm authentication.
- `npm view change-proof version --registry https://registry.npmjs.org/` returns `0.1.2`.
- `npx --registry https://registry.npmjs.org/ --yes change-proof@latest --version` returns `0.1.2`.

- npm account ownership: authenticated locally as `cccqqy`.

未验证:

- npm trusted publisher configuration, because it requires npm-side account/package configuration.

Additional account check after the failed publish:

```text
npm profile get --registry https://registry.npmjs.org/ -> two-factor auth: auth-and-writes
```

This means the original E403 blocker was addressed for interactive manual publishing, and the package was later published successfully.

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
- `npm:preflight` runs in verification mode and allows the current version to already exist after publication.
- `pack:dry`: runs `npm pack --dry-run` against the official npm registry.
- `publish:dry`: runs `npm publish --dry-run` against the official npm registry.
- `verify:install`: packs the package into a temp directory, installs it into a temp consumer project, and verifies `change-proof --version`.
- `verify`: runs tests, npm preflight, pack dry-run, and install verification.
- `publish:manual` still runs strict auth/version checks before a real publish and will block republishing an existing version.

## Actual Publish Attempt Blocker

A manual publish attempt reached the official npm registry and failed with:

```text
npm error code E403
npm error 403 Forbidden - PUT https://registry.npmjs.org/change-proof
npm error 403 Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

Local account state observed around the failed attempt:

```text
npm whoami --registry https://registry.npmjs.org/ -> cccqqy
npm profile get --registry https://registry.npmjs.org/ -> two-factor auth: disabled
```

After enabling 2FA, the current account check reports:

```text
npm profile get --registry https://registry.npmjs.org/ -> two-factor auth: auth-and-writes
```

Conclusion: package content was ready; the original E403 was caused by disabled 2FA and was resolved by enabling npm 2FA before the successful publish.

## Final npm Publish Result

Command:

```powershell
npm run publish:manual
```

Result: PASS.

Evidence summary:

- npm prompted for interactive account authentication.
- Publish completed with `+ change-proof@0.1.2`.
- Official package page: https://www.npmjs.com/package/change-proof
- Tarball: https://registry.npmjs.org/change-proof/-/change-proof-0.1.2.tgz
- Integrity: `sha512-+Bp2ZGh+FD1BQ9x4YjFmiUksqp8sTPADLXaHYLvBoC5cyL3zS+jCPXPEglXnxteqywq0Gpq/WEEONnT/7bZdLg==`
- Published versions list contains only `0.1.2`.

Post-publish verification:

```powershell
npm view change-proof version --registry https://registry.npmjs.org/
npx --registry https://registry.npmjs.org/ --yes change-proof@latest --version
```

Both commands returned:

```text
0.1.2
```

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
- `pack:dry` produced `change-proof-0.1.2.tgz`.
- `verify:install` installed the packed tarball into a temp consumer project and verified the CLI version.
- `npm publish --dry-run` completed with `+ change-proof@0.1.2`.
- The dry-run did not upload the package. Future real publishes still require completing npm's interactive 2FA challenge or using a verified trusted/staged publishing flow.

## Future Publish Path

Recommended safest path for future versions:

1. Log in to npm on this machine or configure npm trusted publishing.
2. Run:

```powershell
npm run verify
npm run publish:dry
```

3. Publish using one of these options.

Direct local publish:

```powershell
npm profile enable-2fa auth-and-writes --registry https://registry.npmjs.org/
npm profile get --registry https://registry.npmjs.org/
npm run publish:manual
```

Staged publish:

```powershell
npm profile enable-2fa auth-and-writes --registry https://registry.npmjs.org/
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
