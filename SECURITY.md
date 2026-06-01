# Security Policy

## Supported Versions

This project is pre-1.0. Security fixes target the latest `main` branch until a stable release policy exists.

## Reporting A Vulnerability

Open a GitHub security advisory after the repository is published. Until then, do not publish exploit details in public issues.

## Security Notes

Change Proof runs local commands only when the user explicitly passes `--test <command>`. It does not execute inferred commands, install dependencies, call external services, or send repository contents to an LLM.
