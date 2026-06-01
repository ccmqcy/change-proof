# Change Proof

Turn a local `git diff` into a clean change, verification, and risk proof packet.

## Status

- Stage: published
- Priority: 1
- GitHub remote: https://github.com/ccmqcy/change-proof
- Package registry: not published
- Current implementation: local TypeScript CLI

## Why This Exists

AI coding often produces a patch faster than a reviewer can understand it. The missing artifact is not another diff view; it is a short proof packet that says what changed, why it matters, what was actually verified, what was not verified, and what risk remains.

## Differentiation

- Not a generic diff viewer.
- Not an AI reviewer that claims correctness.
- Focused on evidence wording: `verified`, `not verified`, `risk`, and `next check`.

## MVP

Command:

```powershell
npx change-proof report --test "npm test"
```

Inputs:

- `git diff --stat`
- `git diff --name-only`
- optional test command output

Outputs:

- `change-proof-report.md`
- optional `change-proof-report.json`

## Install From Source

```powershell
npm install
npm run build
node dist/cli.js report --help
```

## Usage

Generate a Markdown report for the current Git repository:

```powershell
node dist/cli.js report
```

Generate Markdown and JSON, and include a verification command:

```powershell
node dist/cli.js report --test "npm test" --json change-proof-report.json
```

Inspect another repository:

```powershell
node dist/cli.js report -C ../my-repo --base origin/main --output reports/change-proof.md
```

Fail the CLI when the verification command fails:

```powershell
node dist/cli.js report --test "npm test" --fail-on-test-failure
```

### Windows `--test` Quoting

Keep the `--test` value simple on Windows shells:

```powershell
node dist/cli.js report --test "npm test"
node dist/cli.js report --test "node --version"
```

Avoid deeply nested quotes such as `node -e "console.log('ok')"`, because PowerShell and `cmd.exe` can pass those quotes differently. For complex checks, put the check in an npm script and call that script:

```json
{
  "scripts": {
    "verify": "npm test && npm run build"
  }
}
```

```powershell
node dist/cli.js report --test "npm run verify"
```

## Output Shape

The Markdown report includes:

- summary counts
- files grouped as `source`, `test`, `docs`, `config`, `generated`, `asset`, or `other`
- path-based risk signals
- actual verification command output when `--test` is provided
- explicit `Not Verified` notes
- raw `git diff --stat`

Example console output:

```text
Change Proof: files=1 risks=1 high=1 verification=PASS
Wrote report=change-proof-report.md json=change-proof-report.json
```

## First Features

- Group changed files by type: source, test, docs, config, generated.
- Detect risky paths: auth, payment, migration, config, workflow, dependency.
- Run one optional verification command.
- Never mark anything verified unless a command actually ran.

## Commands

```powershell
npm run build
npm test
node dist/cli.js report --help
```

## Current Verification

See `docs/verification-2026-06-01.md`.

## Similar Tools And Risk

Duplicate risk: medium.

Adjacent tools exist around diff viewing, AI review, and PR summarization. The project should stay narrow: local diff to verification receipt.

## Routes

| Route | Purpose |
| --- | --- |
| `README.md` | Project entry |
| `docs/` | Research, design notes, verification evidence |
| `src/` | CLI source |
| `tests/` | Node test runner tests |
| `.github/workflows/ci.yml` | Future GitHub CI |

## Release Notes

Before GitHub release, complete `../../docs/operations/github-publish-checklist.md`.
