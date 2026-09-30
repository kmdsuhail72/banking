output "github_actions_role_arn"  { value = aws_iam_role.github_actions.arn }
output "loki_role_arn"            { value = aws_iam_role.loki.arn }
output "external_secrets_role_arn" { value = aws_iam_role.external_secrets.arn }
output "app_secrets_role_arn"     { value = aws_iam_role.app_secrets.arn }
output "rds_monitoring_role_arn"  { value = aws_iam_role.rds_monitoring.arn }
