#!/bin/bash

# Base URL
API_URL="http://localhost:3000"

# 1. Register
echo "Registering..."
EMAIL="testuser$(date +%s)@example.com"
PASSWORD="password123"
FIRST_NAME="Test"
LAST_NAME="User"

REGISTER_RES=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"firstName\": \"$FIRST_NAME\", \"lastName\": \"$LAST_NAME\"}")

echo "Register Response: $REGISTER_RES"

# 2. Login
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
  echo "Login failed"
  exit 1
fi

# 3. Create Chat
echo "Creating Chat..."
CREATE_CHAT_RES=$(curl -s -X POST "$API_URL/chats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}")

CHAT_ID=$(echo $CREATE_CHAT_RES | grep -o '"chatId":"[^"]*' | cut -d'"' -f4)
echo "Chat ID: $CHAT_ID"

if [ -z "$CHAT_ID" ]; then
  echo "Create Chat failed"
  exit 1
fi

# 4. Rename Chat
echo "Renaming Chat..."
NEW_TITLE="Renamed Chat Title"
RENAME_RES=$(curl -s -X PUT "$API_URL/chats/$CHAT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"$NEW_TITLE\"}")

echo "Rename Response: $RENAME_RES"

# 5. Verify
echo "Verifying..."
GET_CHATS_RES=$(curl -s -X GET "$API_URL/chats" \
  -H "Authorization: Bearer $TOKEN")

if [[ "$GET_CHATS_RES" == *"$NEW_TITLE"* ]]; then
  echo "SUCCESS: Chat renamed successfully!"
else
  echo "FAILURE: Chat title not found."
  echo "Chats: $GET_CHATS_RES"
fi
