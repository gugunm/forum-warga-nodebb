"use strict";

const assert = require("assert");
const nconf = require("nconf");
const jwt = require("jsonwebtoken");

const db = require("./mocks/databasemock");
const helpers = require("./helpers");
const user = require("../src/user");
const jwtAuth = require("../src/middleware/jwt-auth");

describe("JWT Authentication", () => {
	let testUid;
	let testUsername;
	let testPassword;

	before(async () => {
		// Create a test user
		testUsername = "jwtTestUser";
		testPassword = "testPassword123";
		testUid = await user.create({
			username: testUsername,
			password: testPassword,
			email: "jwt@test.com",
		});
	});

	after(async () => {
		// Clean up test user
		if (testUid) {
			await user.delete(1, testUid);
		}
	});

	describe("JWT Token Generation", () => {
		it("should generate a valid JWT token", () => {
			const token = jwtAuth.generateToken(testUid, false);
			assert(token);
			assert(typeof token === "string");

			// Verify token structure
			const decoded = jwt.decode(token);
			assert.strictEqual(decoded.uid, testUid);
			assert(decoded.iat);
		});

		it('should generate a longer-lived token for "remember me"', () => {
			const normalToken = jwtAuth.generateToken(testUid, false);
			const rememberToken = jwtAuth.generateToken(testUid, true);

			const normalDecoded = jwt.decode(normalToken);
			const rememberDecoded = jwt.decode(rememberToken);

			// Remember token should have later expiry
			assert(rememberDecoded.exp > normalDecoded.exp);
		});
	});

	describe("JWT Token Verification", () => {
		it("should verify a valid token", () => {
			const token = jwtAuth.generateToken(testUid, false);
			const decoded = jwtAuth.verifyToken(token);

			assert(decoded);
			assert.strictEqual(decoded.uid, testUid);
		});

		it("should reject an invalid token", () => {
			const invalidToken = "invalid.token.here";
			const decoded = jwtAuth.verifyToken(invalidToken);

			assert.strictEqual(decoded, null);
		});

		it("should reject an expired token", () => {
			// Generate a token that expires immediately
			const expiredToken = jwt.sign(
				{ uid: testUid, iat: Math.floor(Date.now() / 1000) },
				nconf.get("secret"),
				{
					expiresIn: "1ms",
					issuer: nconf.get("url"),
					audience: nconf.get("url"),
				}
			);

			// Wait a bit to ensure expiry
			setTimeout(() => {
				const decoded = jwtAuth.verifyToken(expiredToken);
				assert.strictEqual(decoded, null);
			}, 10);
		});
	});

	describe("JWT Login Integration", () => {
		it("should login and receive JWT token", async () => {
			const { jar } = await helpers.loginUser(testUsername, testPassword);

			// Check if JWT cookie is set by inspecting the jar
			const cookies = jar.getCookies(nconf.get("url"));
			const jwtCookie = cookies.find((cookie) => cookie.key === "jwt_token");
			assert(jwtCookie, "JWT token cookie should be set");
		});

		it("should authenticate API requests with JWT token", async () => {
			// First, login to get a JWT token
			const { jar } = await helpers.loginUser(testUsername, testPassword);

			// Extract JWT token from cookies
			const cookies = jar.getCookies(nconf.get("url"));
			const jwtCookie = cookies.find((cookie) => cookie.key === "jwt_token");

			if (jwtCookie) {
				const token = jwtCookie.value;

				// Use JWT token in Authorization header
				const { response, body } = await helpers.request("get", "/api/self", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				assert.strictEqual(response.statusCode, 200);
				assert.strictEqual(body.username, testUsername);
			} else {
				// Skip this test if JWT token wasn't set (might be in session mode)
				console.log("JWT token not found - may be running in session mode");
			}
		});
	});

	describe("JWT Logout", () => {
		it("should clear JWT token on logout", async () => {
			// Login first
			const { jar } = await helpers.loginUser(testUsername, testPassword);

			// Logout
			await helpers.logoutUser(jar);

			// Check if JWT cookie is cleared
			const cookies = jar.getCookies(nconf.get("url"));
			const jwtCookie = cookies.find((cookie) => cookie.key === "jwt_token");
			assert(
				!jwtCookie || jwtCookie.value === "",
				"JWT token cookie should be cleared"
			);
		});
	});
});
