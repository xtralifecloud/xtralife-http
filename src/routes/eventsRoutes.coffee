xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
middleware = require '../middleware.coffee'

_domainHandler = require './domainHandler.coffee'

Q = require 'bluebird'
router = require('express').Router caseSensitive: true

router
.route '/volatile/:domain/:user'
.all _domainHandler
.post (req, res, next)->
	unless xtralife.api.game.hasListener(req.params.domain)
		return next new errors.NoListenerOnDomain(req.params.domain)

	message = req.body
	message.volatile = true
	message.from = req.gamer._id
	xlenv.broker.sendVolatile req.params.domain, req.params.user, message
	.then ()->
		res.status 200
		.json message # with .id field added
		.end()

	.catch (err)->
		next err

router
.route '/:domain/:user'
.all _domainHandler
.post (req, res, next)->
	unless xtralife.api.game.hasListener(req.params.domain)
		return next new errors.NoListenerOnDomain(req.params.domain)

	message = req.body
	xlenv.broker.send req.params.domain, req.params.user, message
	.then ()->
		res.status 200
		.json message # with .id field added
		.end()

	.catch (err)->
		next err

router
.route '/:domain'
.all _domainHandler
.get (req, res, next)->

	#logger.debug "#{JSON.stringify xtralife.api.game.eventedDomains}"

	unless xtralife.api.game.hasListener(req.params.domain)
		return next new errors.NoListenerOnDomain(req.params.domain)

	# ack=auto is not the default anymore
	# I don't know how tests could pass with the previous version
	# noack = not req.query.ack?

	timeout = (try parseInt req.query.timeout catch then 50000)
	if isNaN(timeout) then timeout=50000

	_receive = ()->
		isprivate = req.params.domain == "#{req.game.appid}.#{req.game.apisecret}"
		if isprivate then middleware.ccuIncrement req.game.appid, req.gamer._id.toString()

		xlenv.broker.receive req.params.domain, req.gamer._id.toString()
		.timeout timeout
		.then (message)->
			if req.query.ack is 'auto'
				xlenv.broker.ack req.params.domain, req.gamer._id.toString(), message.id
				.then ->
					res.status 200
					.json message
					.end()
			else
				res.status 200
				.json message
				.end()
		.catch (err)->
			if err.message.match /timed out/i
				#console.log "TIME OUT"
				res.status 204
				.end()
			else
				#console.log err
				next err
		.finally ()->
			if isprivate then middleware.ccuDecrement req.game.appid, req.gamer._id


	if req.query.ack? and req.query.ack isnt 'auto'
		xlenv.broker.ack req.params.domain, req.gamer._id.toString(), req.query.ack
		.then _receive
		.catch (err)->
			logger.error err
		.done()
	else
		_receive()
		.catch (err)->
			logger.error err
		.done()

module.exports = router