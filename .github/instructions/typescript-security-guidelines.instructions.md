---
description: Secure credential handling for TypeScript projects
applyTo: "**/*.ts,**/*.tsx,**/*.js"
---
# Credential Storage Rules

## Core Principles

- **Never hardcode credentials** such as API keys, secrets, passwords, tokens, or private URLs in source code.
- Secrets must never appear in committed files, build artifacts, or frontend-accessible code.
- Always access credentials through environment variables (e.g. `process.env.VAR_NAME`).
- Never rely on encoding, obfuscation, or comments as a security mechanism.
- Never log credentials or include them in error messages.

## Environment Variables

- Environment variables are the default and preferred mechanism for handling secrets in TypeScript projects.
- Local development may use `.env` files, which must be excluded from version control.
- Production environments must use platform-provided secret management (cloud provider, deployment platform, or container secrets).

## Repository Hygiene

- `.env` and similar files must always be ignored by git.
- If a real `.env` file cannot be created or committed:
  - Create a `.env.example` file instead.
  - Include variable names only, with empty values.
  - Never include real credentials in example files.
