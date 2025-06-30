#!/bin/bash

echo "🚀 Testing JWT Login API"
echo "========================="

BASE_URL="http://localhost:4567"
TEMP_COOKIE_FILE="temp_cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "info" ]; then
        echo -e "${BLUE}ℹ️  $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    fi
}

# Function to extract CSRF token
get_csrf_token() {
    print_status "info" "Getting CSRF token..."
    local response=$(curl -s -c "$TEMP_COOKIE_FILE" "$BASE_URL/login")
    local csrf_token=$(echo "$response" | grep -o 'csrf":"[^"]*' | cut -d'"' -f3)
    
    if [ -z "$csrf_token" ]; then
        # Try alternative extraction method
        csrf_token=$(echo "$response" | grep -o 'csrf[^"]*"[^"]*"[^"]*"[^"]*' | cut -d'"' -f8)
    fi
    
    echo "$csrf_token"
}

# Function to test login and get JWT
test_login() {
    local username=$1
    local password=$2
    
    print_status "info" "Testing login for user: $username"
    
    # Get CSRF token first
    local csrf_token=$(get_csrf_token)
    
    if [ -z "$csrf_token" ]; then
        print_status "error" "Failed to get CSRF token"
        return 1
    fi
    
    print_status "success" "CSRF token obtained: ${csrf_token:0:20}..."
    
    # Perform login
    print_status "info" "Attempting login..."
    
    local login_response=$(curl -s -b "$TEMP_COOKIE_FILE" -c "$TEMP_COOKIE_FILE" \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -H "x-csrf-token: $csrf_token" \
        -H "Accept: application/json" \
        -d "username=$username&password=$password" \
        -w "%{http_code}" \
        "$BASE_URL/login")
    
    local http_code="${login_response: -3}"
    local response_body="${login_response%???}"
    
    print_status "info" "HTTP Status Code: $http_code"
    print_status "info" "Response Body: $response_body"
    
    # Check if login was successful
    if [ "$http_code" = "200" ]; then
        print_status "success" "Login successful!"
        
        # Check for JWT token in cookies
        if [ -f "$TEMP_COOKIE_FILE" ]; then
            local jwt_token=$(grep "jwt_token" "$TEMP_COOKIE_FILE" 2>/dev/null | cut -f7)
            
            if [ -n "$jwt_token" ]; then
                print_status "success" "JWT token found in cookies!"
                echo "JWT Token: ${jwt_token:0:50}..."
                
                # Test API call with JWT token
                test_api_with_jwt "$jwt_token"
                
                # Test API call with cookies
                test_api_with_cookies
                
                return 0
            else
                print_status "warning" "No JWT token found in cookies"
                print_status "info" "Cookie file contents:"
                cat "$TEMP_COOKIE_FILE"
            fi
        fi
    else
        print_status "error" "Login failed with status code: $http_code"
        print_status "info" "Response: $response_body"
    fi
    
    return 1
}

# Function to test API with JWT token
test_api_with_jwt() {
    local jwt_token=$1
    
    print_status "info" "Testing API call with JWT Bearer token..."
    
    local api_response=$(curl -s \
        -H "Authorization: Bearer $jwt_token" \
        -H "Accept: application/json" \
        -w "%{http_code}" \
        "$BASE_URL/api/self")
    
    local http_code="${api_response: -3}"
    local response_body="${api_response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_status "success" "API call with JWT token successful!"
        echo "User data: $response_body"
    else
        print_status "error" "API call with JWT token failed (Status: $http_code)"
        echo "Response: $response_body"
    fi
}

# Function to test API with cookies
test_api_with_cookies() {
    print_status "info" "Testing API call with cookies..."
    
    local api_response=$(curl -s -b "$TEMP_COOKIE_FILE" \
        -H "Accept: application/json" \
        -w "%{http_code}" \
        "$BASE_URL/api/self")
    
    local http_code="${api_response: -3}"
    local response_body="${api_response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_status "success" "API call with cookies successful!"
        echo "User data: $response_body"
    else
        print_status "error" "API call with cookies failed (Status: $http_code)"
        echo "Response: $response_body"
    fi
}

# Function to decode JWT (basic decoding)
decode_jwt() {
    local jwt_token=$1
    
    if command -v jq &> /dev/null; then
        print_status "info" "Decoding JWT token..."
        
        # Extract payload (second part of JWT)
        local payload=$(echo "$jwt_token" | cut -d'.' -f2)
        
        # Add padding if needed
        local padding=$((4 - ${#payload} % 4))
        if [ $padding -ne 4 ]; then
            payload="${payload}$(printf '%*s' $padding | tr ' ' '=')"
        fi
        
        # Decode base64 and format JSON
        echo "$payload" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "Could not decode JWT payload"
    fi
}

# Main execution
main() {
    echo
    print_status "info" "NodeBB JWT Login API Test"
    echo
    
    # Get credentials
    if [ $# -eq 2 ]; then
        USERNAME=$1
        PASSWORD=$2
    else
        read -p "Enter username: " USERNAME
        read -s -p "Enter password: " PASSWORD
        echo
    fi
    
    if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
        print_status "error" "Username and password are required"
        exit 1
    fi
    
    # Test login
    if test_login "$USERNAME" "$PASSWORD"; then
        print_status "success" "All tests completed successfully!"
    else
        print_status "error" "Some tests failed"
    fi
    
    # Clean up
    rm -f "$TEMP_COOKIE_FILE"
    
    echo
    print_status "info" "Test completed!"
}

# Run if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi 