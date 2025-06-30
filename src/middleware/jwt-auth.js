"use strict";

const jwt = require("jsonwebtoken");
const nconf = require("nconf");
const winston = require("winston");
const user = require("../user");
const meta = require("../meta");

const JWTAuth = module.exports;

JWTAuth.generateToken = function (uid, remember = false) {
	const payload = {
		uid: uid,
		iat: Math.floor(Date.now() / 1000),
	};

	const expiresIn = remember
		? (meta.config.loginDays || 14) + "d"
		: (meta.config.sessionDuration || 1200) + "s";

	const options = {
		expiresIn: expiresIn,
		issuer: nconf.get("url"),
		audience: nconf.get("url"),
	};

	return jwt.sign(payload, nconf.get("secret"), options);
};

JWTAuth.verifyToken = function (token) {
	try {
		const options = {
			issuer: nconf.get("url"),
			audience: nconf.get("url"),
		};
		return jwt.verify(token, nconf.get("secret"), options);
	} catch (err) {
		winston.verbose("[jwt-auth] Token verification failed:", err.message);
		return null;
	}
};

JWTAuth.extractTokenFromRequest = function (req) {
	// Check Authorization header first
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer ")
	) {
		return req.headers.authorization.substring(7);
	}

	// Check cookie as fallback
	if (req.cookies && req.cookies.jwt_token) {
		return req.cookies.jwt_token;
	}

	return null;
};

JWTAuth.middleware = async function (req, res, next) {
	const token = JWTAuth.extractTokenFromRequest(req);

	if (!token) {
		req.uid = 0;
		req.loggedIn = false;
		return next();
	}

	const decoded = JWTAuth.verifyToken(token);
	if (!decoded || !decoded.uid) {
		req.uid = 0;
		req.loggedIn = false;
		return next();
	}

	try {
		// Verify user still exists and is not banned
		const userData = await user.getUserFields(decoded.uid, ["uid", "banned"]);
		if (!userData.uid || userData.banned) {
			req.uid = 0;
			req.loggedIn = false;
			return next();
		}

		req.uid = parseInt(decoded.uid, 10);
		req.loggedIn = req.uid > 0;
		req.user = { uid: req.uid };

		// Update last online time (less frequently to avoid performance issues)
		if (Math.random() < 0.1) {
			// 10% chance to update
			setImmediate(() => {
				user.updateLastOnlineTime(req.uid).catch((err) => {
					winston.error("[jwt-auth] Error updating last online time:", err);
				});
			});
		}

		next();
	} catch (err) {
		winston.error("[jwt-auth] Error in middleware:", err);
		req.uid = 0;
		req.loggedIn = false;
		next();
	}
};

JWTAuth.setAuthCookie = function (res, token, remember = false) {
	const maxAge = remember
		? (meta.config.loginDays || 14) * 24 * 60 * 60 * 1000
		: (meta.config.sessionDuration || 1200) * 1000;

	const cookieOptions = {
		httpOnly: true,
		secure: !!nconf.get("ssl"),
		sameSite: "lax",
		maxAge: maxAge,
		path: nconf.get("relative_path") || "/",
	};

	res.cookie("jwt_token", token, cookieOptions);
};

JWTAuth.clearAuthCookie = function (res) {
	res.clearCookie("jwt_token", {
		path: nconf.get("relative_path") || "/",
	});
};
