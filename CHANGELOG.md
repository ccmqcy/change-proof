# Changelog

## 0.1.2 - 2026-06-01

npm publish blocker handling.

- Added strict npm auth preflight for manual publish.
- Detects local npm account 2FA status before `publish:manual`.
- Documents the E403 publish failure caused by disabled npm 2FA.
- Ignores local `.npmrc` so auth tokens are not accidentally committed.

## 0.1.1 - 2026-06-01

npm publish readiness release.

- Added npm preflight checks for official registry reachability, package metadata, current-version availability, and authentication state.
- Added package install verification from a packed tarball.
- Added `prepack`, `prepublishOnly`, `pack:dry`, `publish:dry`, `publish:manual`, and `verify` scripts.
- Added `publishConfig` for the official npm registry and public access.
- Added build-time CLI bin mode normalization for Unix installs.
- Added npm publish preflight documentation and trusted publishing notes.
- Updated CI to run full package verification.

## 0.1.0 - 2026-06-01

Initial MVP.

- Added `change-proof report` CLI.
- Added Git diff and untracked-file collection.
- Added path-based file grouping.
- Added path-based risk signals for auth, permissions, money, database, API, CI, dependency, and config changes.
- Added optional `--test <command>` verification capture.
- Added Markdown and JSON report output.
- Added `--fail-on-test-failure`.
- Added unit tests and real Git repository CLI smoke tests.
