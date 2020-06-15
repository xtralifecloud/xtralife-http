/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const middleware = require('../middleware.js');
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const ourUtil = require('../util.js');
const {
	aes_decipher
} = ourUtil;
const {
	cleanGamerForReturning
} = ourUtil;
const util = require('util');
const _ = require("underscore");

// when adding new network, remember to change the gamerCatchAllRoute.js file !!

var _login = (game, id, token, options) => ({
	createanonymous(cb) {
		const profile = {
			displayName: "Guest",
			lang: "en"
		};
		return xtralife.api.connect.register(game, "anonymous", null, null, profile, cb);
	},

	anonymous(cb) {
		return xtralife.api.connect.exist(id, function (err, gamer) {
			if (err != null) { return cb(err); }
			if (gamer != null) {
				const sha = xtralife.api.user.sha_passwd(id);
				if (sha !== token) { return cb(new errors.LoginError); }
			}
			return cb(err, gamer, false);
		});
	},

	facebook(cb) {
		return xtralife.api.connect.loginfb(game, token, options, function (err, gamer, created) {
			if ((err != null) && (err.type === 'OAuthException')) {
				return cb(new errors.InvalidLoginTokenError);
			}
			return cb(err, gamer, created);
		});
	},

	googleplus(cb) {
		return xtralife.api.connect.logingp(game, token, options, function (err, gamer, created) {
			if ((err != null) && (err.message === 'Invalid Credentials')) {
				return cb(new errors.InvalidLoginTokenError);
			}
			return cb(err, gamer, created);
		});
	},

	gamecenter(cb) {
		return xtralife.api.connect.logingc(game, id, JSON.parse(token), options, cb);
	},

	email(cb) {
		return xtralife.api.connect.login(game, id, xtralife.api.user.sha_passwd(token), options, cb);
	},

	external(cb) {
		return xtralife.api.connect.loginExternal(game, options.external, id, token, options, cb);
	},

	restore(cb) {
		let shortcode = token;
		let newpass = null;
		const idx = token.indexOf(":");
		if ((idx !== -1) && (idx !== 0)) {
			shortcode = token.substring(0, idx);
			newpass = token.substr(idx + 1);
		}
		return xtralife.api.connect.resolveShortLoginCode(game, shortcode, (err, newid) => {
			if (err != null) { return cb(err); }
			if (newid == null) { return cb(new errors.LoginError); }
			const login = _login(game, newid, xtralife.api.user.sha_passwd(newid))["anonymous"];
			return login(function (err, gamer, created) {
				if (err != null) { return cb(err); }
				if (newpass != null) {
					return xtralife.api.connect.changePassword(gamer._id, xtralife.api.user.sha_passwd(newpass), function (err, done) {
						gamer.passwordChanged = done;
						return cb(err, gamer, created);
					});
				} else {
					return cb(err, gamer, created);
				}
			});
		});
	}
});

const _finalize = function (req, res, next, gamer, created) {
	const thenBatch = req.body.thenBatch || (req.body.options != null ? req.body.options.thenBatch : undefined);
	const device = req.body['device'];

	if ((device != null ? device.id : undefined) != null) {
		device.ts = new Date();
		device.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		xtralife.api.connect.trackDevice(gamer._id, device);
	}

	let result = cleanGamerForReturning(gamer);

	if (thenBatch != null) {
		const params = {
			request: thenBatch.params,
			user_id: result.gamer_id
		};

		//TODO handle 'private' domain name !!!
		return xtralife.api.game.runBatch(req.context, thenBatch.domain, `__${thenBatch.name}`, params)
			.then(function (customData) {
				if (customData != null) { result.customData = customData; }
				return res
					.status(created ? 201 : 200)
					.json(result)
					.end();
			}).catch(next)
			.done();
	} else {
		if (xlenv.options.cleanLogin) {
			result.domains = [];
			res.status(created ? 201 : 200)
				.json(result)
				.end();
			return;
		}

		return xtralife.api.outline.get(req.game, gamer.gamer_id, req.game.config.domains, (err, outline) => {
			if (err != null) { return next(err); }

			result = outline;
			result.gamer_id = gamer.gamer_id;
			result.gamer_secret = xtralife.api.user.sha_passwd(gamer.gamer_id);
			if (gamer.passwordChanged != null) { result.passwordChanged = gamer.passwordChanged; }
			return res
				.status(created ? 201 : 200)
				.json(result)
				.end();
		});
	}
};

