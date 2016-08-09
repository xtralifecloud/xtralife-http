util = require 'util'
textBody = require "body"
_ = require "underscore"

xtralife = require 'xtralife-api'
errors = require "./errors.coffee"

basicAuth = require 'basic-auth'


env = if process.env.NODE_ENV? then process.env.NODE_ENV else "dev"

JaySchema = new (require 'jayschema')
minutes = 60*1000

# reset requests counter every minute
requestCount = 0
requestCountSignaled = false
setInterval ->
	requestCount = 0
	requestCountSignaled = false
, 1*minutes

module.exports =

	JaySchema: JaySchema

	# if you disable checkSchema, it will break your npm test dataset with a corrupted balance
	checkSchema: (schema)->
		(req, res, next) ->
			errs = JaySchema.validate(req.body, schema)

			if errs.length is 0 then next()
			else
				next new errors.InvalidJSONBody()

	requestLogger : (req, res, next)->
		res_end = res.end
		res_json = res.json
		startTime = Date.now()
		savedJson = null
		res.end = ()->
			duration = Date.now() - startTime
			info =
				appid: req.game?.appid or ''
				gamerid: if req.gamer? then req.gamer._id.toHexString() else ''
				method: req.method
				statusCode: res.statusCode
				duration: duration

			if logger.level is 'debug'
				info.jsonReq = util.inspect req.body
				info.jsonRes = util.inspect savedJson
				info.headers = req.headers

			if req.originalUrl != "/v1/ping"
				logger.info req.originalUrl, info

			res.end = res_end
			res_end.apply(res, arguments)

		if logger.level is 'debug'
			res.json = (json)->
				savedJson = json
				res.json = res_json
				res_json.apply(res,arguments)
		next()

	errorHandler : (err, req, res, next)->

		status = if err instanceof xtralife.errors.XLAPIError
			if err instanceof xtralife.errors.XLAPIRetryableError then 500 else 400
		else
			err.status or 500

		unless err instanceof errors.APIError or err instanceof xtralife.errors.XLAPIError
			logger.error err.message, {stack: err.stack}
		else
			logger.debug err.message,
				game: req.game
				headers: req.headers
				method: req.method
				url: req.originalUrl

		res
		.set 'content-type', 'application/json'
		.status status
		.json _.pick err, 'name', 'message', 'details'
		.end()

	missingEntryPoint: (req, res, next)->
		next(new errors.InvalidRoute())

	sanityChecks: (req, res, next)->
		unless req.body? then req.body={}
		next()

	# check app tokens in x-apikey and x-apisecret
	authenticateApp: (req, res, next)->
		try
			xapikey = req.headers['x-apikey']
			xapisecret = req.headers['x-apisecret']
			unless xapikey? and xapisecret? then next new errors.AppAuthenticationError req

			xtralife.api.game.checkAppCredentials xapikey, xapisecret, (err, game)->
				if err? then next new errors.InvalidAppAuthenticationError req
				else
					req.game = game
					req.context = game: req.game, runsFromClient: true
					next()

		catch error
			next new errors.InvalidAppAuthenticationError req

	# check gamer token in Authorization header
	# gamer must be valid in common users, not necessarily the current game's users
	authenticateGamer: (req, res , next)->
		try
			credentials = basicAuth(req) # contains .name and .pass

			# anonymous users log in with user_id
			xtralife.api.connect.existAndLog credentials.name, req.game.appid, (err, gamer)->
				if err?
					if err.message = 'Invalid GamerID'
						return next new errors.InvalidLoginTokenError req
					else
						return next err

				# if not found
				unless gamer? then return next new errors.InvalidLoginTokenError req

				gauth = _.find gamer.games , (g)->
					g.appid is req.game.appid

				return next new errors.forbiddenAccess req if gauth?.banned

				if xtralife.api.user.sha_passwd(gamer._id.toString()) is credentials.pass

					req.gamer = gamer
					next()
				else
					next new errors.InvalidLoginTokenError req

		catch error
			return next new errors.InvalidLoginTokenError req


	waterline: (req, res, next)->
		unless xlenv.http.waterline? then return next()
		if requestCountSignaled then return next() # no more signaling before setInterval resets it

		if requestCount++ > xlenv.http.waterline
			logger.warn "Shuttle-http: req/min reached waterline (#{xlenv.http.waterline} r/min)"
			requestCountSignaled = true # to avoid logging too often

		next()

	apiCallCounter: (req, res, next)->
		next()

	ccuIncrement: (appid, userid)->
		if appid? and userid?
			xlenv.redis.client.set "ccu.#{appid}:#{userid}", "1", "EX", 600, (err)->
				logger.error "ccuIncrement : #{JSON.stringify(err)}" if err?

	ccuDecrement: (appid, userid)->
		if appid? and userid?
			xlenv.redis.client.del "ccu.#{appid}:#{userid}", (err)->
				logger.error "ccuDecrement : #{JSON.stringify(err)}" if err?
