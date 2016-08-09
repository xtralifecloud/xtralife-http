xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

domainHandler = require './domainHandler.coffee'

_privateDomain = (req, _, next)->
	req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
	next()

module.exports = (app)->

	app.get "/v2.6/gamer/friends/:domain", domainHandler, getfriends = (req, res, next)->
		status = req.query['status']
		switch status
			when "blacklist"
				xtralife.api.social.getBlacklistedUsers req.context, req.params.domain, req.gamer._id, (err, list)->
					if err? then return next err
					res.status(200).json {blacklisted: list, customData : req.context.customData}
					.end()
			else
				xtralife.api.social.getFriends req.context, req.params.domain, req.gamer._id, (err, list)->
					if err? then return next err
					res.status(200).json {friends: list, customData : req.context.customData}
					.end()

	app.get "/v1/gamer/friends", _privateDomain, getfriends

	app.post "/v2.6/gamer/friends/:domain/:friendid", domainHandler, postfriendsfriend = (req, res, next)->
		status = req.query['status']
		friendid = req.params['friendid']
		unless status? then return next new errors.StatusNotFound
		if ["add", "forget", "blacklist"].indexOf(status)==-1 then return next new errors.StatusNotSupported
		xtralife.api.connect.exist friendid, (err, friend)->
			return next err if err?
			unless friend? then return next new errors.GamerIdNotFound

			xtralife.api.social.setFriendStatus req.params.domain, req.gamer._id, friend._id, status, req.body.osn, (err, list)->
				if err? then return next err
				res.status(200).json list
				.end()

	app.post "/v1/gamer/friends/:friendid", _privateDomain, postfriendsfriend



	# looking for friends of network
	app.post "/v2.12/gamer/friends/:domain", domainHandler, (req, res, next)->
		network = req.query['network']
		switch network
			when "googleplus", "facebook", "gamecenter"
				xtralife.api.social.getNetworkUsersAndMatch req.game, req.params.domain, req.gamer._id, network, req.body,  (err, list)->
					if err? then return next err
					result = {};
					result[network] = list
					res.status(200).json result
					.end()
			else
				next new errors.InvalidOption(network, ["googleplus", "facebook", "gamecenter"])

	app.post "/v2.6/gamer/friends/:domain", domainHandler, postfriends = (req, res, next)->
		network = req.query['network']
		switch network
			when "googleplus", "facebook", "gamecenter"
				xtralife.api.social.getNetworkUsers req.game, req.params.domain, req.gamer._id, network, req.body,  (err, list)->
					if err? then return next err
					result = {};
					result[network] = list
					res.status(200).json result
					.end()
			else
				next new errors.InvalidOption(network, ["googleplus", "facebook", "gamecenter"])

	app.post "/v1/gamer/friends", _privateDomain, postfriends
