/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const domainHandler = require('./domainHandler.js');

module.exports = function (app) {


	let getgodchildren, getgodfather, postgodfather, putgodfather;
	app.route('/v2.6/gamer/godfather/:domain')
		.all(domainHandler)
		.put(putgodfather = (req, res, next) => xtralife.api.social.godfatherCode(req.params.domain, req.gamer._id, function (err, godfathercode) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json({ godfathercode })
				.end();
		})).post(postgodfather = function (req, res, next) {
			if (req.body.godfather == null) { return next(new errors.MissingData("godfather")); }
			return xtralife.api.social.setGodfather(req.context, req.params.domain, req.gamer._id, req.body.godfather, req.body, function (err, done) {
				if (err != null) { return next(err); }
				return res
					.status(200)
					.json({ done })
					.end();
			});
		}).get(getgodfather = (req, res, next) => xtralife.api.social.getGodfather(req.context, req.params.domain, req.gamer._id, function (err, godfather) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json({ godfather, customData: req.context.customData })
				.end();
		})).all((req, res, next) => next(new errors.InvalidMethodError()));

	app.route('/v1/gamer/godfather')
		.all(function (req, res, next) {
			req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
			return next();
		}).get(getgodfather)
		.post(postgodfather)
		.put(putgodfather)
		.all((req, res, next) => next(new errors.InvalidMethodError()));

	app.route('/v2.6/gamer/godchildren/:domain')
		.all(domainHandler)
		.get(getgodchildren = (req, res, next) => xtralife.api.social.getGodchildren(req.context, req.params.domain, req.gamer._id, function (err, godchildren) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json({ godchildren, customData: req.context.customData })
				.end();
		})).all((req, res, next) => next(new errors.InvalidMethodError()));

	return app.route('/v1/gamer/godchildren')
		.all(function (req, res, next) {
			req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
			return next();
		}).get(getgodchildren)
		.all((req, res, next) => next(new errors.InvalidMethodError()));
};
