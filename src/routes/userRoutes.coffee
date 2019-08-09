middleware = require '../middleware.coffee'
xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

ourUtil = require('../util.coffee')
aes_decipher = ourUtil.aes_decipher
cleanGamerForReturning = ourUtil.cleanGamerForReturning
util = require 'util'
_ = require "underscore"

# when adding new network, remember to change the gamerCatchAllRoute.coffee file !!

_login = (game, id, token, options)->
	createanonymous: (cb)->
		profile = 
			displayName : "Guest"
			lang: "en"
		xtralife.api.connect.register game, "anonymous", null, null, profile, cb

	anonymous: (cb)->
		xtralife.api.connect.exist id, (err, gamer)->
			if err? then return cb err
			if gamer?
				sha = xtralife.api.user.sha_passwd(id)
				return cb new errors.LoginError unless sha is token
			cb err, gamer, false

	facebook: (cb)->
		xtralife.api.connect.loginfb game, token, options, (err, gamer, created)->
			if err? and err.type is 'OAuthException'
				return cb new errors.InvalidLoginTokenError
			cb err, gamer, created

	googleplus: (cb)->
		xtralife.api.connect.logingp game, token, options, (err, gamer, created)->
			if err? and err.message is 'Invalid Credentials'
				return cb new errors.InvalidLoginTokenError
			cb err, gamer, created

	gamecenter: (cb)->
		xtralife.api.connect.logingc game, id, JSON.parse(token), options, cb

	email: (cb)->
		xtralife.api.connect.login game, id, xtralife.api.user.sha_passwd(token), options, cb

	external: (cb)->
		xtralife.api.connect.loginExternal game, options.external, id, token, options, cb

	restore: (cb)->
		shortcode = token
		newpass = null
		idx = token.indexOf(":")
		if idx != -1 and idx!=0
			shortcode = token.substring 0, idx
			newpass = token.substr idx+1
		xtralife.api.connect.resolveShortLoginCode game, shortcode, (err, newid)=>
			return cb err if err?
			return cb new errors.LoginError unless newid?
			login = _login(game, newid, xtralife.api.user.sha_passwd(newid))["anonymous"]
			login (err, gamer, created)->
				return cb err if err?
				if newpass?
					xtralife.api.connect.changePassword gamer._id, xtralife.api.user.sha_passwd(newpass), (err, done)->
						gamer.passwordChanged = done
						cb err, gamer, created
				else
					cb err, gamer, created

_finalize = (req, res, next, gamer, created )->
	thenBatch = req.body.thenBatch or req.body.options?.thenBatch
	device = req.body['device']
	
	if device?.id?
		device.ts = new Date()
		device.ip = req.headers['x-forwarded-for'] or req.connection.remoteAddress
		xtralife.api.connect.trackDevice gamer._id, device
				
	result = cleanGamerForReturning(gamer)

	if thenBatch?
		params = 
			request : thenBatch.params
			user_id : result.gamer_id

		#TODO handle 'private' domain name !!!
		xtralife.api.game.runBatch req.context, thenBatch.domain, "__#{thenBatch.name}", params
		.then (customData)->
			result.customData = customData if customData?
			res
			.status(if created then 201 else 200)
			.json result
			.end()
		.catch next
		.done()
	else
		xtralife.api.outline.get req.game, gamer.gamer_id, req.game.config.domains, (err, outline)=>
			return next err if err?

			result = outline
			result.gamer_id = gamer.gamer_id
			result.gamer_secret = xtralife.api.user.sha_passwd(gamer.gamer_id)
			result.passwordChanged = gamer.passwordChanged if gamer.passwordChanged?
			res
			.status(if created then 201 else 200)
			.json result
			.end()

module.exports = (app)->

	app.post "/v1/login/anonymous", (req, res, next)->
		thenBatch = req.body.thenBatch or req.body.options?.thenBatch
		if thenBatch?
			return next new errors.MissingParameter("thenBatch.name") unless thenBatch.name?
			return next new errors.MissingParameter("thenBatch.domain") unless thenBatch.domain?
			return next new errors.MissingParameter("thenBatch.params") unless thenBatch.params?

		login = _login(req.game)["createanonymous"]
		login (err, gamer, created)->
			return next err if err?
			return next new errors.LoginError unless gamer?
			
			_finalize req, res, next, gamer


	app.post "/v1/login", (req, res, next)->
		network = req.body['network']
		id = req.body['id']
		secret = req.body['secret']
		options = req.body['options'] or {}
		thenBatch = req.body.thenBatch or req.body.options?.thenBatch

		if thenBatch?
			return next new errors.MissingParameter("thenBatch.name") unless thenBatch.name?
			return next new errors.MissingParameter("thenBatch.domain") unless thenBatch.domain?
			return next new errors.MissingParameter("thenBatch.params") unless thenBatch.params?
		
		if network?.startsWith("external:")
			options.external = network.slice 9
			network = "external"

		login = _login(req.game, id, secret, options)[network]
		unless login? then return next new errors.InvalidLoginNetwork
		unless id? then return next new errors.LoginError req
		unless secret? then return next new errors.LoginError req

		login (err, gamer, created)->
			return next err if err?
			return next new errors.LoginError unless gamer?
			
			gauth = _.find gamer.games, (g)->
				g.appid == req.game.appid

			return next new errors.forbiddenAccess if gauth?.banned

			if gamer.noBusinessManager
				res.header 'X-Obsolete', 'true'

			xtralife.api.connect.addGameToUser req.game, gamer, (err, count)->
				logger.error err.message, {stack: err.stack} if err?

			_finalize req, res, next, gamer, created

	_sendResetLinkMail = (req, res, next)->
		email = req.params.email
		title = req.body['title']
		body = req.body['body']
		from = req.body['from']
		html = req.body['html']

		return next new errors.MissingEmailTitle unless title?
		return next new errors.MissingEmailBody unless body?
		return next new errors.BadEmailTemplate if body.indexOf("[[SHORTCODE]]")==-1
		return next new errors.MissingSenderEmail unless from?
		return next new errors.BadEmailTemplate if html?.indexOf("[[SHORTCODE]]")==-1

		xtralife.api.connect.sendPassword req.game, email, from, title, body, html, (err, done)->
			return next err if err?
			res
			.status(200)
			.json done
			.end()

	app.route "/v1/login/:email"
	.get _sendResetLinkMail
	.post _sendResetLinkMail

	app.route '/v1/users/:network/:id'
	.get (req, res, next)->
		method = req.params.network
		switch method
			when "gamer_id"
				return next new errors.MissingData "id" unless req.params.id?
				xtralife.api.connect.exist req.params.id, (err, result)->
					if err? then return next err
					unless result? then return next new errors.GamerIdNotFound
					result.gamer_id = result._id
					delete result._id
					res
					.status 200
					.json result
					.end()

			when "facebook","googleplus", "anonymous", "email", "gamecenter"
				return next new errors.MissingData "id" unless req.params.id?
				xtralife.api.connect.existInNetwork method, req.params.id, (err, result)->
					if err? then return next err
					result.gamer_id = result._id
					delete result._id
					res
					.status 200
					.json result
					.end()
			else
				next new errors.InvalidOption(method, ["gamer_id", "facebook", "googleplus", "anonymous", "email", "gamecenter"])

