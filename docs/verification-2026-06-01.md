# Verification - 2026-06-01

## Scope

Verified the first MVP implementation of Change Proof in `projects/01-change-proof/`.

## Verified

### Dependency install

Command:

```powershell
npm install
```

Result: PASS.

### Build and unit tests

Command:

```powershell
npm test
```

Result: PASS.

Evidence summary:

- TypeScript compilation completed.
- Node test runner executed 8 tests.
- 8 passed, 0 failed.
- Includes real Git repository CLI smoke coverage.
- Includes `--fail-on-test-failure` behavior coverage.
- Includes `--version` behavior coverage.

### CLI help

Command:

```powershell
node dist/cli.js --help
```

Result: PASS.

Verified that the CLI prints usage for `change-proof report`, including `--repo`, `--base`, `--output`, `--json`, `--test`, and `--fail-on-test-failure`.

### CLI version

Command:

```powershell
node dist/cli.js --version
```

Result: PASS after fix.

Evidence summary:

- A pre-release check found `--version` was incorrectly printing help text.
- `src/cli.ts` was fixed to handle `--version` before the no-command help path.
- `tests/cli.test.js` now asserts the output is exactly `0.1.0`.

### Real Git repository smoke

Command shape:

```powershell
node dist/cli.js report -C <temp-git-repo> --test "node --version" --output tmp/smoke-report.md --json tmp/smoke-report.json
```

Result: PASS.

Evidence summary:

- A temporary Git repository was initialized.
- A baseline commit was created.
- `src/auth/session.ts` was modified.
- Change Proof generated Markdown and JSON reports.
- Console summary reported `files=1 risks=1 high=1 verification=PASS`.
- Markdown report contained `Auth or session boundary`.
- Markdown report contained `Status: PASS`.

### Automated CLI smoke tests

Command:

```powershell
npm test
```

Result: PASS.

Evidence summary:

- `tests/cli.test.js` creates a temporary Git repository.
- The test commits a baseline, modifies `src/auth/session.ts`, then runs `dist/cli.js report`.
- The test asserts Markdown and JSON report files exist.
- The test asserts `verification=PASS`, `Status: PASS`, and one high-risk auth signal.
- The test also verifies `--fail-on-test-failure` returns exit code 1 and writes a failure report.

### Package dry run

Command:

```powershell
npm pack --dry-run
```

Result: PASS.

Evidence summary:

- Generated tarball preview: `change-proof-0.1.0.tgz`.
- Package size: 14.8 kB.
- Tarball included `LICENSE`, `README.md`, `package.json`, and compiled `dist/` files.
- Tarball included `CHANGELOG.md`.
- `dist/cli.js` was checked and still starts with `#!/usr/bin/env node`.

## Failed Attempt That Was Resolved

An earlier smoke attempt used a nested quoted command:

```powershell
--test "node -e \"console.log('smoke ok')\""
```

PowerShell passed the nested quotes incorrectly, causing the CLI to see extra arguments. The smoke was rerun with `--test "node --version"` and passed. This is a documentation/quoting caveat, not a failure of diff collection or report generation.

## Not Verified

- No GitHub repository has been created.
- No npm package has been published.
- The GitHub Actions workflow has not run on GitHub.
- The CLI has not been tested on macOS or Linux.
- The CLI has not been tested against very large diffs.
- The CLI has not been tested with rename-heavy diffs beyond unit-level parsing.

## Remaining Risk

- Windows shell quoting for complex `--test` commands should be documented with safe examples before public release.
- Risk detection is path-based only. It is useful for review routing, but it does not prove semantic safety.
- `git diff HEAD` requires a repository with at least one commit; initial repositories without `HEAD` fall back to status-derived files with a warning.
