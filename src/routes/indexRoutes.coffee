xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
middleware = require '../middleware.coffee'

_domainHandler = require './domainHandler.coffee'

Q = require 'bluebird'
router = require('express').Router caseSensitive: true

router
.route '/:domain/:indexName/search'
.post _domainHandler, (req, res, next)->
	{q, sort, max, from} = req.query
	sort =
		if sort?
			try
				JSON.parse(sort)
			catch
				[]
		else []

	from = parseInt(from) or 0
	max = parseInt(max) or 10
	max = 100 if max>100
	{domain, indexName} = req.params

	promise =
		if q? then xtralife.api.index.search domain.toLowerCase(), indexName, q, sort, from, max
		else xtralife.api.index.query domain.toLowerCase(), indexName, req.body, from, max

	promise.then (result)->
		res.status 200
		.json result.hits
		.end()
	.catch next

router
.route '/:domain/:indexName/:id'
.all _domainHandler
.get (req, res, next)->
	{id, domain, indexName} = req.params
	console.log "#{domain} / #{indexName} / #{id}"
	xtralife.api.index.get domain.toLowerCase(), indexName, id
	.then (result)->
		console.log result
		if result.found
			res.status 200
			.json result
			.end()
		else
			next new errors.NotFound()
	.catch (err)->
		if err.message is "Not Found" then next new errors.NotFound()
		else next err

.delete (req, res, next)->

	{domain, indexName, id} = req.params

	xtralife.api.index.delete domain.toLowerCase(), indexName, id
	.then (result)->
		res.status 200
		.json result
		.end()
	.catch next

router
.route '/:domain/:indexName'
.all _domainHandler
.post (req, res, next)->
	{id, properties, payload} = req.body
	{domain, indexName} = req.params

	xtralife.api.index.index domain.toLowerCase(), indexName, id, properties, payload
	.then (result)->
		res.status 200
		.json result
		.end()
	.catch next

module.exports = router