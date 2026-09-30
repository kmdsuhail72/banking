variable "cluster_name"         { type = string }
variable "vpc_id"               { type = string }
variable "db_subnet_group_name" { type = string }
variable "database_subnet_ids"  { type = list(string) }
variable "private_subnet_cidrs" { type = list(string); description = "EKS nodes CIDRs — allowed to reach RDS" }
variable "vpc_cidr_block"       { type = string }

variable "engine"               { type = string; default = "aurora-postgresql" }
variable "engine_version"       { type = string; default = "16.4" }
variable "instance_class"       { type = string; default = "db.r6g.large" }
variable "replica_count"        { type = number; default = 1; description = "Number of Aurora read replicas (0 = writer only)" }

variable "database_name"        { type = string; default = "banking" }
variable "master_username"      { type = string; default = "banking_admin" }

variable "backup_retention_days"   { type = number; default = 7 }
variable "preferred_backup_window" { type = string; default = "03:00-04:00" }
variable "preferred_maintenance_window" { type = string; default = "sun:04:00-sun:05:00" }

variable "deletion_protection" { type = bool; default = true }
variable "skip_final_snapshot" { type = bool; default = false }

variable "performance_insights_enabled"          { type = bool; default = true }
variable "performance_insights_retention_period" { type = number; default = 7 }

variable "tags" { type = map(string); default = {} }
