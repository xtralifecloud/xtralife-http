xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

domainHandler = require './domainHandler.coffee'

module.exports = (app)->


	app.route '/v2.6/gamer/godfather/:domain'
	.all domainHandler
	.put putgodfather = (req, res, next)->
		xtralife.api.social.godfatherCode  req.params.domain, req.gamer._id, (err, godfathercode)->
			if err? then return next err
			res
			.status 200
			.json {godfathercode}
			.end()

	.post postgodfather = (req, res, next)->
		return next new errors.MissingData "godfather" unless req.body.godfather?
		xtralife.api.social.setGodfather req.context, req.params.domain, req.gamer._id, req.body.godfather, req.body , (err, done)->
			if err? then return next err
			res
			.status 200
			.json { done }
			.end()

	.get getgodfather = (req, res, next)->
		xtralife.api.social.getGodfather req.context, req.params.domain, req.gamer._id, (err, godfather)->
			if err? then return next err
			res
			.status 200
			.json {godfather: godfather, customData : req.context.customData}
			.end()

	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v1/gamer/godfather'
	.all (req, res, next)->
		req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
		next()
	.get getgodfather
	.post postgodfather
	.put putgodfather
	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v2.6/gamer/godchildren/:domain'
	.all domainHandler
	.get getgodchildren = (req, res, next)->
		xtralife.api.social.getGodchildren req.context, req.params.domain, req.gamer._id, (err, godchildren)->
			if err? then return next err
			res
			.status 200
			.json {godchildren: godchildren, customData : req.context.customData}
			.end()

	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v1/gamer/godchildren'
	.all (req, res, next)->
		req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
		next()
	.get getgodchildren
	.all (req, res, next)->
		next new errors.InvalidMethodError()
