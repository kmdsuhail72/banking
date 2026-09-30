# =============================================================================
# RDS / Aurora Module — Banking Platform
# Creates: Aurora PostgreSQL Multi-AZ cluster, KMS encryption, enhanced
#          monitoring, Performance Insights, automated backups, security group
# =============================================================================

# ── KMS Key for Aurora encryption at rest ────────────────────────────────────
resource "aws_kms_key" "aurora" {
  description             = "${var.cluster_name} Aurora PostgreSQL encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = merge(var.tags, { Name = "${var.cluster_name}-aurora-kms" })
}

resource "aws_kms_alias" "aurora" {
  name          = "alias/${var.cluster_name}-aurora"
  target_key_id = aws_kms_key.aurora.key_id
}

# ── Security Group (EKS nodes -> RDS only, no public access) ──────────────────
resource "aws_security_group" "aurora" {
  name        = "${var.cluster_name}-aurora-sg"
  description = "Aurora PostgreSQL — allow inbound from EKS private subnets only"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from EKS private subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.private_subnet_cidrs
  }

  egress {
    from_port   = 0; to_port = 0; protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.cluster_name}-aurora-sg" })
}

# ── IAM role for RDS Enhanced Monitoring ─────────────────────────────────────
data "aws_iam_policy_document" "rds_monitoring_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["monitoring.rds.amazonaws.com"] }
  }
}

resource "aws_iam_role" "rds_monitoring" {
  name               = "${var.cluster_name}-rds-monitoring-role"
  assume_role_policy = data.aws_iam_policy_document.rds_monitoring_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ── Aurora Cluster Parameter Group ────────────────────────────────────────────
resource "aws_rds_cluster_parameter_group" "banking" {
  name        = "${var.cluster_name}-aurora-pg16"
  family      = "aurora-postgresql16"
  description = "Banking Platform Aurora PostgreSQL 16 cluster parameters"

  parameter {
    name  = "log_statement"
    value = "ddl"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # log queries taking > 1s
  }
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = var.tags
}

resource "aws_db_parameter_group" "banking" {
  name   = "${var.cluster_name}-aurora-instance-pg16"
  family = "aurora-postgresql16"
  description = "Banking Platform Aurora instance parameters"

  parameter {
    name  = "log_autovacuum_min_duration"
    value = "0"
  }

  tags = var.tags
}

# ── Aurora Cluster ────────────────────────────────────────────────────────────
resource "aws_rds_cluster" "banking" {
  cluster_identifier              = "${var.cluster_name}-aurora"
  engine                          = var.engine
  engine_version                  = var.engine_version
  database_name                   = var.database_name
  master_username                 = var.master_username
  manage_master_user_password     = true   # Aurora manages password in Secrets Manager
  master_user_secret_kms_key_id   = aws_kms_key.aurora.arn

  db_subnet_group_name            = var.db_subnet_group_name
  vpc_security_group_ids          = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.banking.name

  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.aurora.arn

  backup_retention_period         = var.backup_retention_days
  preferred_backup_window         = var.preferred_backup_window
  preferred_maintenance_window    = var.preferred_maintenance_window
  copy_tags_to_snapshot           = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection             = var.deletion_protection
  skip_final_snapshot             = var.skip_final_snapshot
  final_snapshot_identifier       = var.skip_final_snapshot ? null : "${var.cluster_name}-aurora-final-${formatdate("YYYYMMDD", timestamp())}"

  tags = merge(var.tags, { Name = "${var.cluster_name}-aurora" })

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
      master_password,
    ]
  }
}

# ── Aurora Writer Instance ─────────────────────────────────────────────────────
resource "aws_rds_cluster_instance" "writer" {
  identifier                   = "${var.cluster_name}-aurora-writer"
  cluster_identifier           = aws_rds_cluster.banking.id
  instance_class               = var.instance_class
  engine                       = var.engine
  engine_version               = var.engine_version
  db_parameter_group_name      = aws_db_parameter_group.banking.name

  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  performance_insights_kms_key_id       = aws_kms_key.aurora.arn

  auto_minor_version_upgrade   = true
  publicly_accessible          = false

  tags = merge(var.tags, { Role = "writer" })
}

# ── Aurora Read Replicas (Multi-AZ) ───────────────────────────────────────────
resource "aws_rds_cluster_instance" "reader" {
  count                        = var.replica_count
  identifier                   = "${var.cluster_name}-aurora-reader-${count.index}"
  cluster_identifier           = aws_rds_cluster.banking.id
  instance_class               = var.instance_class
  engine                       = var.engine
  engine_version               = var.engine_version
  db_parameter_group_name      = aws_db_parameter_group.banking.name

  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_retention_period
  performance_insights_kms_key_id       = aws_kms_key.aurora.arn

  auto_minor_version_upgrade   = true
  publicly_accessible          = false

  tags = merge(var.tags, { Role = "reader", Index = tostring(count.index) })
}

# ── CloudWatch Alarms for Aurora ──────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "aurora_cpu" {
  alarm_name          = "${var.cluster_name}-aurora-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora CPU > 80% for 3 consecutive minutes"
  dimensions          = { DBClusterIdentifier = aws_rds_cluster.banking.cluster_identifier }
  tags                = var.tags
}

resource "aws_cloudwatch_metric_alarm" "aurora_connections" {
  alarm_name          = "${var.cluster_name}-aurora-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 800
  alarm_description   = "Aurora connections > 800"
  dimensions          = { DBClusterIdentifier = aws_rds_cluster.banking.cluster_identifier }
  tags                = var.tags
}
