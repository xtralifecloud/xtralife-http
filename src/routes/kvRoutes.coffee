xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
middleware = require '../middleware.coffee'

_domainHandler = require './domainHandler.coffee'

Q = require 'bluebird'
router = require('express').Router caseSensitive: true

router
.route '/:domain/:key'
.all _domainHandler
.get (req,res,next)-> #read
	xtralife.api.kv.get req.context, req.params.domain, req.gamer._id, req.params.key
	.then (ret)->
		unless ret?
			res.status 404
			.end()
		else
			res.status 200
			.json ret
			.end()
	.catch next

.post (req,res,next)-> #update
	xtralife.api.kv.set req.context, req.params.domain, req.gamer._id, req.params.key, req.body.value
	.then (ret)->
		unless ret?
			res.status 404
			.end()
		else
			res.status 200
			.json ret
			.end()
	.catch next

.delete (req,res,next)-> #delete
	xtralife.api.kv.del req.context, req.params.domain, req.gamer._id, req.params.key
	.then (ret)->
		unless ret?
			res.status 404
			.end()
		else
			res.status 200
			.json ret
			.end()
	.catch next

router
.route '/:domain/:key/acl'
.all _domainHandler
.post (req,res,next)-> #change ACLs
	xtralife.api.kv.changeACL req.context, req.params.domain, req.gamer._id, req.params.key, req.body.acl
	.then (ret)->
		unless ret?
			res.status 404
			.end()
		else
			res.status 200
			.json ret
			.end()
	.catch next



module.exports = router