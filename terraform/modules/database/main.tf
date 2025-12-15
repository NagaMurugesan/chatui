variable "vpc_id" {}
variable "private_subnet_ids" { type = list(string) }
variable "app_name" {}
variable "environment" {}
variable "db_username" {}
variable "db_password" {}
variable "vpc_security_group_id" {} # SG from ECS to allow access

# --- Security Group for Aurora ---
resource "aws_security_group" "aurora_sg" {
  name        = "${var.app_name}-aurora-sg"
  description = "Security group for Aurora PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.vpc_security_group_id]
  }

  tags = {
    Name = "${var.app_name}-aurora-sg"
  }
}

# --- Aurora Serverless v2 Cluster ---
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_rds_cluster" "postgresql" {
  cluster_identifier      = "${var.app_name}-aurora-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.4" # Verify version supports pgvector
  database_name           = "mcpdb"
  master_username         = var.db_username
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.aurora_sg.id]
  skip_final_snapshot     = true
  
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 128.0
  }
}

resource "aws_rds_cluster_instance" "postgresql_instance" {
  cluster_identifier = aws_rds_cluster.postgresql.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.postgresql.engine
  engine_version     = aws_rds_cluster.postgresql.engine_version
}

# --- DynamoDB Tables ---
resource "aws_dynamodb_table" "chats" {
  name           = "ChatSessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "id"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "ChatSessions"
  }
}

resource "aws_dynamodb_table" "messages" {
  name           = "ChatMessages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "chatId"
  range_key      = "timestamp"

  attribute {
    name = "chatId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }
}

output "aurora_endpoint" {
  value = aws_rds_cluster.postgresql.endpoint
}

output "dynamodb_chats_arn" {
  value = aws_dynamodb_table.chats.arn
}
