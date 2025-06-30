#!/bin/bash

echo "🧪 Testing JWT Authentication"
echo "================================="

BASE_URL="http://localhost:4567"

# First, login to get a JWT token
echo "1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt "$BASE_URL/login")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o 'csrf":"[^"]*' | cut -d'"' -f3)

if [ -z "$CSRF_TOKEN" ]; then
    echo "❌ Failed to get CSRF token"
    exit 1
fi

echo "✅ CSRF token obtained: ${CSRF_TOKEN:0:20}..."

# Login (replace with your actual username/password)
echo "2. Logging in..."
read -p "Enter username: " USERNAME
read -s -p "Enter password: " PASSWORD
echo

LOGIN_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt \
    -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "x-csrf-token: $CSRF_TOKEN" \
    -d "username=$USERNAME&password=$PASSWORD" \
    "$BASE_URL/login")

echo "✅ Login attempted"

# Check if JWT token cookie was set
JWT_TOKEN=$(grep "jwt_token" cookies.txt | cut -f7)

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ JWT token not found in cookies"
    echo "📋 Cookie contents:"
    cat cookies.txt
    exit 1
fi

echo "✅ JWT token found: ${JWT_TOKEN:0:40}..."

# Test API call with JWT token
echo "3. Testing API call with JWT token..."
API_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Accept: application/json" \
    "$BASE_URL/api/self")

if echo "$API_RESPONSE" | grep -q "username"; then
    echo "✅ API call with JWT token successful!"
    echo "📄 Response: $API_RESPONSE"
else
    echo "❌ API call failed"
    echo "📄 Response: $API_RESPONSE"
fi

# Test with browser cookies
echo "4. Testing API call with cookies..."
COOKIE_RESPONSE=$(curl -s -b cookies.txt \
    -H "Accept: application/json" \
    "$BASE_URL/api/self")

if echo "$COOKIE_RESPONSE" | grep -q "username"; then
    echo "✅ API call with cookies successful!"
    echo "📄 Response: $COOKIE_RESPONSE"
else
    echo "❌ API call with cookies failed"
    echo "📄 Response: $COOKIE_RESPONSE"
fi

# Clean up
rm -f cookies.txt

echo "🎉 JWT testing complete!" 