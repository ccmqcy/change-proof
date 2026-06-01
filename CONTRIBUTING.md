# Contributing

Change Proof is intentionally small. Contributions should keep the tool focused on local diff evidence, verification output, and review-ready reports.

## Development

```powershell
npm install
npm test
```

## Before Opening A Pull Request

- Keep behavior deterministic where possible.
- Add or update tests for changed classification, report, or CLI behavior.
- Do not add an LLM dependency to the default path.
- Keep report wording explicit about what was verified and what was not verified.

## Useful Commands

```powershell
npm run build
npm test
node dist/cli.js report --help
```
