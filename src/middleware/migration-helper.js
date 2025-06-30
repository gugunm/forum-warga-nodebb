"use strict";

const nconf = require("nconf");
const winston = require("winston");
const jwtAuth = require("./jwt-auth");
const user = require("../user");

const MigrationHelper = module.exports;

// Flag to enable/disable JWT (can be controlled via admin panel)
MigrationHelper.isJWTEnabled = function () {
	return nconf.get("jwt:enabled") !== false; // Default to true
};

// Hybrid middleware that supports both session and JWT
MigrationHelper.hybridAuth = async function (req, res, next) {
	let authenticated = false;

	// Try JWT authentication first if enabled
	if (MigrationHelper.isJWTEnabled()) {
		await jwtAuth.middleware(req, res, () => {});
		authenticated = req.loggedIn;

		if (authenticated) {
			winston.verbose(
				`[migration-helper] User ${req.uid} authenticated via JWT`
			);
		}
	}

	// If JWT didn't authenticate and we have a session, try session auth
	if (
		!authenticated &&
		req.session &&
		req.session.passport &&
		req.session.passport.user
	) {
		try {
			const uid = parseInt(req.session.passport.user, 10);
			const userData = await user.getUserFields(uid, ["uid", "banned"]);

			if (userData.uid && !userData.banned) {
				req.uid = uid;
				req.loggedIn = true;
				req.user = { uid: uid };
				authenticated = true;

				winston.verbose(
					`[migration-helper] User ${uid} authenticated via session, migrating to JWT`
				);

				// Issue JWT token for future requests
				if (MigrationHelper.isJWTEnabled()) {
					const remember =
						req.session.cookie &&
						req.session.cookie.maxAge > 24 * 60 * 60 * 1000;
					const token = jwtAuth.generateToken(uid, remember);
					jwtAuth.setAuthCookie(res, token, remember);

					winston.verbose(
						`[migration-helper] JWT token issued for user ${uid}`
					);
				}
			}
		} catch (err) {
			winston.error(
				"[migration-helper] Error during session auth fallback:",
				err
			);
		}
	}

	// Set default values if not authenticated
	if (!authenticated) {
		req.uid = 0;
		req.loggedIn = false;
		req.user = null;
	}

	next();
};

// Method to migrate a specific user session to JWT
MigrationHelper.migrateUserToJWT = async function (req, res) {
	if (!req.loggedIn || !MigrationHelper.isJWTEnabled()) {
		return false;
	}

	try {
		const remember =
			req.session &&
			req.session.cookie &&
			req.session.cookie.maxAge > 24 * 60 * 60 * 1000;
		const token = jwtAuth.generateToken(req.uid, remember);
		jwtAuth.setAuthCookie(res, token, remember);

		winston.verbose(`[migration-helper] User ${req.uid} migrated to JWT`);
		return true;
	} catch (err) {
		winston.error("[migration-helper] Error migrating user to JWT:", err);
		return false;
	}
};

// Check if a user is using JWT or session
MigrationHelper.getAuthMethod = function (req) {
	const hasJWT = jwtAuth.extractTokenFromRequest(req);
	const hasSession =
		req.session && req.session.passport && req.session.passport.user;

	if (hasJWT && hasSession) return "hybrid";
	if (hasJWT) return "jwt";
	if (hasSession) return "session";
	return "none";
};
