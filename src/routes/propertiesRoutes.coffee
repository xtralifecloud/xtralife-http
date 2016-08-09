xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

domainHandler = require './domainHandler.coffee'

_privateDomain = (req,_,next)->
	req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
	next()

module.exports = (app)->

	app.route '/v2.6/gamer/property/:domain/:key'
	.all domainHandler
	.post postProperty = (req, res, next)->
		xtralife.api.user.write  req.context, req.params.domain, req.gamer._id, req.params.key, req.body.value
		.then (count)->
			result = done:count
			if req.context.customData? then result.customData = req.context.customData
			res
			.json result
			.end()
		.catch next
		.done()

	.get getProperty = (req, res, next)->
		xtralife.api.user.read req.context, req.params.domain, req.gamer._id, req.params.key
		.then (properties)->
			res
			.json {properties}
			.end()
		.catch next
		.done()

	.delete deleteProperty = (req, res, next)->
		xtralife.api.user.delete req.context, req.params.domain, req.gamer._id, req.params.key
		.then (count)->
			result = done:count
			if req.context.customData? then result.customData = req.context.customData
			res
			.json result
			.end()
		.catch next
		.done()

	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v1/gamer/property/:key'
	.all _privateDomain
	.post postProperty
	.get getProperty
	.delete deleteProperty
	.all (req, res, next)->
		next new errors.InvalidMethodError()


	app.route '/v2.6/gamer/property/:domain'
	.all domainHandler
	.post postProperties = (req, res, next)->
		xtralife.api.user.write req.context, req.params.domain, req.gamer._id, null, req.body
		.then (count)->
			result = done:count
			if req.context.customData? then result.customData = req.context.customData
			res
			.json result
			.end()
		.catch next
		.done()

	.get getProperties = (req, res, next)->
		xtralife.api.user.read req.context, req.params.domain, req.gamer._id
		.then (properties)->
			res
			.json {properties}
			.end()
		.catch next
		.done()

	.delete deleteProperties = (req, res, next)->
		xtralife.api.user.delete req.context, req.params.domain, req.gamer._id
		.then (count)->
			result = done:count
			if req.context.customData? then result.customData = req.context.customData
			res
			.json result
			.end()
		.catch next
		.done()

	.all (req, res, next)->
		next new errors.InvalidMethodError()


	app.route '/v1/gamer/property'
	.all _privateDomain
	.post postProperties
	.get getProperties
	.delete deleteProperties
	.all (req, res, next)->
		next new errors.InvalidMethodError()

	# Deprecated since 2.11
	# use indexing API instead
	app.get "/v2.6/gamer/matchproperties/:domain", domainHandler, matchProperties = (req, res, next)->
		res.status(410)
		.json {error: "deprecated"}
		.end()

	app.get "/v1/gamer/matchproperties", _privateDomain, matchProperties