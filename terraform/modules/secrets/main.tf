# =============================================================================
# AWS Secrets Manager Module — Banking Platform
# Creates: KMS key for secrets, per-service secrets, application config secrets,
#          third-party API key placeholders, and rotation config
# =============================================================================

# ── KMS Key for Secrets Manager ───────────────────────────────────────────────
resource "aws_kms_key" "secrets" {
  description             = "${var.cluster_name} Secrets Manager KMS key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = merge(var.tags, { Name = "${var.cluster_name}-secrets-kms" })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.cluster_name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

# ── Database Connection String (per-service) ──────────────────────────────────
# These reference the Aurora master secret; services read host/port/db from here
locals {
  # Services that need DB access (maps to per-service DB users/schemas)
  db_services = [
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
    "loan-service",
    "card-service",
    "fraud-service",
    "compliance-service",
    "audit-service",
    "statement-service",
    "reporting-service",
  ]
}

# DB connection config (host/port/db — NOT the password; Aurora manages that)
resource "aws_secretsmanager_secret" "db_config" {
  for_each    = toset(local.db_services)
  name        = "${var.cluster_name}/${each.key}/db-config"
  description = "Database connection configuration for ${each.key}"
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = 30
  tags                    = merge(var.tags, { Service = each.key, Type = "db-config" })
}

resource "aws_secretsmanager_secret_version" "db_config" {
  for_each  = aws_secretsmanager_secret.db_config
  secret_id = each.value.id

  secret_string = jsonencode({
    host     = var.aurora_endpoint
    port     = tostring(var.aurora_port)
    database = var.aurora_db
    username = var.aurora_user
    # password is fetched from Aurora-managed secret: var.aurora_master_user_secret_arn
    master_secret_arn = var.aurora_master_user_secret_arn
    # Per-service schema prefix
    schema   = replace(each.key, "-", "_")
  })

  lifecycle { ignore_changes = [secret_string] }
}

# ── JWT / Auth Secrets ────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "jwt" {
  name        = "${var.cluster_name}/auth-service/jwt"
  description = "JWT signing keys for auth-service"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Service = "auth-service", Type = "jwt" })
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    JWT_SECRET         = "REPLACE_WITH_REAL_SECRET_MIN_64_CHARS"
    JWT_REFRESH_SECRET = "REPLACE_WITH_REAL_REFRESH_SECRET_MIN_64_CHARS"
    JWT_EXPIRES_IN     = "15m"
    JWT_REFRESH_EXPIRES_IN = "7d"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Notification Service (Email + SMS) ────────────────────────────────────────
resource "aws_secretsmanager_secret" "notification" {
  name        = "${var.cluster_name}/notification-service/providers"
  description = "Email (SES/SMTP) and SMS (SNS/Twilio) credentials for notification-service"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Service = "notification-service", Type = "provider-credentials" })
}

