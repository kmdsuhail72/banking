output "secrets_kms_key_arn"        { value = aws_kms_key.secrets.arn }
output "jwt_secret_arn"             { value = aws_secretsmanager_secret.jwt.arn }
output "payment_gateway_secret_arn" { value = aws_secretsmanager_secret.payment_gateway.arn }
output "kyc_secret_arn"             { value = aws_secretsmanager_secret.kyc.arn }
output "redis_secret_arn"           { value = aws_secretsmanager_secret.redis.arn }
output "kafka_secret_arn"           { value = aws_secretsmanager_secret.kafka.arn }
output "fraud_secret_arn"           { value = aws_secretsmanager_secret.fraud.arn }
output "observability_secret_arn"   { value = aws_secretsmanager_secret.observability.arn }
output "db_config_secret_arns" {
  value = { for k, v in aws_secretsmanager_secret.db_config : k => v.arn }
}
