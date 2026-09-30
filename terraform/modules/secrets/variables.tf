variable "cluster_name"    { type = string }
variable "aurora_endpoint" { type = string }
variable "aurora_port"     { type = number; default = 5432 }
variable "aurora_db"       { type = string; default = "banking" }
variable "aurora_user"     { type = string; default = "banking_admin" }
variable "aurora_master_user_secret_arn" { type = string; description = "Aurora-managed master password secret ARN" }
variable "tags"            { type = map(string); default = {} }
