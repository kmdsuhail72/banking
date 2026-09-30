# =============================================================================
# Production Environment — Banking Platform
# Run: cd terraform/environments/production && terraform init && terraform apply
# =============================================================================

terraform {
  backend "s3" {
    # TODO: Pre-create this bucket (run bootstrap/bootstrap.sh first)
    bucket         = "banking-eks-production-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "banking-terraform-locks"
    kms_key_id     = "alias/banking-eks-production-secrets"  # created by first apply
  }
}

module "banking_infra" {
  source = "../../"

  environment    = "production"
  aws_region     = "us-east-1"
  aws_account_id = "111122223333"  # TODO: replace with your real AWS account ID
  cluster_name   = "banking-eks"
  eks_version    = "1.32"

  # VPC — 3 AZs for full HA
  availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
  vpc_cidr              = "10.0.0.0/16"
  public_subnet_cidrs   = ["10.0.0.0/24",  "10.0.1.0/24",  "10.0.2.0/24"]
  private_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  database_subnet_cidrs = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
  single_nat_gateway    = false  # HA: one NAT GW per AZ (3 total)

  # EKS — Application node group (microservices)
  node_instance_types = ["m5.xlarge"]
  node_min            = 3
  node_max            = 20
  node_desired        = 6
  node_disk_size      = 50

  # EKS — System node group (Istio, monitoring, ArgoCD, cert-manager)
  system_node_instance_types = ["m5.large"]
  system_node_min            = 2
  system_node_max            = 4
  system_node_desired        = 3

  # EKS — Spot node group (analytics, reporting, fraud ML, batch)
  spot_node_instance_types = ["m5.xlarge", "m5a.xlarge", "m4.xlarge"]
  spot_node_min            = 0
  spot_node_max            = 15
  spot_node_desired        = 3

  # Aurora PostgreSQL — Multi-AZ with 1 read replica
  aurora_engine               = "aurora-postgresql"
  aurora_engine_version       = "16.4"
  aurora_instance_class       = "db.r6g.xlarge"  # 4 vCPU, 32GB RAM
  aurora_replica_count        = 2                # writer + 2 readers
  aurora_database_name        = "banking"
  aurora_master_username      = "banking_admin"
  aurora_backup_retention_days = 14
  aurora_deletion_protection  = true
  aurora_skip_final_snapshot  = false
  aurora_performance_insights = true

  tags = {
    Environment = "production"
    Team        = "platform"
    CostCenter  = "engineering"
    Compliance  = "PCI-DSS"
  }
}

# ── Production Outputs ────────────────────────────────────────────────────────
output "cluster_name"             { value = module.banking_infra.cluster_name }
output "cluster_endpoint"         { value = module.banking_infra.cluster_endpoint }
output "kubeconfig_command"       { value = module.banking_infra.kubeconfig_command }
output "aurora_writer_endpoint"   { value = module.banking_infra.aurora_writer_endpoint }
output "aurora_reader_endpoint"   { value = module.banking_infra.aurora_reader_endpoint }
output "aurora_master_secret_arn" { value = module.banking_infra.aurora_master_secret_arn }
output "get_aurora_password"      { value = module.banking_infra.get_aurora_password_command }
output "ecr_repository_urls"      { value = module.banking_infra.ecr_repository_urls }
output "github_actions_role_arn"  { value = module.banking_infra.github_actions_role_arn }
output "external_secrets_role_arn" { value = module.banking_infra.external_secrets_role_arn }
output "s3_assets_bucket"         { value = module.banking_infra.s3_assets_bucket }
output "jwt_secret_arn"           { value = module.banking_infra.jwt_secret_arn }
output "db_config_secret_arns"    { value = module.banking_infra.db_config_secret_arns }
