#!/usr/bin/env bash
# ==============================================================================
# configure-branch-protection.sh
#
# Configures GitHub branch protection rules for the banking platform repo
# using the GitHub CLI (gh). Run ONCE after the repo is created.
#
# Prerequisites:
#   gh auth login   (with a PAT that has admin:repo scope)
#
# Usage:
#   bash .github/scripts/configure-branch-protection.sh
# ==============================================================================
set -euo pipefail

REPO="kmdsuhail72/banking"
MAIN_BRANCH="main"
DEV_BRANCH="develop"

echo "==> [1/3] Configuring branch protection for '${MAIN_BRANCH}'..."

gh api "repos/${REPO}/branches/${MAIN_BRANCH}/protection" \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci / checkout",
      "ci / build-and-test",
      "ci / docker-build",
      "ci / security-scan",
      "ci / push-image"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF

echo "==> [2/3] Configuring branch protection for '${DEV_BRANCH}'..."

gh api "repos/${REPO}/branches/${DEV_BRANCH}/protection" \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci / checkout",
      "ci / build-and-test",
      "ci / docker-build"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF

echo "==> [3/3] Enabling Dependabot security alerts and auto-updates..."
gh api "repos/${REPO}/vulnerability-alerts" --method PUT --header "Accept: application/vnd.github+json" 2>/dev/null || true

echo ""
echo "✅  Branch protection configured:"
echo "    main    → requires CI pass, 1 CODEOWNER approval, linear history, no force-push"
echo "    develop → requires CI pass, 1 reviewer"
echo ""
echo "Pipeline stages required for 'main':"
echo "  • ci / checkout"
echo "  • ci / build-and-test   (pnpm build + jest unit tests)"
echo "  • ci / docker-build     (multi-stage Docker build)"
echo "  • ci / security-scan    (Trivy image scan)"
echo "  • ci / push-image       (ECR push)"
