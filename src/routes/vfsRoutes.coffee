xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

_domainHandler = require './domainHandler.coffee'

router = require('express').Router caseSensitive: true

forceGamerVFS_V1 = ()=>
	return xlenv?.options?.feature?.forceGamerVFS_V1

router.route '/:domain/:key'
.all _domainHandler
.get (req, res, next)->
	xtralife.api.virtualfs.read req.context, req.params.domain, req.gamer._id, req.params.key
	.then (value)->
		unless value[req.params.key]? then return next new errors.KeyNotFound req

		result = if forceGamerVFS_V1() or req.version == "v1" then value[req.params.key] else { result : value }

		res
		.json result
		.end()
	.catch next
	.done()

.put (req, res, next)->

	_write = (value, result)->
		xtralife.api.virtualfs.write req.context, req.params.domain, req.gamer._id, req.params.key, value
		.then (count)->
			result.done = count
			if req.context.customData? then result.customData = req.context.customData
			res
			.json result
			.end()

	(if req.query.binary?
		xtralife.api.virtualfs.createSignedURL req.params.domain, req.gamer._id, req.params.key, req.query.contentType
		.spread (signedURL, getURL)->
			_write getURL,
				putURL: signedURL
				getURL: getURL
	else
		_write req.body, {}
	)
	.catch next
	.done()

.delete (req, res, next)->
	if req.query.binary?
		xtralife.api.virtualfs.deleteURL req.params.domain, req.gamer._id, req.params.key
		.catch (err)->
			logger.error err.message, {stack: err.stack}
		.done()

	xtralife.api.virtualfs.delete req.context, req.params.domain, req.gamer._id, req.params.key
	.then (count)->
		result = done:count
		if req.context.customData? then result.customData = req.context.customData
		res
		.json result
		.end()
	.catch next

.all (req, res, next)->
	next new errors.InvalidMethodError()

# list all keys in domain, with values
router.route "/:domain"
.all _domainHandler
.all (req, res, next)->
	req.context = game: req.game
	next()
.get (req, res, next)->
	xtralife.api.virtualfs.read req.context, req.params.domain, req.gamer._id, null
	.then (value)->
		result = if forceGamerVFS_V1() or req.version == 'v1' then value else { result : value } 
		res
		.json result
		.end()
	.catch next
	.done()

.put (req, res, next)->
	xtralife.api.virtualfs.write req.context, req.params.domain, req.gamer._id, null, req.body
	.then (count)->
		result = done:count
		if req.context.customData? then result.customData = req.context.customData
		res
		.json result
		.end()
	.catch next
	.done()

# delete all keys in domain, with values
.delete  (req, res, next)->
	xtralife.api.virtualfs.delete req.context, req.params.domain, req.gamer._id, null
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

module.exports = router