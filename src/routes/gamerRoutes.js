/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');
const {
	cleanGamerForReturning
} = require('../util.js');

const env = (process.env.NODE_ENV != null) ? process.env.NODE_ENV : "dev";
const Q = require('bluebird');
const _domainHandler = require('./domainHandler.js');

const _convert = (game, gamer_id, credentials, options) => ({
	email() {
		if (!credentials.id) { throw new errors.MissingParameter("credentials.id"); }
		if (!credentials.secret) { throw new errors.MissingParameter("credentials.secret"); }
		return xtralife.api.connect.convertAccountToEmail(gamer_id, credentials.id, xtralife.api.user.sha_passwd(credentials.secret), options);
	},

	facebook() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToFacebook(game, gamer_id, credentials.auth_token, options);
	},

	google() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToGoogle(game, gamer_id, credentials.auth_token, options);
	},

	firebase() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToFirebase(game, gamer_id, credentials.auth_token, options);
	},

	steam() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToSteam(game, gamer_id, credentials.auth_token, options);
	},

	epic() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToEpic(game, gamer_id, credentials.auth_token);
	},
	
	apple() {
		if (!credentials.auth_token) { throw new errors.MissingParameter("credentials.auth_token"); }
		return xtralife.api.connect.convertAccountToApple(game, gamer_id, credentials.auth_token, options);
	},

	gamecenter() {
		if(!credentials.id) throw new errors.MissingParameter("credentials.id");
		if(!credentials.publicKeyUrl) throw new errors.MissingParameter("credentials.publicKeyUrl");
		if(!credentials.signature) throw new errors.MissingParameter("credentials.signature");
		if(!credentials.salt) throw new errors.MissingParameter("credentials.salt");
		if(!credentials.timestamp) throw new errors.MissingParameter("credentials.timestamp");
		if(!credentials.bundleId) throw new errors.MissingParameter("credentials.bundleId");

		return xtralife.api.connect.convertAccountToGameCenter(game, gamer_id, credentials);
	}
});

const _link = (user, token) => ({
	facebook(cb) {
		return xtralife.api.connect.linkAccountWithFacebook(user, token, function (err, fbid) {
			if (err != null) {
				if (err.type === 'OAuthException') {
					err.code = 401;
					return cb(new errors.InvalidLoginTokenError);
				} else {
					return cb(err);
				}
			}

			return cb(null, fbid);
		});
	},

	googleplus(cb) {
		return xtralife.api.connect.linkAccountWithGoogle(user, token, function (err, gpid) {
			if (err != null) {
				if (err.message === 'Invalid Credentials') {
					err.code = 401;
					return cb(new errors.InvalidLoginTokenError);
				} else {
					return cb(err);
				}
			}
			return cb(null, gpid);
		});
	}
});

