/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');
const _ = require("underscore");

module.exports = function(app){

	// WARNING : should be the latests routes !!
	// this route is obsolete, shouble be removed when SD v2.0.0 will be dead
	// use /v1/users/:network/:id' instead

	app.route('/v1/gamer/:network/:id')
	.get(function(req, res, next){
		const method = req.params.network;
		//console.log {method}
		switch (method) {
			case "gamer_id":
				if (req.params.id == null) { return next(new errors.MissingData("id")); }
				return xtralife.api.connect.exist(req.params.id, function(err, result){
					if (err != null) { return next(err); }
					return res
					.status(200)
					.json(result)
					.end();
				});

			case "facebook":case "googleplus": case "anonymous": case "email": case "gamecenter":
				if (req.params.id == null) { return next(new errors.MissingData("id")); }
				return xtralife.api.connect.existInNetwork(method, req.params.id, function(err, result){
					if (err != null) { return next(err); }
					return res
					.status(200)
					.json(result)
					.end();
				});
			default:
				return next(new errors.InvalidOption(method, ["gamer_id", "facebook", "googleplus", "anonymous", "email", "gamecenter"]));
		}
	});
			
	return app.route('/v1/gamer')
	.get(function(req, res, next){
		if (req.query.q == null) { return next(new errors.MissingData("q")); }
		return xtralife.api.user.search(req.game.appid, req.query.q, parseInt(req.query.skip, 10) || 0, parseInt(req.query.limit, 10) || 10, function(err, count, fullresult){
			if (err != null) { return next(err); }
			const result = _.map(fullresult, item => ({
                user_id : item._id,
                network : item.network,
                networkid : item.networkid,
                profile : item.profile
            }));
			return res
			.status(200)
			.json({count, result})
			.end();
		});
	});
};

	// WARNING : NO ROUTES BEHIND THIS POINT !!


