output "vpc_id"               { value = aws_vpc.this.id }
output "public_subnet_ids"    { value = aws_subnet.public[*].id }
output "private_subnet_ids"   { value = aws_subnet.private[*].id }
output "database_subnet_ids"  { value = aws_subnet.database[*].id }
output "db_subnet_group_name" { value = length(aws_db_subnet_group.this) > 0 ? aws_db_subnet_group.this[0].name : "" }
output "vpc_cidr_block"       { value = aws_vpc.this.cidr_block }
