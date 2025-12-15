variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application Name"
  default     = "gravity-chat"
}

variable "environment" {
  description = "Environment (dev, prod)"
  default     = "prod"
}

variable "vpc_cidr" {
  description = "VPC CIDR Block"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_username" {
  description = "Database Master Username"
  default     = "postgres"
}

variable "db_password" {
  description = "Database Master Password"
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT Secret Key"
  sensitive   = true
}
