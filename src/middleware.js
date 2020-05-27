/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const util = require('util');
const textBody = require("body");
const _ = require("underscore");

const xtralife = require('xtralife-api');
const errors = require("./errors.js");

const basicAuth = require('basic-auth');


const env = (process.env.NODE_ENV != null) ? process.env.NODE_ENV : "dev";

const JaySchema = new (require('jayschema'));
const minutes = 60*1000;

// reset requests counter every minute
let requestCount = 0;
let requestCountSignaled = false;
setInterval(function() {
	requestCount = 0;
	return requestCountSignaled = false;
}
, 1*minutes);

module.exports = {

	JaySchema,

	// if you disable checkSchema, it will break your npm test dataset with a corrupted balance
	checkSchema(schema){
		return function(req, res, next) {
			const errs = JaySchema.validate(req.body, schema);

			if (errs.length === 0) { return next();
			} else {
				return next(new errors.InvalidJSONBody());
			}
		};
	},

	requestLogger(req, res, next){
		const res_end = res.end;
		const res_json = res.json;
		const startTime = Date.now();
		let savedJson = null;
		res.end = function(){
			const duration = Date.now() - startTime;
			const info = {
				appid: (req.game != null ? req.game.appid : undefined) || '',
				gamerid: (req.gamer != null) ? req.gamer._id.toHexString() : '',
				method: req.method,
				statusCode: res.statusCode,
				duration
			};

			if (logger.level === 'debug') {
				info.jsonReq = util.inspect(req.body);
				info.jsonRes = util.inspect(savedJson);
				info.headers = req.headers;
			}

			if (req.originalUrl !== "/v1/ping") {

				if (req.originalUrl.startsWith('/v1/login/') && (req.originalUrl.indexOf('@') !== -1)) {
					req.originalUrl = '/v1/login/obfuscated@domain.com';
				}

				logger.info(req.originalUrl, info);
			}

			res.end = res_end;
			return res_end.apply(res, arguments);
		};

		if (logger.level === 'debug') {
			res.json = function(json){
				savedJson = json;
				res.json = res_json;
				return res_json.apply(res,arguments);
			};
		}
		return next();
	},

	errorHandler(err, req, res, next){

		const status = err instanceof xtralife.errors.XLAPIError ?
			err instanceof xtralife.errors.XLAPIRetryableError ? 500 : 400
		:
			err.status || 500;

		if (!(err instanceof errors.APIError) && !(err instanceof xtralife.errors.XLAPIError) && !(err instanceof errors.NotFound)) {
			logger.error(err.message, {stack: (err.stack != null)});
		} else {
			logger.debug(err.message, {
				game: req.game,
				headers: req.headers,
				method: req.method,
				url: req.originalUrl
			}
			);
		}

		return res
		.set('content-type', 'application/json')
		.status(status)
		.json(_.pick(err, 'name', 'message', 'details'))
		.end();
	},

	missingEntryPoint(req, res, next){
		return next(new errors.InvalidRoute());
	},

	sanityChecks(req, res, next){
		if (req.body == null) { req.body={}; }
		return next();
	},

	// check app tokens in x-apikey and x-apisecret
	authenticateApp(req, res, next){
		try {
			const xapikey = req.headers['x-apikey'];
			const xapisecret = req.headers['x-apisecret'];
			if ((xapikey == null) || (xapisecret == null)) { next(new errors.AppAuthenticationError(req)); }

			return xtralife.api.game.checkAppCredentials(xapikey, xapisecret, function(err, game){
				if (err != null) { return next(new errors.InvalidAppAuthenticationError(req));
				} else {
					req.game = game;
					req.context = {game: req.game, runsFromClient: true};
					return next();
				}
			});

		} catch (error) {
			return next(new errors.InvalidAppAuthenticationError(req));
		}
	},

	// check gamer token in Authorization header
	// gamer must be valid in common users, not necessarily the current game's users
	authenticateGamer(req, res , next){
		try {
			const credentials = basicAuth(req); // contains .name and .pass

			// anonymous users log in with user_id
			return xtralife.api.connect.existAndLog(credentials.name, req.game.appid, function(err, gamer){
				if (err != null) {
					if (err.message = 'Invalid GamerID') {
						return next(new errors.InvalidLoginTokenError(req));
					} else {
						return next(err);
					}
				}

				// if not found
				if (gamer == null) { return next(new errors.InvalidLoginTokenError(req)); }

				const gauth = _.find(gamer.games , g => g.appid === req.game.appid);

				if (gauth != null ? gauth.banned : undefined) { return next(new errors.forbiddenAccess(req)); }

				if (xtralife.api.user.sha_passwd(gamer._id.toString()) === credentials.pass) {

					req.gamer = gamer;
					return next();
				} else {
					return next(new errors.InvalidLoginTokenError(req));
				}
			});

		} catch (error) {
			return next(new errors.InvalidLoginTokenError(req));
		}
	},


	waterline(req, res, next){
		if (xlenv.http.waterline == null) { return next(); }
		if (requestCountSignaled) { return next(); } // no more signaling before setInterval resets it

		if (requestCount++ > xlenv.http.waterline) {
			logger.warn(`Shuttle-http: req/min reached waterline (${xlenv.http.waterline} r/min)`);
			requestCountSignaled = true; // to avoid logging too often
		}

		return next();
	},

	apiCallCounter(req, res, next){
		return next();
	},

	ccuIncrement(appid, userid){
		if ((appid != null) && (userid != null)) {
			return xlenv.redis.client.set(`ccu.${appid}:${userid}`, "1", "EX", 600, function(err){
				if (err != null) { return logger.error(`ccuIncrement : ${JSON.stringify(err)}`); }
			});
		}
	},

	ccuDecrement(appid, userid){
		if ((appid != null) && (userid != null)) {
			return xlenv.redis.client.del(`ccu.${appid}:${userid}`, function(err){
				if (err != null) { return logger.error(`ccuDecrement : ${JSON.stringify(err)}`); }
			});
		}
	}
};
