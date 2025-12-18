#!/bin/bash
set -ex

# 1. System Updates & Basic Tools
apt-get update
apt-get install -y git curl wget unzip build-essential

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose (latest plugin)
apt-get install -y docker-compose-plugin

# 3. Nvidia Container Toolkit (Crucial for GPU inside Docker)
# Often installed on DLAMI, but ensuring it's set up for Docker
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker

# 4. Install Ollama (Host level - optional, mainly runs in container but good for testing)
curl -fsSL https://ollama.com/install.sh | sh
# Enable Ollama service
systemctl start ollama

# 5. Application Setup
# Clone Repo
cd /home/ubuntu
git clone https://github.com/NagaMurugesan/chatui.git app
cd app
chown -R ubuntu:ubuntu /home/ubuntu/app

# Create .env file (Populate with variables)
cat <<EOT > .env
PORT=3000
AWS_REGION=us-east-1
# Using local DynamoDB in container
DYNAMODB_ENDPOINT=http://dynamodb-local:8000
TABLE_CHATS=ChatSessions
TABLE_MESSAGES=ChatMessages
TABLE_USERS=Users
JWT_SECRET=production_secret_change_me
# Ollama runs on host or special container networking
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=mistral
POSTGRES_HOST=postgres
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=mcpdb
EOT

# 6. Start Application
# Re-build ensuring we use the host's GPU if mapped
# Current docker-compose needs update to map GPU to MCP/Ollama if running inside 
# For now, we assume Ollama runs on host (port 11434) and containers talk to it.

# Update docker-compose.yml to allow host networking for Ollama access or use host.docker.internal
# Adding extra_hosts to backend and mcp-server
sed -i '/    environment:/i \    extra_hosts:\n      - "host.docker.internal:host-gateway"' docker-compose.yml

docker compose up -d --build

# 7. Pull LLM Model
# Wait for Ollama to be ready
sleep 10
ollama pull mistral
# If using gemma:
ollama pull gemma:9b

echo "Deployment Complete"
