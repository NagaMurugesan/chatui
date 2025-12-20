#!/bin/bash
set -ex

# 1. System Updates & Basic Tools
dnf update -y
dnf install -y git  wget unzip tar gzip

# 2. Install Docker
# Amazon Linux 2023 uses standard packages for Docker
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose (Standalone binary method is most reliable across AWS Linux versions)
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker/cli-plugins}
mkdir -p $DOCKER_CONFIG
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/docker-compose
chmod +x $DOCKER_CONFIG/docker-compose

# Install Docker Buildx (Required for 'docker compose build')
# AL2023 'docker' package might miss this or have an old version.
curl -SL https://github.com/docker/buildx/releases/download/v0.30.1/buildx-v0.30.1.linux-amd64 -o $DOCKER_CONFIG/docker-buildx
chmod +x $DOCKER_CONFIG/docker-buildx

# 3. Nvidia Container Toolkit
# Configure the repository for Amazon Linux 2023 (RHEL compatible)
curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  tee /etc/yum.repos.d/nvidia-container-toolkit.repo

dnf install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# 4. Install Ollama
# Ollama install script detects Linux and installs mostly static binaries, works on AL2023
curl -fsSL https://ollama.com/install.sh | sh
# Start Ollama service
systemctl start ollama

# 5. Application Setup
# Clone Repo into ec2-user home
cd /home/ec2-user
git clone https://github.com/NagaMurugesan/chatui.git app
cd app
chown -R ec2-user:ec2-user /home/ec2-user/app

# Copy production nginx config (HTTP only - ALB handles SSL)
cp nginx-proxy/nginx-http.conf.template nginx-proxy/nginx.conf.template

# 6. Start Application with production environment
# Enable "host.docker.internal" mapping in docker-compose.yml for containers to reach host Ollama
sed -i '/    environment:/i \    extra_hosts:\n      - "host.docker.internal:host-gateway"' docker-compose.yml

# Run with production environment file
docker compose --env-file .env.production up -d --build

# 7. Pull LLM Model
# Wait for Ollama to be ready
sleep 10
ollama pull mistral

# 8. Initialize DynamoDB tables
sleep 5
chmod +x init-dynamodb.sh
./init-dynamodb.sh

echo "Deployment Complete"
