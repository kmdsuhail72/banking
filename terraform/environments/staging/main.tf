# =============================================================================
# Staging Environment — Banking Platform  
# Cost-optimised: single NAT GW, smaller instances, no deletion protection
# =============================================================================

terraform {
  backend "s3" {
    bucket         = "banking-eks-staging-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "banking-terraform-locks"
  }
}

module "banking_infra" {
  source = "../../"

  environment    = "staging"
  aws_region     = "us-east-1"
  aws_account_id = "111122223333"  # TODO: replace
  cluster_name   = "banking-eks"
  eks_version    = "1.32"

  # VPC — 2 AZs to save cost
  availability_zones    = ["us-east-1a", "us-east-1b"]
  vpc_cidr              = "10.1.0.0/16"
  public_subnet_cidrs   = ["10.1.0.0/24",  "10.1.1.0/24"]
  private_subnet_cidrs  = ["10.1.10.0/24", "10.1.11.0/24"]
  database_subnet_cidrs = ["10.1.20.0/24", "10.1.21.0/24"]
  single_nat_gateway    = true  # single NAT GW saves ~$100/month

  # EKS — smaller nodes for staging
  node_instance_types = ["m5.large"]
  node_min            = 2
  node_max            = 6
  node_desired        = 2
  node_disk_size      = 30

  system_node_instance_types = ["t3.medium"]
  system_node_min            = 1
  system_node_max            = 2
  system_node_desired        = 1

  spot_node_min     = 0
  spot_node_max     = 3
  spot_node_desired = 1

  # Aurora — writer only (no read replicas for staging)
  aurora_instance_class       = "db.t4g.medium"
  aurora_replica_count        = 0
  aurora_backup_retention_days = 3
  aurora_deletion_protection  = false
  aurora_skip_final_snapshot  = true
  aurora_performance_insights = false

  tags = {
    Environment = "staging"
    Team        = "platform"
    AutoShutdown = "true"  # tag for cost-saving automation
  }
}

output "cluster_name"           { value = module.banking_infra.cluster_name }
output "kubeconfig_command"     { value = module.banking_infra.kubeconfig_command }
output "aurora_writer_endpoint" { value = module.banking_infra.aurora_writer_endpoint }
output "aurora_master_secret_arn" { value = module.banking_infra.aurora_master_secret_arn }
