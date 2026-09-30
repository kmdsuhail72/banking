# =============================================================================
# Root Module — Banking Platform AWS Foundation
# Wires together: VPC, EKS, ECR, RDS/Aurora, S3, IAM/IRSA, Secrets Manager
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Project     = "banking-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    })
  }
}

locals {
  full_cluster_name = "${var.cluster_name}-${var.environment}"
}

# ── VPC (public + private + database subnets, NAT GWs, Flow Logs) ─────────────
module "vpc" {
  source = "./modules/vpc"

  cluster_name          = local.full_cluster_name
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  single_nat_gateway    = var.single_nat_gateway
  tags                  = var.tags
}

# ── EKS Cluster (3 node groups: application, system, spot) ───────────────────
module "eks" {
  source = "./modules/eks"

  cluster_name       = local.full_cluster_name
  cluster_version    = var.eks_version
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # Application node group
  node_instance_types = var.node_instance_types
  node_min            = var.node_min
  node_max            = var.node_max
  node_desired        = var.node_desired
  node_disk_size      = var.node_disk_size

  # System node group (Istio, monitoring, controllers)
  system_node_instance_types = var.system_node_instance_types
  system_node_min            = var.system_node_min
  system_node_max            = var.system_node_max
  system_node_desired        = var.system_node_desired

  # Spot node group (analytics, reporting, batch)
  spot_node_instance_types = var.spot_node_instance_types
  spot_node_min            = var.spot_node_min
  spot_node_max            = var.spot_node_max
  spot_node_desired        = var.spot_node_desired

  tags = var.tags
}

# ── ECR Repositories (one per microservice) ───────────────────────────────────
module "ecr" {
  source = "./modules/ecr"
  tags   = var.tags
}

# ── Aurora PostgreSQL (Multi-AZ, encrypted, in database subnets) ──────────────
module "rds" {
  source = "./modules/rds"

  cluster_name          = local.full_cluster_name
  vpc_id                = module.vpc.vpc_id
  db_subnet_group_name  = module.vpc.db_subnet_group_name
  database_subnet_ids   = module.vpc.database_subnet_ids
  private_subnet_cidrs  = var.private_subnet_cidrs
  vpc_cidr_block        = module.vpc.vpc_cidr_block

  engine          = var.aurora_engine
  engine_version  = var.aurora_engine_version
  instance_class  = var.aurora_instance_class
  replica_count   = var.aurora_replica_count
  database_name   = var.aurora_database_name
  master_username = var.aurora_master_username

  backup_retention_days       = var.aurora_backup_retention_days
  deletion_protection         = var.aurora_deletion_protection
  skip_final_snapshot         = var.aurora_skip_final_snapshot
  performance_insights_enabled = var.aurora_performance_insights

  tags = var.tags
}

# ── S3: Static Assets / Frontend (application data) ──────────────────────────
module "s3_assets" {
  source = "./modules/s3"

  cluster_name = local.full_cluster_name
  bucket_name  = "${local.full_cluster_name}-assets"
  purpose      = "static-assets"
  versioning   = true
  lifecycle_rules = [{
    id              = "expire-old-assets"
    prefix          = "uploads/"
    enabled         = true
    expiration_days = 365
  }]
  tags = var.tags
}

# ── S3: Loki Log Storage ──────────────────────────────────────────────────────
module "s3_loki" {
  source = "./modules/s3"

  cluster_name = local.full_cluster_name
  bucket_name  = "${local.full_cluster_name}-loki"
  purpose      = "loki-logs"
  versioning   = false
  lifecycle_rules = [{
    id              = "expire-old-logs"
    prefix          = ""
    enabled         = true
    expiration_days = 90
  }]
  tags = var.tags
}

# ── S3: Terraform State Backend ───────────────────────────────────────────────
module "s3_tf_state" {
  source = "./modules/s3"

  cluster_name = local.full_cluster_name
  bucket_name  = "${local.full_cluster_name}-terraform-state"
  purpose      = "terraform-state"
  versioning   = true
  tags         = var.tags
}

# ── IAM / IRSA Roles ──────────────────────────────────────────────────────────
module "iam" {
  source = "./modules/iam"

  cluster_name      = local.full_cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  aws_account_id    = var.aws_account_id
  tags              = var.tags
}

# ── AWS Secrets Manager (all application secrets) ─────────────────────────────
module "secrets" {
  source = "./modules/secrets"

  cluster_name                 = local.full_cluster_name
  aurora_endpoint              = module.rds.cluster_endpoint
  aurora_port                  = module.rds.port
  aurora_db                    = module.rds.database_name
  aurora_user                  = module.rds.master_username
  aurora_master_user_secret_arn = module.rds.master_user_secret_arn
  tags                         = var.tags

  depends_on = [module.rds]
}
