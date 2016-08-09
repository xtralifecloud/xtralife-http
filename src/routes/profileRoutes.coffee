xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

domainHandler = require './domainHandler.coffee'

_privateDomain = (req, res, next)->
	req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
	next()

module.exports = (app)->

	app.get "/v1/gamer/outline", (req, res, next)->
		domains = if req.query.domains? then req.query.domains.split(',') else req.game.config.domains
		if req.query.flat?
			xtralife.api.outline.getflat req.game, req.gamer._id, domains, (err, outline)->
				if err? then return next err
				res
				.status 200
				.json {outline}
				.end()
		else
			xtralife.api.outline.get req.game, req.gamer._id, domains, (err, outline)->
				if err? then return next err
				res
				.status 200
				.json {outline}
				.end()


	app.route '/v1/gamer/profile'
	.post (req, res, next)->
		xtralife.api.user.setProfile  req.gamer, req.body, (err, newprofile)->
			if err? then return next err
			res
			.status 200
			.json newprofile
			.end()

	.get (req, res, next)->
		xtralife.api.user.getProfile req.gamer, (err, profile)->
			if err? then return next err
			res
			.status 200
			.json profile
			.end()


	app.route '/v2.6/gamer/properties/:domain'
	.all domainHandler
	.post postProp = (req, res, next)->
		xtralife.api.user.saveProperties  req.game._id, req.gamer._id, req.body, (err, properties)->
			if err? then return next err
			res
			.status 200
			.json properties
			.end()

	.get getProp = (req, res, next)->
		xtralife.api.user.loadProperties req.game._id, req.gamer._id, (err, properties)->
			if err? then return next err
			res
			.status 200
			.json properties
			.end()

	.delete delProp = (req, res, next)->
		xtralife.api.user.delProperties req.game._id, req.gamer._id, (err, count)->
			if err? then return next err
			res
			.status 200
			.json count
			.end()

	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v1/gamer/properties'
	.all _privateDomain
	.get getProp
	.post postProp
	.delete delProp
	.all (req, res, next)-> next new errors.InvalidMethodError()