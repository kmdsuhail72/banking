output "cluster_endpoint"       { value = aws_rds_cluster.banking.endpoint }
output "reader_endpoint"        { value = aws_rds_cluster.banking.reader_endpoint }
output "cluster_identifier"     { value = aws_rds_cluster.banking.cluster_identifier }
output "database_name"          { value = aws_rds_cluster.banking.database_name }
output "master_username"        { value = aws_rds_cluster.banking.master_username; sensitive = true }
output "port"                   { value = aws_rds_cluster.banking.port }
output "security_group_id"      { value = aws_security_group.aurora.id }
output "kms_key_arn"            { value = aws_kms_key.aurora.arn }
output "master_user_secret_arn" { value = aws_rds_cluster.banking.master_user_secret[0].secret_arn }
output "rds_monitoring_role_arn" { value = aws_iam_role.rds_monitoring.arn }
