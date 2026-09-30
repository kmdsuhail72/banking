# =============================================================================
# Root Outputs — Banking Platform AWS Foundation
# =============================================================================

# ── EKS ───────────────────────────────────────────────────────────────────────
output "cluster_name"      { value = module.eks.cluster_name }
output "cluster_endpoint"  { value = module.eks.cluster_endpoint }
output "cluster_version"   { value = module.eks.cluster_version }
output "oidc_provider_arn" { value = module.eks.oidc_provider_arn }
output "eks_kms_key_arn"   { value = module.eks.kms_key_arn }

# ── VPC ───────────────────────────────────────────────────────────────────────
output "vpc_id"              { value = module.vpc.vpc_id }
output "public_subnet_ids"   { value = module.vpc.public_subnet_ids }
output "private_subnet_ids"  { value = module.vpc.private_subnet_ids }
output "database_subnet_ids" { value = module.vpc.database_subnet_ids }

# ── RDS / Aurora ──────────────────────────────────────────────────────────────
output "aurora_writer_endpoint"  { value = module.rds.cluster_endpoint }
output "aurora_reader_endpoint"  { value = module.rds.reader_endpoint }
output "aurora_database_name"    { value = module.rds.database_name }
output "aurora_port"             { value = module.rds.port }
output "aurora_master_secret_arn" {
  value       = module.rds.master_user_secret_arn
  description = "Aurora-managed master password — read with: aws secretsmanager get-secret-value --secret-id <arn>"
}

# ── S3 ────────────────────────────────────────────────────────────────────────
output "s3_assets_bucket"     { value = module.s3_assets.bucket_id }
output "s3_loki_bucket"       { value = module.s3_loki.bucket_id }
output "s3_tf_state_bucket"   { value = module.s3_tf_state.bucket_id }

# ── ECR ───────────────────────────────────────────────────────────────────────
output "ecr_repository_urls" { value = module.ecr.repository_urls }

# ── IAM / IRSA ────────────────────────────────────────────────────────────────
output "github_actions_role_arn"   { value = module.iam.github_actions_role_arn }
output "external_secrets_role_arn" { value = module.iam.external_secrets_role_arn }
output "loki_irsa_role_arn"        { value = module.iam.loki_role_arn }

# ── Secrets Manager ───────────────────────────────────────────────────────────
output "secrets_kms_key_arn"       { value = module.secrets.secrets_kms_key_arn }
output "jwt_secret_arn"            { value = module.secrets.jwt_secret_arn }
output "payment_gateway_secret_arn" { value = module.secrets.payment_gateway_secret_arn }
output "db_config_secret_arns"     { value = module.secrets.db_config_secret_arns }

# ── Convenience Commands ───────────────────────────────────────────────────────
output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "get_aurora_password_command" {
  value = "aws secretsmanager get-secret-value --secret-id ${module.rds.master_user_secret_arn} --query SecretString --output text | jq -r .password"
}