module.exports = function (app) {

	app.post("/v1/login/anonymous", function (req, res, next) {
		const thenBatch = req.body.thenBatch || (req.body.options != null ? req.body.options.thenBatch : undefined);
		if (thenBatch != null) {
			if (thenBatch.name == null) { return next(new errors.MissingParameter("thenBatch.name")); }
			if (thenBatch.domain == null) { return next(new errors.MissingParameter("thenBatch.domain")); }
			if (thenBatch.params == null) { return next(new errors.MissingParameter("thenBatch.params")); }
		}

		const login = _login(req.game)["createanonymous"];
		return login(function (err, gamer, created) {
			if (err != null) { return next(err); }
			if (gamer == null) { return next(new errors.LoginError); }

			return _finalize(req, res, next, gamer);
		});
	});


	app.post("/v1/login", function (req, res, next) {
		let network = req.body['network'];
		const id = req.body['id'];
		const secret = req.body['secret'];
		const options = req.body['options'] || {};
		const thenBatch = req.body.thenBatch || (req.body.options != null ? req.body.options.thenBatch : undefined);

		if (thenBatch != null) {
			if (thenBatch.name == null) { return next(new errors.MissingParameter("thenBatch.name")); }
			if (thenBatch.domain == null) { return next(new errors.MissingParameter("thenBatch.domain")); }
			if (thenBatch.params == null) { return next(new errors.MissingParameter("thenBatch.params")); }
		}

		if (network != null ? network.startsWith("external:") : undefined) {
			options.external = network.slice(9);
			network = "external";
		}

		const login = _login(req.game, id, secret, options)[network];
		if (login == null) { return next(new errors.InvalidLoginNetwork); }
		if (id == null) { return next(new errors.LoginError(req)); }
		if (secret == null) { return next(new errors.LoginError(req)); }

		return login(function (err, gamer, created) {
			if (err != null) { return next(err); }
			if (gamer == null) { return next(new errors.LoginError); }

			const gauth = _.find(gamer.games, g => g.appid === req.game.appid);

			if (gauth != null ? gauth.banned : undefined) { return next(new errors.forbiddenAccess); }

			if (gamer.noBusinessManager) {
				res.header('X-Obsolete', 'true');
			}

			xtralife.api.connect.addGameToUser(req.game, gamer, function (err, count) {
				if (err != null) { return logger.error(err.message, { stack: err.stack }); }
			});

			return _finalize(req, res, next, gamer, created);
		});
	});

	const _sendResetLinkMail = function (req, res, next) {
		const {
			email
		} = req.params;
		const title = req.body['title'];
		const body = req.body['body'];
		const from = req.body['from'];
		const html = req.body['html'];

		if (title == null) { return next(new errors.MissingEmailTitle); }
		if (body == null) { return next(new errors.MissingEmailBody); }
		if (body.indexOf("[[SHORTCODE]]") === -1) { return next(new errors.BadEmailTemplate); }
		if (from == null) { return next(new errors.MissingSenderEmail); }
		if ((html != null ? html.indexOf("[[SHORTCODE]]") : undefined) === -1) { return next(new errors.BadEmailTemplate); }

		return xtralife.api.connect.sendPassword(req.game, email, from, title, body, html, function (err, done) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(done)
				.end();
		});
	};

	app.route("/v1/login/:email")
		.get(_sendResetLinkMail)
		.post(_sendResetLinkMail);

	return app.route('/v1/users/:network/:id')
		.get(function (req, res, next) {
			const method = req.params.network;
			switch (method) {
				case "gamer_id":
					if (req.params.id == null) { return next(new errors.MissingData("id")); }
					return xtralife.api.connect.exist(req.params.id, function (err, result) {
						if (err != null) { return next(err); }
						if (result == null) { return next(new errors.GamerIdNotFound); }
						result.gamer_id = result._id;
						delete result._id;
						return res
							.status(200)
							.json(result)
							.end();
					});

				case "facebook": case "googleplus": case "anonymous": case "email": case "gamecenter":
					if (req.params.id == null) { return next(new errors.MissingData("id")); }
					return xtralife.api.connect.existInNetwork(method, req.params.id, function (err, result) {
						if (err != null) { return next(err); }
						result.gamer_id = result._id;
						delete result._id;
						return res
							.status(200)
							.json(result)
							.end();
					});
				default:
					return next(new errors.InvalidOption(method, ["gamer_id", "facebook", "googleplus", "anonymous", "email", "gamecenter"]));
			}
		});
};

