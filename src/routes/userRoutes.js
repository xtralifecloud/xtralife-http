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

var _login = (game, credentials, options) => ({
	createanonymous(cb) {
		const profile = {
			displayName: "Guest",
			lang: "en"
		};
		return xtralife.api.connect.register(game, "anonymous", null, null, profile, cb);
	},

	anonymous(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.id) return cb(new errors.MissingParameter("credentials.id"));
		if(!credentials.secret) return cb(new errors.MissingParameter("credentials.secret"));
		return xtralife.api.connect.exist(credentials.id, function (err, gamer) {
			if (err != null) { return cb(err); }
			if (gamer != null) {
				const sha = xtralife.api.user.sha_passwd(credentials.id);
				if (sha !== credentials.secret) { return cb(new errors.LoginError); }
			}
			return cb(err, gamer, false);
		});
	},

	facebook(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.auth_token) return cb(new errors.MissingParameter("credentials.auth_token"));
		return xtralife.api.connect.loginFacebook(game, credentials.auth_token, options, cb)
	},

	google(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.auth_token) return cb(new errors.MissingParameter("credentials.auth_token"));
		return xtralife.api.connect.loginGoogle(game, credentials.auth_token, options, cb)
	},

	firebase(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.auth_token) return cb(new errors.MissingParameter("credentials.auth_token"));
		return xtralife.api.connect.loginFirebase(game, credentials.auth_token, options, cb);
	},
	
	steam(cb) {	
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.auth_token) return cb(new errors.MissingParameter("credentials.auth_token"));
		return xtralife.api.connect.loginSteam(game, credentials.auth_token, options, cb);
	},

	apple(cb){
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.auth_token) { return cb(new errors.MissingParameter("credentials.auth_token")); }
		return xtralife.api.connect.loginApple(game, credentials.auth_token, options, cb);
	},

	gamecenter(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.id) return cb(new errors.MissingParameter("credentials.id"));
		if(!credentials.publicKeyUrl) return cb(new errors.MissingParameter("credentials.publicKeyUrl"));
		if(!credentials.signature) return cb(new errors.MissingParameter("credentials.signature"));
		if(!credentials.salt) return cb(new errors.MissingParameter("credentials.salt"));
		if(!credentials.timestamp) return cb(new errors.MissingParameter("credentials.timestamp"));
		if(!credentials.bundleId) return cb(new errors.MissingParameter("credentials.bundleId"));
		return xtralife.api.connect.loginGameCenter(game, credentials, options, cb);
	},

	email(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.id) return cb(new errors.MissingParameter("credentials.id"));
		if(!credentials.secret) return cb(new errors.MissingParameter("credentials.secret"));
		return xtralife.api.connect.login(game, credentials.id, xtralife.api.user.sha_passwd(credentials.secret), options, cb);
	},

	external(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		return xtralife.api.connect.loginExternal(game, options.external, credentials, options, cb);
	},
	
	restore(cb) {
		if(!credentials) return cb(new errors.MissingParameter("credentials")); 
		if(!credentials.secret) return cb(new errors.MissingParameter("credentials.secret"));

		let shortcode = credentials.secret;
		let newpass = null;
		const idx = credentials.secret.indexOf(":");
		if ((idx !== -1) && (idx !== 0)) {
			shortcode = credentials.secret.substring(0, idx);
			newpass = credentials.secret.substr(idx + 1);
		}
		return xtralife.api.connect.resolveShortLoginCode(game, shortcode, (err, newid) => {
			if (err != null) { return cb(err); }
			if (newid == null) { return cb(new errors.LoginError); }
			const credentials = { id: newid, secret: xtralife.api.user.sha_passwd(newid)};
			const login = _login(game, credentials)["anonymous"];
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

const _finalize = async function (req, res, next, gamer, created) {
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
		const osn = req.body['osn'];

		if(osn){
			if(!osn.os) return next(new errors.MissingParameter("osn.os"));
			if(!osn.token) return next(new errors.MissingParameter("osn.token"));
			const domain = `${req.game.appid}.${req.game.apisecret}`;
			await new Promise(resolve =>
				xtralife.api.connect.registerToken(gamer, osn.os, osn.token, domain, (err, done) => {
					if(err) next(err);
					if(done === 1) logger.info(`Registered token ${osn.token} for user ${gamer._id}`)
					resolve(done);
				})
			);
		}

		return xtralife.api.outline.get(req.game, gamer._id, req.game.config.domains, async (err, outline) => {
			if (err != null) { return next(err); }

			result = outline;
			result.gamer_id = gamer._id;
			result.gamer_secret = xtralife.api.user.sha_passwd(gamer._id);
			if (gamer.passwordChanged != null) { result.passwordChanged = gamer.passwordChanged; }

			if(gamer.tokens && gamer.tokens.length > 0) {
				const day = 1000 * 60 * 60 * 24

				await Promise.all(gamer.tokens.map(token => {
					return new Promise((resolve) => {
						if(token.creationTime?.getTime() < (new Date()).getTime() - (30 * day)){
							return xtralife.api.connect.unregisterToken(gamer, token.os, token.token, token.domain, (err, done) => {
								if(err) next(err);
								if(done === 1) {
									result.tokens.splice(result.tokens.indexOf(token), 1)
									logger.info(`Unregistered token ${token.token} for user ${gamer._id}`)
								}
								resolve(done);
							});
						}
						resolve(0)
					})
				}));
				return res
					.status(created ? 201 : 200)
					.json(result)
					.end();
			}else{
				return res
					.status(created ? 201 : 200)
					.json(result)
					.end();
			}
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
		const credentials = req.body['credentials'];
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

		const login = _login(req.game, credentials, options)[network];
		if (login == null) { return next(new errors.InvalidLoginNetwork); }

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

				case "facebook": case "google": case "anonymous": case "email": case "gamecenter": case "firebase": case "steam": case "apple":
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
					return next(new errors.InvalidOption(method, ["gamer_id", "facebook", "google", "anonymous", "email", "gamecenter", "firebase", "steam", "apple"]));
			}
		});
};