resource "aws_secretsmanager_secret_version" "notification" {
  secret_id = aws_secretsmanager_secret.notification.id
  secret_string = jsonencode({
    SMTP_HOST     = "email-smtp.us-east-1.amazonaws.com"
    SMTP_PORT     = "587"
    SMTP_USER     = "REPLACE_WITH_SES_SMTP_USER"
    SMTP_PASS     = "REPLACE_WITH_SES_SMTP_PASS"
    TWILIO_SID    = "REPLACE_WITH_TWILIO_ACCOUNT_SID"
    TWILIO_TOKEN  = "REPLACE_WITH_TWILIO_AUTH_TOKEN"
    TWILIO_FROM   = "REPLACE_WITH_TWILIO_PHONE_NUMBER"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Payment Gateway Credentials ───────────────────────────────────────────────
resource "aws_secretsmanager_secret" "payment_gateway" {
  name        = "${var.cluster_name}/payment-service/gateway"
  description = "Payment gateway API keys (Razorpay / Stripe)"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Service = "payment-service", Type = "gateway-credentials" })
}

resource "aws_secretsmanager_secret_version" "payment_gateway" {
  secret_id = aws_secretsmanager_secret.payment_gateway.id
  secret_string = jsonencode({
    RAZORPAY_KEY_ID     = "REPLACE_WITH_RAZORPAY_KEY_ID"
    RAZORPAY_KEY_SECRET = "REPLACE_WITH_RAZORPAY_KEY_SECRET"
    STRIPE_SECRET_KEY   = "REPLACE_WITH_STRIPE_SECRET_KEY"
    STRIPE_WEBHOOK_SECRET = "REPLACE_WITH_STRIPE_WEBHOOK_SECRET"
    PAYMENT_ENCRYPTION_KEY = "REPLACE_WITH_32_CHAR_ENCRYPTION_KEY"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── KYC / Identity Verification ───────────────────────────────────────────────
resource "aws_secretsmanager_secret" "kyc" {
  name        = "${var.cluster_name}/kyc-risk-service/providers"
  description = "KYC provider API keys"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Service = "kyc-risk-service", Type = "kyc-credentials" })
}

resource "aws_secretsmanager_secret_version" "kyc" {
  secret_id = aws_secretsmanager_secret.kyc.id
  secret_string = jsonencode({
    DIGIO_CLIENT_ID     = "REPLACE_WITH_DIGIO_CLIENT_ID"
    DIGIO_CLIENT_SECRET = "REPLACE_WITH_DIGIO_CLIENT_SECRET"
    ONFIDO_API_TOKEN    = "REPLACE_WITH_ONFIDO_API_TOKEN"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Redis Connection ──────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "redis" {
  name        = "${var.cluster_name}/shared/redis"
  description = "Redis connection details (ElastiCache or cluster Redis)"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Type = "redis" })
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    REDIS_HOST     = "REPLACE_WITH_REDIS_HOST"
    REDIS_PORT     = "6379"
    REDIS_PASSWORD = "REPLACE_WITH_REDIS_AUTH_TOKEN"
    REDIS_TLS      = "true"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Kafka / MSK Credentials ───────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "kafka" {
  name        = "${var.cluster_name}/shared/kafka"
  description = "Kafka/MSK SASL credentials and bootstrap brokers"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Type = "kafka" })
}

resource "aws_secretsmanager_secret_version" "kafka" {
  secret_id = aws_secretsmanager_secret.kafka.id
  secret_string = jsonencode({
    KAFKA_BROKERS       = "REPLACE_WITH_MSK_BOOTSTRAP_BROKERS"
    KAFKA_SASL_USERNAME = "REPLACE_WITH_KAFKA_USER"
    KAFKA_SASL_PASSWORD = "REPLACE_WITH_KAFKA_PASSWORD"
    KAFKA_SSL           = "true"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Fraud Detection API ────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "fraud" {
  name        = "${var.cluster_name}/fraud-service/api-keys"
  description = "Fraud detection service API keys"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Service = "fraud-service", Type = "api-keys" })
}

resource "aws_secretsmanager_secret_version" "fraud" {
  secret_id = aws_secretsmanager_secret.fraud.id
  secret_string = jsonencode({
    SEON_API_KEY       = "REPLACE_WITH_SEON_API_KEY"
    SIGNIFYD_API_KEY   = "REPLACE_WITH_SIGNIFYD_API_KEY"
    ML_MODEL_ENDPOINT  = "REPLACE_WITH_SAGEMAKER_ENDPOINT"
  })
  lifecycle { ignore_changes = [secret_string] }
}

# ── Observability — Grafana / Alertmanager ────────────────────────────────────
resource "aws_secretsmanager_secret" "observability" {
  name        = "${var.cluster_name}/observability/credentials"
  description = "Grafana admin password and Alertmanager Slack/SMTP webhooks"
  kms_key_id  = aws_kms_key.secrets.arn
  recovery_window_in_days = 30
  tags = merge(var.tags, { Type = "observability" })
}

resource "aws_secretsmanager_secret_version" "observability" {
  secret_id = aws_secretsmanager_secret.observability.id
  secret_string = jsonencode({
    GRAFANA_ADMIN_PASSWORD     = "REPLACE_WITH_GRAFANA_PASSWORD"
    SLACK_WEBHOOK_CRITICAL     = "REPLACE_WITH_SLACK_WEBHOOK_CRITICAL"
    SLACK_WEBHOOK_WARNING      = "REPLACE_WITH_SLACK_WEBHOOK_WARNING"
    SLACK_WEBHOOK_PAYMENTS     = "REPLACE_WITH_SLACK_WEBHOOK_PAYMENTS"
    SLACK_WEBHOOK_SECURITY     = "REPLACE_WITH_SLACK_WEBHOOK_SECURITY"
    ALERT_EMAIL_LIST           = "oncall@banking.example.com"
    SMTP_USERNAME              = "REPLACE_WITH_SMTP_USER"
    SMTP_PASSWORD              = "REPLACE_WITH_SMTP_PASSWORD"
  })
  lifecycle { ignore_changes = [secret_string] }
}
