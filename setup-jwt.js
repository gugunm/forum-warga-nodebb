#!/usr/bin/env node

"use strict";

const nconf = require("nconf");
const winston = require("winston");

// Load NodeBB configuration
nconf.argv().env({
	separator: "__",
});

const configFile = "./config.json";
nconf.file({ file: configFile });

async function setupJWT() {
	console.log("🔧 Setting up JWT Authentication for NodeBB...\n");

	try {
		// Load NodeBB database and meta
		const db = require("./src/database");
		await db.init();

		const meta = require("./src/meta");

		// Enable JWT authentication
		await meta.configs.set("jwt:enabled", true);
		await meta.configs.set("jwt:tokenExpiry", 1200); // 20 minutes
		await meta.configs.set("jwt:rememberTokenExpiry", 14); // 14 days

		// Keep sessions enabled for backward compatibility
		await meta.configs.set("session:enabled", true);

		console.log("✅ JWT Authentication has been enabled!");
		console.log(
			"✅ Session authentication is still enabled for backward compatibility"
		);
		console.log("\nConfiguration:");
		console.log("  - JWT Token Expiry: 20 minutes");
		console.log("  - Remember Me Token Expiry: 14 days");
		console.log("  - Session fallback: Enabled");

		console.log("\n📋 Next Steps:");
		console.log("1. Restart your NodeBB instance");
		console.log("2. Test login functionality");
		console.log("3. Check browser cookies for jwt_token");
		console.log("4. Run tests: npm test -- test/jwt-auth.js");
		console.log("5. Access admin panel at /admin/settings/authentication");

		console.log("\n🔍 To verify JWT is working:");
		console.log(
			"- Check browser dev tools > Application > Cookies for jwt_token"
		);
		console.log(
			'- Login and check server logs for "[migration-helper]" messages'
		);
		console.log("- Test API endpoints with Authorization: Bearer <token>");

		await db.close();
		console.log("\n🎉 Setup complete!");
	} catch (error) {
		console.error("❌ Error setting up JWT:", error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run setup if called directly
if (require.main === module) {
	setupJWT();
}

module.exports = setupJWT;