module.exports = function (app) {

	app
		.route('/v1/gamer/device')
		.post(function (req, res, next) {
			const {
				os
			} = req.query;
			const {
				token
			} = req.query;
			const domain = `${req.game.appid}.${req.game.apisecret}`;
			if (os == null) { return next(new errors.MissingData("os")); }
			if (token == null) { return next(new errors.MissingData("token")); }
			return xtralife.api.connect.registerToken(req.gamer, os, token, domain, function (err, count) {
				if (err != null) { return next(err); }
				return res
					.status(200)
					.json({ "done": count })
					.end();
			});
		}).delete(function (req, res, next) {
			const {
				os
			} = req.query;
			const {
				token
			} = req.query;
			const domain = `${req.game.appid}.${req.game.apisecret}`;
			if (os == null) { return next(new errors.MissingData("os")); }
			if (token == null) { return next(new errors.MissingData("token")); }
			return xtralife.api.connect.unregisterToken(req.gamer, os, token, domain, function (err, count) {
				if (err != null) { return next(err); }
				return res
					.status(200)
					.json({ "done": count })
					.end();
			});
		});

	app.post("/v1/gamer/password", function (req, res, next) {
		const {
			password
		} = req.body;
		if (password == null) { return next(new errors.MissingData("password")); }
		if (req.gamer.network !== 'email') { return next(new errors.InvalidLoginNetwork); }
		return xtralife.api.connect.changePassword(req.gamer._id, xtralife.api.user.sha_passwd(password), function (err, done) {
			if (err != null) { return next(err); }
			return res.status(200).json({ done })
				.end();
		});
	});

	app.post("/v1/gamer/email", function (req, res, next) {
		const {
			email
		} = req.body;
		if (email == null) { return next(new errors.MissingData("email")); }
		if (req.gamer.network !== 'email') { return next(new errors.InvalidLoginNetwork); }
		return xtralife.api.connect.changeEmail(req.gamer._id, email, function (err, done) {
			if (err != null) { return next(err); }
			return res.status(200).json({ done })
				.end();
		});
	});

	app.post("/v1/gamer/logout", (req, res, next) => res.status(200).json({})
		.end());

	app.post("/v1/gamer/link", function (req, res, next) {
		const network = req.body['network'];
		const id = req.body['id'];
		const secret = req.body['secret'];
		const link = _link(req.gamer, secret)[network];
		if (link == null) { return next(new errors.InvalidLoginNetwork); }
		if (id == null) { return next(new errors.LoginError(req)); }
		if (secret == null) { return next(new errors.LoginError(req)); }
		return link(function (err, done) {
			if (err != null) {
				return next(err);
			} else {
				return res
					.status(200)
					.json(done)
					.end();
			}
		});
	});

	app.post("/v1/gamer/unlink", function (req, res, next) {
		const network = req.body['network'];
		return xtralife.api.connect.unlink(req.gamer, network, function (err, done) {
			if (err != null) {
				return next(err);
			} else {
				return res.status(200).json(done)
					.end();
			}
		});
	});

	app.post("/v1/gamer/convert", function (req, res, next) {
		const network = req.body['network'];
		const credentials = req.body['credentials'];
		const options = req.body['options'];
		if(!credentials) return next(new errors.MissingParameter("credentials"));

		const conversion = _convert(req.game, req.gamer._id, credentials, options);
		const allowedKeys = Object.keys(conversion);
		if (!Array.from(allowedKeys).includes(network)) { return next(new errors.InvalidOption(network, allowedKeys)); }

		return conversion[network]().then(result => res.status(200).json({ done: 1, gamer: cleanGamerForReturning(result) })
			.end()).catch(next);
	});

	app.get("/v1/gamer/shortlogin", function (req, res, next) {
		const domain = `${req.game.appid}.${req.game.apisecret}`;
		return xtralife.api.connect.createShortLoginCode(domain, req.gamer._id, req.query.ttl, function (err, shortcode) {
			if (err != null) {
				return next(err);
			} else {
				return res.status(200).json({ shortcode })
					.end();
			}
		});
	});

	app.get('/v1/gamer/shortlogin/:domain', _domainHandler, (req, res, next) => xtralife.api.connect.createShortLoginCode(req.params.domain, req.gamer._id, req.query.ttl, function (err, shortcode) {
		if (err != null) {
			return next(err);
		} else {
			return res.status(200).json({ shortcode })
				.end();
		}
	}));

	app.get('/v1/gamer/achievements/:domain', _domainHandler, (req, res, next) => xtralife.api.achievement.getUserAchievements(req.gamer._id, req.params.domain)
		.then(achievements => res.status(200).json({ achievements })
			.end()).catch(next));

	app.get('/v1/gamer/achievements/:domain/:name/gamerdata', _domainHandler, (req, res, next) => xtralife.api.achievement.getUserAchievements(req.gamer._id, req.params.domain)
		.then(function (achievements) {
			const data = achievements[req.params.name] != null ? achievements[req.params.name].gamerData : undefined;
			if ((data == null)) { throw new errors.InvalidAchievement; }

			return res.status(200).json({ gamerData: data })
				.end();
		}).catch(next));

	app.post('/v1/gamer/achievements/:domain/:name/gamerdata', _domainHandler, (req, res, next) => xtralife.api.achievement.modifyUserAchievementData(req.context, req.gamer._id, req.params.domain, req.params.name, req.body)
		.then(achievement => res.status(200).json({ achievement })
			.end()).catch(next));

	app.post('/v1/gamer/nuke/me', (req, res, next) => {
		return xtralife.api.onDeleteUser(req.gamer._id, err => {
			if (err == null) {
				return res.status(200).json({ nuked: true, dead: 'probably' });
			} else {
				return next(err);
			}
		}
			, req.game.appid);
	});

	// Only in dev mode (for CLI tests), we allow to reset the status of achievements
	if (env === 'dev') {
		return app.post('/v1/gamer/achievements/:domain/reset', _domainHandler, (req, res, next) => xtralife.api.achievement.resetAchievementsForUser(req.context, req.gamer._id, req.params.domain, function (err) {
			if (err != null) {
				return next(err);
			} else {
				return res.status(200).json({}).end();
			}
		}));
	}
};
