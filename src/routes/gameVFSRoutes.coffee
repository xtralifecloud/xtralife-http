xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

_domainHandler = require './domainHandler.coffee'

router = require('express').Router caseSensitive: true

forbiddenRoute = (req, res, next)->
	res.status 403 # forbidden
	res.header 'X-Obsolete', 'true'
	res.json {error: "This route is no longer available"}
	res.end()

router.route '/:domain/:key'
.all _domainHandler
.get (req, res, next)->

	xtralife.api.gamevfs.read req.params.domain, req.params.key, (err, value)->
		if err? then return next err

		unless value[req.params.key]? then return next new errors.KeyNotFound req
		result = if req.version == "v1" then value[req.params.key] else { result : value }

		res
		.status 200
		.json value[req.params.key]
		.end()

.put forbiddenRoute
.delete forbiddenRoute

.all (req, res, next)->
	next new errors.InvalidMethodError()

# list all keys in domain, with values
router.route "/:domain"
.all _domainHandler
.get (req, res, next)->
	xtralife.api.gamevfs.read req.params.domain, null, (err, value)->
		if err? then return next err
		
		result = if req.version == 'v1' then value else { result : value } 
		res
		.status 200
		.json result
		.end()

.put forbiddenRoute
.delete  forbiddenRoute

.all (req, res, next)->
	next new errors.InvalidMethodError()

module.exports = router