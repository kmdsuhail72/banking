# =============================================================================
# Root Variables — Banking Platform AWS Foundation
# =============================================================================

# ── Core ──────────────────────────────────────────────────────────────────────
variable "aws_region"     { type = string; default = "us-east-1" }
variable "aws_account_id" {
  type        = string
  description = "12-digit AWS account ID"
  default     = "111122223333"  # TODO: replace with your real account ID
}
variable "cluster_name"   { type = string; default = "banking-eks" }
variable "environment"    { type = string }
variable "eks_version"    { type = string; default = "1.32" }

variable "tags" {
  type    = map(string)
  default = {}
}

# ── VPC ───────────────────────────────────────────────────────────────────────
variable "vpc_cidr" { type = string; default = "10.0.0.0/16" }

variable "availability_zones" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "EKS node subnets — egress via NAT, no public IPs"
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "Isolated database subnets — no route to internet whatsoever"
  default     = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

variable "single_nat_gateway" {
  type        = bool
  default     = false
  description = "Use a single shared NAT GW (cost saving for staging; false = HA for prod)"
}

# ── EKS Application Node Group ─────────────────────────────────────────────────
variable "node_instance_types" { type = list(string); default = ["m5.xlarge"] }
variable "node_min"            { type = number; default = 2 }
variable "node_max"            { type = number; default = 8 }
variable "node_desired"        { type = number; default = 3 }
variable "node_disk_size"      { type = number; default = 50 }

# ── EKS System Node Group (Istio, monitoring, ArgoCD) ─────────────────────────
variable "system_node_instance_types" { type = list(string); default = ["m5.large"] }
variable "system_node_min"            { type = number; default = 2 }
variable "system_node_max"            { type = number; default = 4 }
variable "system_node_desired"        { type = number; default = 2 }

# ── EKS Spot Node Group (analytics, batch, reporting) ─────────────────────────
variable "spot_node_instance_types" {
  type    = list(string)
  default = ["m5.xlarge", "m5a.xlarge", "m4.xlarge"]
}
variable "spot_node_min"     { type = number; default = 0 }
variable "spot_node_max"     { type = number; default = 10 }
variable "spot_node_desired" { type = number; default = 2 }

# ── Aurora PostgreSQL ──────────────────────────────────────────────────────────
variable "aurora_engine"              { type = string; default = "aurora-postgresql" }
variable "aurora_engine_version"      { type = string; default = "16.4" }
variable "aurora_instance_class"      { type = string; default = "db.r6g.large" }
variable "aurora_replica_count"       { type = number; default = 1 }
variable "aurora_database_name"       { type = string; default = "banking" }
variable "aurora_master_username"     { type = string; default = "banking_admin" }
variable "aurora_backup_retention_days" { type = number; default = 7 }
variable "aurora_deletion_protection" { type = bool; default = true }
variable "aurora_skip_final_snapshot" { type = bool; default = false }
variable "aurora_performance_insights" { type = bool; default = true }
