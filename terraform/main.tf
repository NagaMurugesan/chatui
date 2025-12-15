terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# --- VPC Module ---
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = var.environment
  app_name           = var.app_name
}

# --- Database Module (Aurora + DynamoDB) ---
module "database" {
  source = "./modules/database"

  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  app_name            = var.app_name
  environment         = var.environment
  db_username         = var.db_username
  db_password         = var.db_password
  vpc_security_group_id = module.ecs.ecs_security_group_id # Allow access from ECS
}

# --- ECS Module (Backend + MCP) ---
module "ecs" {
  source = "./modules/ecs"

  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  app_name            = var.app_name
  environment         = var.environment
  
  # Database Connections
  db_endpoint         = module.database.aurora_endpoint
  dynamodb_table_chats_arn = module.database.dynamodb_chats_arn
  
  # Secrets (Pass via Secrets Manager in prod, vars for now)
  jwt_secret          = var.jwt_secret
  db_password         = var.db_password
}

# --- Frontend Module (S3 + CloudFront) ---
module "frontend" {
  source = "./modules/frontend"

  app_name    = var.app_name
  environment = var.environment
}
