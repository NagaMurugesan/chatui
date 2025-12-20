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

# --- Variables ---
variable "aws_region" { default = "us-east-1" }
variable "key_name" { description = "Name of existing SSH Key Pair" }
variable "instance_type" { default = "g6.xlarge" } # GPU Instance
variable "app_name" { default = "gravity-chat-ec2" }
variable "my_ip" { description = "Your IP address for SSH access (CIDR)" }
variable "domain_name" { 
  description = "Domain name for the application (e.g., chat.example.com)"
  type        = string
}
variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS validation"
  type        = string
}

# --- VPC & Networking ---
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.app_name}-vpc" }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
  
  tags = { Name = "${var.app_name}-subnet-1" }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}b"
  
  tags = { Name = "${var.app_name}-subnet-2" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# --- Security Group ---
resource "aws_security_group" "sg" {
  name   = "${var.app_name}-ec2-sg"
  vpc_id = aws_vpc.main.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip] 
  }

  # HTTP from ALB only
  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Egress (Allow all)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.app_name}-ec2-sg"
  }
}

# --- AMI (Ubuntu Deep Learning) ---
data "aws_ami" "ubuntu_dlami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.* (Ubuntu 22.04) *"]
  }
}

# --- EC2 Instance ---
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu_dlami.id
  instance_type = var.instance_type
  key_name      = var.key_name
  subnet_id     = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.sg.id]

  # Storage (Increase for Models/Docker)
  root_block_device {
    volume_size = 100
    volume_type = "gp3"
  }

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "${var.app_name}-gpu-server"
  }
}

# --- Route53 Record ---
resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

# --- Outputs ---
output "public_ip" {
  value = aws_instance.app_server.public_ip
}

output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "ALB DNS name"
}

output "application_url" {
  value       = "https://${var.domain_name}"
  description = "Application URL (after DNS propagation)"
}

output "ssh_command" {
  value = "ssh -i ${var.key_name}.pem ec2-user@${aws_instance.app_server.public_ip}"
}
