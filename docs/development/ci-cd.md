# CI/CD pipeline

`.github/workflows/ci.yml` runs formatting, available workspace linting, unit tests,
production builds, and pull-request dependency review. Successful pushes to `main`
and version tags publish the existing `backend/` image to GHCR with full commit-SHA
tags, build provenance, and an SBOM. The default-branch image also receives `latest`.
Tags remain mutable; GitOps promotions use a content digest.

## GitOps delivery

Deployments now use reviewed Git changes and Argo CD. Run **Banking platform CI/CD**
manually with `environment` and the published `image_digest` to open a promotion PR.
The workflow verifies registry availability and updates only the selected environment.
Staging syncs merged changes automatically. Production requires a manual Argo CD sync.

GitHub Actions no longer connects to the cluster or uses `KUBE_CONFIG_DATA`.
See [GitOps deployment](gitops.md) for prerequisites, bootstrap commands, promotion,
rendered previews, registry access, rollback, and the GitHub-token PR-check limitation.

`.github/workflows/gitops.yml` renders staging, production, and Argo CD manifests and
uploads them as a review artifact. Rendering checks Kustomize structure; it does not
establish cluster availability or application health.
