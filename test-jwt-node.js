#!/usr/bin/env node

const https = require("https");
const http = require("http");
const url = require("url");
const querystring = require("querystring");
const jwt = require("jsonwebtoken");

const BASE_URL = "http://localhost:4567";

class JWTTester {
	constructor() {
		this.cookies = {};
		this.csrfToken = null;
	}

	// Helper to make HTTP requests
	async makeRequest(method, path, options = {}) {
		return new Promise((resolve, reject) => {
			const urlParts = url.parse(BASE_URL + path);
			const requestOptions = {
				hostname: urlParts.hostname,
				port: urlParts.port,
				path: urlParts.path,
				method: method.toUpperCase(),
				headers: {
					"User-Agent": "NodeBB-JWT-Tester/1.0",
					...options.headers,
				},
			};

			// Add cookies
			const cookieString = Object.entries(this.cookies)
				.map(([key, value]) => `${key}=${value}`)
				.join("; ");

			if (cookieString) {
				requestOptions.headers["Cookie"] = cookieString;
			}

			const req = http.request(requestOptions, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					// Extract cookies from response
					const setCookies = res.headers["set-cookie"];
					if (setCookies) {
						setCookies.forEach((cookie) => {
							const [nameValue] = cookie.split(";");
							const [name, value] = nameValue.split("=");
							this.cookies[name] = value;
						});
					}

					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: data,
						cookies: this.cookies,
					});
				});
			});

			req.on("error", reject);

			if (options.data) {
				req.write(options.data);
			}

			req.end();
		});
	}

	// Extract CSRF token from login page
	async getCsrfToken() {
		console.log("📋 Getting CSRF token...");

		const response = await this.makeRequest("GET", "/login");

		// Try multiple patterns to extract CSRF token
		const patterns = [
			/csrf":"([^"]+)"/,
			/name="csrf"[^>]*value="([^"]+)"/,
			/'csrf':\s*'([^']+)'/,
			/"csrf":\s*"([^"]+)"/,
		];

		for (const pattern of patterns) {
			const match = response.body.match(pattern);
			if (match) {
				this.csrfToken = match[1];
				console.log(
					`✅ CSRF token found: ${this.csrfToken.substring(0, 20)}...`
				);
				return this.csrfToken;
			}
		}

		throw new Error("Could not extract CSRF token");
	}

	// Test login and JWT token generation
	async testLogin(username, password) {
		console.log(`\n🔐 Testing login for user: ${username}`);

		// Get CSRF token first
		await this.getCsrfToken();

		// Prepare login data
		const loginData = querystring.stringify({
			username: username,
			password: password,
		});

		// Make login request
		const response = await this.makeRequest("POST", "/login", {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": Buffer.byteLength(loginData),
				"x-csrf-token": this.csrfToken,
				Accept: "application/json",
			},
			data: loginData,
		});

		console.log(`📊 Login response status: ${response.statusCode}`);
		console.log(`📊 Response body: ${response.body}`);

		// Check for JWT token in cookies
		const jwtToken = this.cookies["jwt_token"];

		if (jwtToken) {
			console.log(`✅ JWT token received!`);
			console.log(`🔑 Token: ${jwtToken.substring(0, 50)}...`);

			// Decode and display JWT payload
			this.decodeJWT(jwtToken);

			// Test API calls with the token
			await this.testApiWithJWT(jwtToken);
			await this.testApiWithCookies();

			return jwtToken;
		} else {
			console.log("❌ No JWT token found in response cookies");
			console.log("🍪 Available cookies:", Object.keys(this.cookies));
			return null;
		}
	}

	// Decode JWT token
	decodeJWT(token) {
		try {
			console.log("\n🔍 Decoding JWT token...");

			// Decode without verification (for display purposes)
			const decoded = jwt.decode(token, { complete: true });

			if (decoded) {
				console.log("📋 JWT Header:", JSON.stringify(decoded.header, null, 2));
				console.log(
					"📋 JWT Payload:",
					JSON.stringify(decoded.payload, null, 2)
				);

				// Check expiry
				if (decoded.payload.exp) {
					const expiry = new Date(decoded.payload.exp * 1000);
					console.log(`⏰ Token expires: ${expiry.toISOString()}`);
				}
			} else {
				console.log("❌ Could not decode JWT token");
			}
		} catch (error) {
			console.log(`❌ Error decoding JWT: ${error.message}`);
		}
	}

	// Test API call with JWT Bearer token
	async testApiWithJWT(token) {
		console.log("\n🧪 Testing API call with JWT Bearer token...");

		try {
			const response = await this.makeRequest("GET", "/api/self", {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json",
				},
			});

			console.log(`📊 API response status: ${response.statusCode}`);

			if (response.statusCode === 200) {
				console.log("✅ API call with JWT token successful!");
				const userData = JSON.parse(response.body);
				console.log(
					`👤 Authenticated user: ${userData.username} (UID: ${userData.uid})`
				);
			} else {
				console.log(`❌ API call failed with status ${response.statusCode}`);
				console.log(`📄 Response: ${response.body}`);
			}
		} catch (error) {
			console.log(`❌ Error making API call: ${error.message}`);
		}
	}

	// Test API call with cookies
	async testApiWithCookies() {
		console.log("\n🧪 Testing API call with cookies...");

		try {
			const response = await this.makeRequest("GET", "/api/self", {
				headers: {
					Accept: "application/json",
				},
			});

			console.log(`📊 API response status: ${response.statusCode}`);

			if (response.statusCode === 200) {
				console.log("✅ API call with cookies successful!");
				const userData = JSON.parse(response.body);
				console.log(
					`👤 Authenticated user: ${userData.username} (UID: ${userData.uid})`
				);
			} else {
				console.log(`❌ API call failed with status ${response.statusCode}`);
				console.log(`📄 Response: ${response.body}`);
			}
		} catch (error) {
			console.log(`❌ Error making API call: ${error.message}`);
		}
	}

	// Test logout and token clearing
	async testLogout() {
		console.log("\n🚪 Testing logout...");

		try {
			const response = await this.makeRequest("POST", "/logout", {
				headers: {
					"x-csrf-token": this.csrfToken,
					Accept: "application/json",
				},
			});

			console.log(`📊 Logout response status: ${response.statusCode}`);

			const jwtToken = this.cookies["jwt_token"];
			if (!jwtToken || jwtToken === "") {
				console.log("✅ JWT token cleared successfully");
			} else {
				console.log("⚠️ JWT token still present after logout");
			}
		} catch (error) {
			console.log(`❌ Error during logout: ${error.message}`);
		}
	}
}

// Main execution
async function main() {
	console.log("🚀 NodeBB JWT Login API Tester");
	console.log("===============================\n");

	const tester = new JWTTester();

	// Get credentials from command line or prompt
	const args = process.argv.slice(2);
	let username, password;

	if (args.length >= 2) {
		username = args[0];
		password = args[1];
	} else {
		// For demo purposes, you can set default credentials here
		console.log("Usage: node test-jwt-node.js <username> <password>");
		console.log("Or modify the script to include test credentials");
		return;
	}

	try {
		// Test login and JWT generation
		const jwtToken = await tester.testLogin(username, password);

		if (jwtToken) {
			// Test logout
			await tester.testLogout();

			console.log("\n🎉 All tests completed!");
		} else {
			console.log("\n❌ JWT token not generated - check implementation");
		}
	} catch (error) {
		console.log(`\n❌ Test failed: ${error.message}`);
		console.log(error.stack);
	}
}

// Run if script is called directly
if (require.main === module) {
	main();
}
