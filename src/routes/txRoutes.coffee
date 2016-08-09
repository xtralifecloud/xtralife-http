xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

_domainHandler = require './domainHandler.coffee'

JaySchema = require('../middleware.coffee').JaySchema
checkSchema = require('../middleware.coffee').checkSchema
checkRequest = require('../middleware.coffee').check
router = require('express').Router caseSensitive: true

router.get "/:domain/balance", _domainHandler, (req, res, next)->
	xtralife.api.transaction.balance req.context, req.params.domain, req.gamer._id
	.then (balance)->
		res.json balance
		.end()
	.catch next
	.done()

router.route "/:domain"
.all _domainHandler
.post (req, res, next)-> # TODO ?checkAchievements ?
	xtralife.api.transaction.transaction req.context, req.params.domain, req.gamer._id, req.body.transaction, req.body.description
	.spread (balance, achievements)->
		switch req.version
			when 'v1'
				result = balance
				res.header 'X-Obsolete', 'true'
			when 'v2.2' then result = {balance, achievements}
			else return next new errors.InvalidAPIVersion

		res.json result
		.end()
	.catch next
	.done()

.get  (req, res, next)-> # optional ?unit= param
	xtralife.api.transaction.txHistory req.params.domain, req.gamer._id, req.query.unit, parseInt(req.query.skip, 10) or 0, parseInt(req.query.limit, 10) or 100, (err, data)->
		if err? then return next err

		result =
			history: data.transactions
			servertime: new Date()
			count: data.count

		res.json result
		.end()

.all (req, res, next)->
	next new errors.InvalidMethodError()

module.exports = router