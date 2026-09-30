variable "cluster_name"       { type = string }
variable "cluster_version"    { type = string; default = "1.32" }
variable "vpc_id"             { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "public_subnet_ids"  { type = list(string) }

# ── Application node group (stateless microservices) ─────────────────────────
variable "node_instance_types" { type = list(string); default = ["m5.xlarge"] }
variable "node_min"            { type = number; default = 2 }
variable "node_max"            { type = number; default = 8 }
variable "node_desired"        { type = number; default = 3 }
variable "node_disk_size"      { type = number; default = 50 }

# ── System/infra node group (Istio, monitoring, controllers) ─────────────────
variable "system_node_instance_types" { type = list(string); default = ["m5.large"] }
variable "system_node_min"            { type = number; default = 2 }
variable "system_node_max"            { type = number; default = 4 }
variable "system_node_desired"        { type = number; default = 2 }

# ── Spot node group (analytics / batch — cost-optimised) ─────────────────────
variable "spot_node_instance_types" {
  type    = list(string)
  default = ["m5.xlarge", "m5a.xlarge", "m4.xlarge"]
}
variable "spot_node_min"     { type = number; default = 0 }
variable "spot_node_max"     { type = number; default = 10 }
variable "spot_node_desired" { type = number; default = 2 }

variable "tags" { type = map(string); default = {} }
