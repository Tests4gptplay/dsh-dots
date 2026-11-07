# Scoped npm publication

This workflow publishes the existing prebuilt production payload as `@tests4gptplay/<repository-name>`. It does not rebuild Codex Native, invoke Codex, change the current GitHub release, or edit marketplace submissions.

The package builder changes only the npm identity, Cordis package entry references, and client loader registration. Existing configuration IDs and all other runtime bytes remain unchanged. Kujira keeps its established release exclusion of the website-only validation note. Source README files are not edited.

## Initial publication

1. Add an authorized short-lived npm publish token as the repository Actions secret `NPM_TOKEN`. Never put the token in a source file, issue, message, log, or workflow input.
2. Run the validation workflow and check its package artifact and `package-verification.json`.
3. Add `release/npm/<version>.json` on `main` with `name`, `version`, `filename`, `sha256`, and `integrity` copied from that exact verification result, plus `access: "public"`, `tag: "latest"`, and `publish: true`. Set `publish: false` for artifact-only validation.
4. The separate publish job checks the request, tarball digest, existing registry version, and public registry integrity after publication. An existing identical version is a safe no-op; a mismatch or uncertain lookup fails closed.

No token is provided to package preparation or tests. Only the single npm publish step receives `NPM_TOKEN`. Installation and publication lifecycle scripts are disabled. The workflow uses only read access to repository contents and does not configure credentials or account permissions.

## Later trusted publishing migration

After the initial packages exist, the owner can configure each package's npm trusted publisher for its exact repository, `npm-publish.yml`, and optional environment. Switching to that method requires a separate approved workflow change to grant the publish job `id-token: write`, remove the npm token environment, and enable provenance. This workflow intentionally neither configures that trust nor grants OIDC permissions.

## Pinned four-package batch

The initial batch is controlled by `release/npm/batch-20261107.json` and `npm-publish-batch.yml` in this repository. It checks out the other four public source repositories at exact commit pins and never writes to them. It reuses this repository’s `NPM_TOKEN` only in the publish step. `publish: false` builds and uploads package artifacts without trying npm publication. Enable publication only after the owner resolves the npm publish authentication requirement.
