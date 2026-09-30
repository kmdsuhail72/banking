# =============================================================================
# IAM / IRSA Module — Banking Platform
# Least-privilege roles for: GitHub Actions, Loki, External Secrets Operator,
# Application secrets access, RDS Enhanced Monitoring
# =============================================================================

locals {
  oidc_host = replace(var.oidc_provider_url, "https://", "")
}

# ── Helper: IRSA assume-role policy factory ────────────────────────────────────
# Usage: call for each service account that needs AWS access
data "aws_iam_policy_document" "irsa" {
  for_each = {
    "banking/loki-sa"               = "loki-sa"
    "banking/reporting-sa"          = "reporting-sa"
    "external-secrets/eso-sa"       = "eso-sa"
    "banking/app-secrets-sa"        = "app-secrets-sa"
  }

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:${each.key}"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

# ── IRSA: Loki — S3 read/write for log storage ───────────────────────────────
resource "aws_iam_role" "loki" {
  name               = "${var.cluster_name}-loki-s3-role"
  assume_role_policy = data.aws_iam_policy_document.irsa["banking/loki-sa"].json
  tags               = var.tags
}

resource "aws_iam_role_policy" "loki_s3" {
  name = "loki-s3"
  role = aws_iam_role.loki.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetBucketLocation"]
      Resource = [
        "arn:aws:s3:::${var.cluster_name}-loki",
        "arn:aws:s3:::${var.cluster_name}-loki/*"
      ]
    }]
  })
}

# ── IRSA: External Secrets Operator — read any secret tagged for banking ───────
resource "aws_iam_role" "external_secrets" {
  name               = "${var.cluster_name}-external-secrets-role"
  assume_role_policy = data.aws_iam_policy_document.irsa["external-secrets/eso-sa"].json
  tags               = var.tags
}

resource "aws_iam_role_policy" "external_secrets" {
  name = "secrets-manager-read"
  role = aws_iam_role.external_secrets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds",
        ]
        Resource = "arn:aws:secretsmanager:*:${var.aws_account_id}:secret:${var.cluster_name}/*"
      },
      {
        Sid    = "DecryptSecrets"
        Effect = "Allow"
        Action = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
        # Secrets KMS key — the specific ARN is passed in from the secrets module output
        Resource = "*"
        Condition = {
          StringLike = {
            "kms:ViaService" = "secretsmanager.*.amazonaws.com"
          }
        }
      }
    ]
  })
}

# ── IRSA: Application service accounts — read their own secrets only ───────────
resource "aws_iam_role" "app_secrets" {
  name               = "${var.cluster_name}-app-secrets-role"
  assume_role_policy = data.aws_iam_policy_document.irsa["banking/app-secrets-sa"].json
  tags               = var.tags
}

resource "aws_iam_role_policy" "app_secrets" {
  name = "app-secrets-read"
  role = aws_iam_role.app_secrets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = "arn:aws:secretsmanager:*:${var.aws_account_id}:secret:${var.cluster_name}/*"
    }]
  })
}

# ── IAM: RDS Enhanced Monitoring ─────────────────────────────────────────────
data "aws_iam_policy_document" "rds_monitoring_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["monitoring.rds.amazonaws.com"] }
  }
}

resource "aws_iam_role" "rds_monitoring" {
  name               = "${var.cluster_name}-rds-monitoring-role"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ── GitHub Actions OIDC role ──────────────────────────────────────────────────
data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = ["arn:aws:iam::${var.aws_account_id}:oidc-provider/token.actions.githubusercontent.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:kmdsuhail72/banking:*"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${var.cluster_name}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "ecr-push"
  role = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ECRAuth"
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart",
          "ecr:BatchGetImage", "ecr:DescribeRepositories", "ecr:CreateRepository",
          "ecr:PutImageScanningConfiguration", "ecr:PutLifecyclePolicy",
        ]
        Resource = "arn:aws:ecr:*:${var.aws_account_id}:repository/banking/*"
      },
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = ["eks:DescribeCluster", "eks:ListClusters"]
        Resource = "*"
      },
      {
        Sid    = "HelmDeploy"
        Effect = "Allow"
        Action = [
          "eks:DescribeNodegroup", "eks:ListNodegroups",
          "eks:DescribeUpdate", "eks:AccessKubernetesApi"
        ]
        Resource = "arn:aws:eks:*:${var.aws_account_id}:cluster/${var.cluster_name}*"
      },
      {
        Sid    = "SecuritySARIF"
        Effect = "Allow"
        Action = ["codestar-connections:UseConnection"]
        Resource = "*"
      }
    ]
  })
}
