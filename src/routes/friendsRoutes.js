/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const domainHandler = require('./domainHandler.js');

const _privateDomain = function(req, _, next){
	req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
	return next();
};

module.exports = function(app){

	let getfriends, postfriends, postfriendsfriend;
	app.get("/v2.6/gamer/friends/:domain", domainHandler, (getfriends = function(req, res, next){
		const status = req.query['status'];
		switch (status) {
			case "blacklist":
				return xtralife.api.social.getBlacklistedUsers(req.context, req.params.domain, req.gamer._id, function(err, list){
					if (err != null) { return next(err); }
					return res.status(200).json({blacklisted: list, customData : req.context.customData})
					.end();
				});
			default:
				return xtralife.api.social.getFriends(req.context, req.params.domain, req.gamer._id, function(err, list){
					if (err != null) { return next(err); }
					return res.status(200).json({friends: list, customData : req.context.customData})
					.end();
				});
		}
	})
	);

	app.get("/v1/gamer/friends", _privateDomain, getfriends);

	app.post("/v2.6/gamer/friends/:domain/:friendid", domainHandler, (postfriendsfriend = function(req, res, next){
		const status = req.query['status'];
		const friendid = req.params['friendid'];
		if (status == null) { return next(new errors.StatusNotFound); }
		if (["add", "forget", "blacklist"].indexOf(status)===-1) { return next(new errors.StatusNotSupported); }
		return xtralife.api.connect.exist(friendid, function(err, friend){
			if (err != null) { return next(err); }
			if (friend == null) { return next(new errors.GamerIdNotFound); }

			return xtralife.api.social.setFriendStatus(req.params.domain, req.gamer._id, friend._id, status, req.body.osn, function(err, list){
				if (err != null) { return next(err); }
				return res.status(200).json(list)
				.end();
			});
		});
	})
	);

	app.post("/v1/gamer/friends/:friendid", _privateDomain, postfriendsfriend);



	// looking for friends of network
	app.post("/v2.12/gamer/friends/:domain", domainHandler, function(req, res, next){
		const network = req.query['network'];
		switch (network) {
			case "googleplus": case "facebook": case "gamecenter":
				return xtralife.api.social.getNetworkUsersAndMatch(req.game, req.params.domain, req.gamer._id, network, req.body,  function(err, list){
					if (err != null) { return next(err); }
					const result = {};
					result[network] = list;
					return res.status(200).json(result)
					.end();
				});
			default:
				return next(new errors.InvalidOption(network, ["googleplus", "facebook", "gamecenter"]));
		}
	});

	app.post("/v2.6/gamer/friends/:domain", domainHandler, (postfriends = function(req, res, next){
		const network = req.query['network'];
		switch (network) {
			case "googleplus": case "facebook": case "gamecenter":
				return xtralife.api.social.getNetworkUsers(req.game, req.params.domain, req.gamer._id, network, req.body,  function(err, list){
					if (err != null) { return next(err); }
					const result = {};
					result[network] = list;
					return res.status(200).json(result)
					.end();
				});
			default:
				return next(new errors.InvalidOption(network, ["googleplus", "facebook", "gamecenter"]));
		}
	})
	);

	return app.post("/v1/gamer/friends", _privateDomain, postfriends);
};
