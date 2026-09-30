variable "cluster_name"         { type = string }
variable "vpc_cidr"             { type = string }
variable "availability_zones"   { type = list(string) }
variable "public_subnet_cidrs"  { type = list(string) }
variable "private_subnet_cidrs" { type = list(string) }
variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for isolated RDS/Aurora subnets (no route to internet)"
  default     = []
}
variable "single_nat_gateway"   { type = bool; default = false }
variable "tags"                  { type = map(string); default = {} }
