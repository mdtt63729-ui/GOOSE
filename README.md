# Goose

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm ci
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local` if the app features you use require Gemini.

## GitHub Actions

The repository includes these workflows under `.github/workflows/`:

- **CI Build & Quality Checks** — runs on pushes and pull requests to `main`/`master`, and can also be started manually.
- **Release Build & Signing** — runs for version tags (`v*`) or can be started manually.
- **Generate Android Signing Secrets** — one-time manual workflow to generate a release keystore and instructions for the repository secrets.

### Show and run the one-time signing workflow

1. Commit and push the complete `.github/workflows/setup-signing.yml` file to the repository's **default branch**. GitHub does not list a `workflow_dispatch` workflow until its workflow file exists on the default branch. If you have only uploaded this project ZIP, the workflow is not in your GitHub repository yet.
2. Open the repository's **Actions** tab, select **Generate Android Signing Secrets** in the left sidebar, then click **Run workflow**.
3. When the run finishes, download the `goose-signing-setup-confidential` artifact from that run. It contains the four values to add under **Settings → Secrets and variables → Actions**: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD`.
4. Keep the artifact and those values confidential. The artifact expires after one day. Then create a version tag such as `v1.0.0` to run the signed release workflow, or start **Release Build & Signing** manually.

If the workflow is still missing after pushing the file to the default branch, verify that Actions are enabled for the repository and that the YAML file is at exactly `.github/workflows/setup-signing.yml`.
