locals {
  # All service images that need ECR repositories
  service_names = [
    "api-gateway",
    "auth-service",
    "customer-service",
    "account-service",
    "transaction-service",
    "payment-service",
    "wallet-service",
    "ledger-service",
    "beneficiary-service",
    "kyc-risk-service",
    "notification-service",
    "reporting-service",
    # ── New services ────────────────
    "authz-service",
    "card-service",
    "loan-service",
    "emi-service",
    "fixed-deposit-service",
    "recurring-deposit-service",
    "fraud-service",
    "compliance-service",
    "audit-service",
    "limit-service",
    "interest-service",
    "statement-service",
    "support-service",
    "analytics-service",
    "fee-service",
    "exchange-service",
    "document-service",
    "scheduler-service",
    "admin-service",
    # ── Frontend ─────────────────────
    "frontend",
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.service_names)
  name                 = "banking/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, { Service = each.key })
}

# Keep only the 10 most recent tagged images; expire untagged after 1 day
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-", "v", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      }
    ]
  })
}
