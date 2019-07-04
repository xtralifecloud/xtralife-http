xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
cleanGamerForReturning = require('../util.coffee').cleanGamerForReturning

env = if process.env.NODE_ENV? then process.env.NODE_ENV else "dev"
Q = require 'bluebird'
_domainHandler = require './domainHandler.coffee'

_convert = (gamer_id, body) ->
	email: ->
		throw new errors.MissingParameter("id") unless body.id?
		throw new errors.MissingParameter("secret") unless body.secret?
		xtralife.api.connect.convertAccountToEmail gamer_id, body.id, xtralife.api.user.sha_passwd(body.secret)

	facebook: ->
		throw new errors.MissingParameter("secret") unless body.secret?
		xtralife.api.connect.convertAccountToFacebook gamer_id, body.secret

	googleplus: ->
		throw new errors.MissingParameter("secret") unless body.secret?
		xtralife.api.connect.convertAccountToGooglePlus gamer_id, body.secret

	gamecenter: ->
		throw new errors.MissingParameter("id") unless body.id?
		xtralife.api.connect.convertAccountToGameCenter gamer_id, body.id, body.options

_link = (user, token) ->
	facebook: (cb)->
		xtralife.api.connect.linkAccountWithFacebook user, token, (err, fbid)->
			if err?
				if err.type is 'OAuthException'
					err.code = 401
					return cb new errors.InvalidLoginTokenError
				else
					return cb err

			cb null, fbid

	googleplus: (cb)->
		xtralife.api.connect.linkAccountWithGoogle user, token, (err, gpid)->
			if err?
				if err.message is 'Invalid Credentials'
					err.code = 401
					return cb new errors.InvalidLoginTokenError
				else 
					return cb err
			cb null, gpid			

module.exports = (app)->

	app
	.route '/v1/gamer/device'
	.post (req, res, next)->
		os = req.query.os
		token = req.query.token
		domain = "#{req.game.appid}.#{req.game.apisecret}"
		unless os? then return next new errors.MissingData "os"
		unless token? then return next new errors.MissingData "token"
		xtralife.api.connect.registerToken req.gamer, os, token, domain, (err, count)->
			return next err if err?
			res
			.status 200
			.json { "done" : count }
			.end()

	.delete (req, res, next)->
		os = req.query.os
		token = req.query.token
		domain = "#{req.game.appid}.#{req.game.apisecret}"
		unless os? then return next new errors.MissingData "os"
		unless token? then return next new errors.MissingData "token"
		xtralife.api.connect.unregisterToken req.gamer, os, token, domain, (err, count)->
			return next err if err?
			res
			.status 200
			.json { "done" : count }
			.end()

	app.post "/v1/gamer/password", (req, res, next)->
		password = req.body.password
		unless password? then return next new errors.MissingData "password"
		if req.gamer.network != 'email' then return next new errors.InvalidLoginNetwork
		xtralife.api.connect.changePassword req.gamer._id, xtralife.api.user.sha_passwd(password), (err, done)->
			return next err if err?
			res.status(200).json { done }
			.end()

	app.post "/v1/gamer/email", (req, res, next)->
		email = req.body.email
		unless email? then return next new errors.MissingData "email"
		if req.gamer.network != 'email' then return next new errors.InvalidLoginNetwork
		xtralife.api.connect.changeEmail req.gamer._id, email, (err, done)->
			return next err if err?
			res.status(200).json { done }
			.end()

	app.post "/v1/gamer/logout", (req, res, next)->
		res.status(200).json {}
		.end()

	app.post "/v1/gamer/link", (req, res, next)->
		network = req.body['network']
		id = req.body['id']
		secret = req.body['secret']
		link = _link(req.gamer, secret)[network]
		unless link? then return next new errors.InvalidLoginNetwork
		unless id? then return next new errors.LoginError req
		unless secret? then return next new errors.LoginError req
		link (err, done)->
			if err?
				next err
			else
				res
				.status(200)
				.json done
				.end()

	app.post "/v1/gamer/unlink", (req, res, next)->
		network = req.body['network']
		xtralife.api.connect.unlink req.gamer, network, (err, done)->
			if err? then next err
			else
				res.status(200).json done
				.end()

	app.post "/v1/gamer/convert", (req, res, next)->
		network = req.body['network']
		conversion = _convert(req.gamer._id, req.body)
		allowedKeys = Object.keys(conversion)
		return next new errors.InvalidOption(network, allowedKeys) unless network in allowedKeys

		conversion[network]().then (result)->
			res.status(200).json { done: 1, gamer: cleanGamerForReturning(result) }
			.end()
		.catch next

	app.get "/v1/gamer/shortlogin", (req, res, next)->
		domain = "#{req.game.appid}.#{req.game.apisecret}" 
		xtralife.api.connect.createShortLoginCode domain, req.gamer._id, req.query.ttl, (err, shortcode)->
			if err? then next err
			else
				res.status(200).json {shortcode}
				.end()

	app.get '/v1/gamer/shortlogin/:domain', _domainHandler, (req, res, next)->
		xtralife.api.connect.createShortLoginCode req.params.domain, req.gamer._id,req.query.ttl, (err, shortcode)->
			if err? then next err
			else
				res.status(200).json {shortcode}
				.end()

	app.get '/v1/gamer/achievements/:domain', _domainHandler, (req, res, next)->
		xtralife.api.achievement.getUserAchievements req.gamer._id, req.params.domain
		.then (achievements)->
			res.status(200).json {achievements}
			.end()
		.catch next
		.done()

	app.get '/v1/gamer/achievements/:domain/:name/gamerdata', _domainHandler, (req, res, next)->
		xtralife.api.achievement.getUserAchievements req.gamer._id, req.params.domain
		.then (achievements)->
			data = achievements[req.params.name]?.gamerData
			throw new errors.InvalidAchievement if not data?

			res.status(200).json {gamerData: data}
			.end()
		.catch next
		.done()

	app.post '/v1/gamer/achievements/:domain/:name/gamerdata', _domainHandler, (req, res, next)->
		xtralife.api.achievement.modifyUserAchievementData req.context, req.gamer._id, req.params.domain, req.params.name, req.body
		.then (achievement)->
			res.status(200).json {achievement}
			.end()
		.catch next
		.done()

	app.post '/v1/gamer/nuke/me', (req, res, next)=>
		xtralife.api.onDeleteUser req.gamer._id, (err)=>
			unless err?
				res.status(200).json {nuked: true, dead: 'probably'}
			else
				next err
		, req.game.appid

	# Only in dev mode (for CLI tests), we allow to reset the status of achievements
	if env is 'dev'
		app.post '/v1/gamer/achievements/:domain/reset', _domainHandler, (req, res, next)->
			xtralife.api.achievement.resetAchievementsForUser req.context, req.gamer._id, req.params.domain, (err)->
				if err?
					next err
				else
					res.status(200).json({}).end()
