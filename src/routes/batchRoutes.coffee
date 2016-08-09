xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

_domainHandler = require './domainHandler.coffee'

unauthenticatedBatch = require('express').Router caseSensitive: true
authenticatedBatch = require('express').Router caseSensitive: true

_runbatch = (paramsfn)->
	(req, res, next)->
		hookName = "__#{req.params.name}"
		xtralife.api.game.runBatch req.context, req.params.domain, hookName, paramsfn(req)
		.then (customData)->
			res
			.status 200
			.json customData
			.end()
		.catch next
		.done()

unauthenticatedBatch.route '/:domain/:name'
.all _domainHandler
.post _runbatch (req)-> {domain: req.params.domain, request: req.body}

authenticatedBatch.route '/:domain/:name'
.all _domainHandler
.post _runbatch (req)-> {domain: req.params.domain, gamer_id: req.gamer._id, user_id: req.gamer._id, request: req.body}
# we set both user_id and gamer_id before gamer_id is better... but we used user_id first :-(

module.exports = {unauthenticatedBatch,authenticatedBatch}