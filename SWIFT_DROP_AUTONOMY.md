# Swift Drop autonomous development

This repository uses GitHub Actions and the official OpenAI Codex GitHub Action to run one bounded coding cycle every 30 minutes.

## One-time setup

1. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Add a secret named `OPENAI_API_KEY` containing an API key for the OpenAI API. Do not paste the key into source code, workflow files, or chat.
3. Confirm GitHub Actions are enabled for this repository.
4. Confirm GitHub Pages is enabled with the `github-pages` deployment environment. The existing `.github/workflows/deploy-pages.yml` publishes `main` after a successful production build.
5. In **Settings → Actions → General → Workflow permissions**, allow the repository's workflow token to read and write contents and pull requests. Individual workflows still request only the permissions they need.
6. If branch protection is configured for `main`, ensure the CI check can pass and that repository policy permits the dedicated agent PR to merge. Required human approvals will still block the merge.

## Automation cycle

- Scheduled/manual workflow checks the current `main` revision and runs typecheck, lint, and production build.
- Codex receives the repository-specific task prompt and may edit only `src/`, `public/`, `docs/`, and `tests/`; it writes a temporary patch artifact.
- A separate publishing job checks the patch size and changed paths, applies it, repeats all three checks without a write token, then opens/updates the dedicated PR.
- The existing CI workflow checks the PR. A separate workflow verifies that the exact PR head SHA passed CI before squashing it into `main`.
- The existing Pages deployment workflow builds and publishes the new `main` revision.

## Important limits

- The schedule is every 30 minutes, not a continuously running process. GitHub may delay scheduled jobs, and repository plan limits, API billing, rate limits, or outages can pause work.
- Add a billing limit/usage alert for the API key. The workflow does not bypass API billing.
- The agent is deliberately restricted from editing workflows, dependencies, deployment/security settings, database policies, and secrets.
- A successful typecheck/lint/build does not prove that a 3D scene looks correct on a physical phone. Visual gameplay checks remain useful after deployments.
- If `OPENAI_API_KEY` is missing or invalid, the coding job cannot run.
