/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const domainHandler = require('./domainHandler.js');

const _privateDomain = function (req, res, next) {
	req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
	return next();
};

module.exports = function (app) {

	let delProp, getProp, postProp;
	app.get("/v1/gamer/outline", function (req, res, next) {
		const domains = (req.query.domains != null) ? req.query.domains.split(',') : req.game.config.domains;
		if (req.query.flat != null) {
			return xtralife.api.outline.getflat(req.game, req.gamer._id, domains, function (err, outline) {
				if (err != null) { return next(err); }
				return res
					.status(200)
					.json({ outline })
					.end();
			});
		} else {
			return xtralife.api.outline.get(req.game, req.gamer._id, domains, function (err, outline) {
				if (err != null) { return next(err); }
				return res
					.status(200)
					.json({ outline })
					.end();
			});
		}
	});


	app.route('/v1/gamer/profile')
		.post((req, res, next) => xtralife.api.user.setProfile(req.gamer, req.body, function (err, newprofile) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(newprofile)
				.end();
		})).get((req, res, next) => xtralife.api.user.getProfile(req.gamer, function (err, profile) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(profile)
				.end();
		}));


	app.route('/v2.6/gamer/properties/:domain')
		.all(domainHandler)
		.post(postProp = (req, res, next) => xtralife.api.user.saveProperties(req.game._id, req.gamer._id, req.body, function (err, properties) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(properties)
				.end();
		})).get(getProp = (req, res, next) => xtralife.api.user.loadProperties(req.game._id, req.gamer._id, function (err, properties) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(properties)
				.end();
		})).delete(delProp = (req, res, next) => xtralife.api.user.delProperties(req.game._id, req.gamer._id, function (err, count) {
			if (err != null) { return next(err); }
			return res
				.status(200)
				.json(count)
				.end();
		})).all((req, res, next) => next(new errors.InvalidMethodError()));

	return app.route('/v1/gamer/properties')
		.all(_privateDomain)
		.get(getProp)
		.post(postProp)
		.delete(delProp)
		.all((req, res, next) => next(new errors.InvalidMethodError()));
};