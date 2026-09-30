variable "cluster_name" { type = string }
variable "bucket_name"  { type = string }
variable "purpose"      { type = string; default = "general" }
variable "versioning"   { type = bool; default = true }
variable "lifecycle_rules" {
  type = list(object({
    id              = string
    prefix          = string
    enabled         = bool
    expiration_days = number
  }))
  default = []
}
variable "tags" { type = map(string); default = {} }
