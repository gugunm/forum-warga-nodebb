# 🔐 JWT Login API Testing Guide

This guide provides multiple methods to test the JWT authentication implementation in your NodeBB forum.

## 📋 Prerequisites

1. NodeBB is running on `http://localhost:4567`
2. You have valid user credentials
3. JWT is enabled in configuration (`config.json`)

## 🧪 Testing Methods

### Method 1: Shell Script (Recommended)

```bash
# Make the script executable
chmod +x test-jwt-login.sh

# Run with credentials as arguments
./test-jwt-login.sh username password

# Or run interactively
./test-jwt-login.sh
```

**What it tests:**

- CSRF token extraction
- Login API with JWT generation
- JWT token extraction from cookies
- API calls with Bearer token
- API calls with cookies

### Method 2: Node.js Script

```bash
# Run with credentials
node test-jwt-node.js username password
```

**What it tests:**

- Complete JWT workflow
- Token decoding and inspection
- Detailed error reporting
- API authentication verification

### Method 3: Manual curl Commands

#### Step 1: Get CSRF Token

```bash
# Get login page and extract CSRF token
curl -c cookies.txt -s http://localhost:4567/login | grep -o 'csrf":"[^"]*' | cut -d'"' -f3
```

#### Step 2: Login with Credentials

```bash
# Replace CSRF_TOKEN, USERNAME, PASSWORD
curl -b cookies.txt -c cookies.txt \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -H "Accept: application/json" \
  -d "username=YOUR_USERNAME&password=YOUR_PASSWORD" \
  http://localhost:4567/login
```

#### Step 3: Extract JWT Token

```bash
# Check for JWT token in cookies
grep "jwt_token" cookies.txt | cut -f7
```

#### Step 4: Test API with JWT

```bash
# Replace JWT_TOKEN with actual token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: application/json" \
  http://localhost:4567/api/self
```

### Method 4: Browser Testing

1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Login normally** through the web interface
4. **Check cookies** for `jwt_token`
5. **Use Console** to test API calls:

```javascript
// Check if JWT token exists
document.cookie.includes('jwt_token');

// Get JWT token value
document.cookie
  .split('; ')
  .find((row) => row.startsWith('jwt_token='))
  ?.split('=')[1];

// Test API call with fetch
fetch('/api/self', {
  headers: {
    Accept: 'application/json',
  },
  credentials: 'include',
})
  .then((response) => response.json())
  .then((data) => console.log('User data:', data));
```

## 🔍 Expected Results

### Successful JWT Login Response

**HTTP Status:** `200 OK`

**Cookies Set:**

```
jwt_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict
```

**JWT Token Structure:**

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "uid": 1,
    "iat": 1641234567,
    "exp": 1641235767,
    "iss": "NodeBB",
    "aud": "nodebb-users"
  }
}
```

### Successful API Call Response

**HTTP Status:** `200 OK`

**Response Body:**

```json
{
  "uid": 1,
  "username": "testuser",
  "email": "test@example.com",
  "joindate": 1640000000000,
  ...
}
```

## 🐛 Troubleshooting

### Issue: No JWT Token Generated

**Possible Causes:**

1. JWT not enabled in config
2. Login failed
3. CSRF token missing/invalid

**Solutions:**

```bash
# Check config
grep -A 5 '"jwt"' config.json

# Verify user credentials
# Check NodeBB logs for errors
```

### Issue: JWT Token Invalid

**Possible Causes:**

1. Token expired
2. Secret key mismatch
3. Invalid signature

**Solutions:**

```bash
# Check token expiry (decode JWT)
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d | jq .

# Verify secret configuration
```

### Issue: API Call Fails

**Possible Causes:**

1. Token not included in request
2. Wrong Authorization header format
3. CORS issues

**Solutions:**

```bash
# Test with both methods
curl -H "Authorization: Bearer TOKEN" /api/self
curl -b cookies.txt /api/self
```

## 📊 Token Information

### Default Configuration

- **Token Expiry:** 20 minutes (normal login)
- **Remember Token Expiry:** 14 days
- **Algorithm:** HMAC SHA-256
- **Cookie Name:** `jwt_token`
- **Cookie Attributes:** HttpOnly, Secure, SameSite=Strict

### Token Claims

- `uid`: User ID
- `iat`: Issued at timestamp
- `exp`: Expiry timestamp
- `iss`: Issuer (NodeBB)
- `aud`: Audience (nodebb-users)

## 🔧 Advanced Testing

### Test Token Expiry

```bash
# Generate short-lived token (modify config temporarily)
# Wait for expiry
# Test API call - should fail with 401
```

### Test Remember Me

```bash
# Login with remember=on parameter
curl -d "username=user&password=pass&remember=on" ...
# Should get longer-lived token
```

### Test Logout

```bash
# Logout to clear token
curl -X POST -H "x-csrf-token: TOKEN" http://localhost:4567/logout
# Check if jwt_token cookie is cleared
```

## 📈 Performance Testing

### Multiple Concurrent Logins

```bash
# Use multiple parallel curl requests
for i in {1..10}; do
  ./test-jwt-login.sh user$i password$i &
done
wait
```

### Load Testing

```bash
# Use ab (Apache Bench) or wrk
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" http://localhost:4567/api/self
```

## 🛡️ Security Verification

### Check Token Security

1. **HttpOnly:** Token not accessible via JavaScript
2. **Secure:** Only sent over HTTPS (in production)
3. **SameSite:** Protection against CSRF
4. **Expiry:** Reasonable token lifetime

### Verify Logout

1. Token should be cleared from cookies
2. Subsequent API calls should fail
3. No token should remain in browser storage

---

**Note:** Replace `username` and `password` with actual credentials for your NodeBB instance.
