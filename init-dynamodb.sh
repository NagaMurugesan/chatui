#!/bin/bash
set -e

echo "Initializing DynamoDB Local..."

# Configure AWS CLI for local DynamoDB
export AWS_ACCESS_KEY_ID=fake
export AWS_SECRET_ACCESS_KEY=fake
export AWS_DEFAULT_REGION=us-east-1
ENDPOINT="http://localhost:8000"

# Create Users Table
echo "Creating Users table..."
aws dynamodb create-table \
    --table-name Users \
    --attribute-definitions AttributeName=email,AttributeType=S \
    --key-schema AttributeName=email,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "Users table already exists"

# Create ChatSessions Table
echo "Creating ChatSessions table..."
aws dynamodb create-table \
    --table-name ChatSessions \
    --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=chatId,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH AttributeName=chatId,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "ChatSessions table already exists"

# Create ChatMessages Table
echo "Creating ChatMessages table..."
aws dynamodb create-table \
    --table-name ChatMessages \
    --attribute-definitions AttributeName=chatId,AttributeType=S AttributeName=timestamp,AttributeType=S \
    --key-schema AttributeName=chatId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "ChatMessages table already exists"

# Create SSOConfig Table
echo "Creating SSOConfig table..."
aws dynamodb create-table \
    --table-name SSOConfig \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "SSOConfig table already exists"

# Create Secrets Table
echo "Creating Secrets table..."
aws dynamodb create-table \
    --table-name Secrets \
    --attribute-definitions AttributeName=name,AttributeType=S \
    --key-schema AttributeName=name,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "Secrets table already exists"

# Wait for tables to be active
echo "Waiting for tables to be ready..."
sleep 3

# Insert Admin User
echo "Inserting admin user..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
USER_ID=$(uuidgen)

aws dynamodb put-item \
    --table-name Users \
    --item '{
        "email": {"S": "admin@example.com"},
        "userId": {"S": "'"$USER_ID"'"},
        "password": {"S": "$2a$10$VIcbidMjhUYnmqkX3gRoJeIDSDnnmkfuJNvKUrWumIVc0y9VhCQou"},
        "firstName": {"S": "Admin"},
        "lastName": {"S": "User"},
        "role": {"S": "admin"},
        "authType": {"S": "local"},
        "createdAt": {"S": "'"$TIMESTAMP"'"}
    }' \
    --endpoint-url $ENDPOINT 2>/dev/null || echo "Admin user already exists"

echo "✅ DynamoDB initialization complete!"
echo "Admin credentials: admin@example.com / admin"
