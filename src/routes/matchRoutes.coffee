xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
ObjectID = require('mongodb').ObjectID
checkSchema = require('../middleware.coffee').checkSchema
route = require('express').Router caseSensitive: true
_domainHandler = require './domainHandler.coffee'
sanitizeDomain = require('../util.coffee').sanitizeDomain

######################## Private functions ########################

# These fields are the only ones returned in most requests
_restrictMatchFields = (game, match)->
	standardAllowedFields = ['creator', 'customProperties', 'description', 'domain', 'events', 'globalState', 'lastEventId', '_id', 'maxPlayers', 'players', 'seed', 'shoe', 'status']
	delete match[prop] for prop of match when prop not in standardAllowedFields
	# Only reveal the shoe when the match is finished
	delete match['shoe'] if match.status isnt 'finished'
	match['domain'] = sanitizeDomain(game, match['domain']) if match['domain']?
	match

_restrictBasicMatchFields = (match)->
	standardAllowedFields = ['lastEventId', '_id', 'status']
	delete match[prop] for prop of match when prop not in standardAllowedFields
	match

_restrictMultipleMatchesFields = (match)->
	allowedFields = ['creator', 'customProperties', 'description', '_id', 'maxPlayers', 'status']
	delete match[prop] for prop of match when prop not in allowedFields
	match

# Exposes a list of matches to an object of type {match_id: {match_data}}
_convertMatchesToReturnObject = (matches)->
	result = []
	for each in matches
		result.push _restrictMultipleMatchesFields(each)
	return {matches: result}

# Or a single match
_convertMatchToReturnObject = (game, match)->
	return {match: _restrictMatchFields(game, match)}

_convertMatchToBasicReturnObject = (match)->
	return {match: _restrictBasicMatchFields(match)}

######################## Routes ########################
route.param 'match_id', (req, res, next, matchId)->
	try
		req.match_id = ObjectID(matchId)
		next()
	catch error
		next new errors.InvalidMatch

route.param 'friend_id', (req, res, next, friendId)->
	try
		req.friend_id = ObjectID(friendId)
		next()
	catch error
		next new errors.GamerIdNotFound

_requires_lastEventId = (req, _, next)->
	try
		return next new errors.MissingParameter('lastEventId') unless req.query.lastEventId?
		req.lastEventId = ObjectID(req.query.lastEventId)
		next()
	catch
		return next new errors.MissingParameter('lastEventId')

route.route '/:match_id'
.get (req, res, next)->
	xtralife.api.match.getMatch req.match_id
	.then (foundMatch)->
		res
		.status 200
		.json _convertMatchToReturnObject(req.game, foundMatch)
		.end()
	.catch next
	.done()

.delete (req, res, next)->
	xtralife.api.match.deleteMatch req.context, req.match_id, req.gamer._id
	.then (count)->
		res
		.status 200
		.json {done: count}
		.end()
	.catch next
	.done()

route.route '/:match_id/finish'
.post _requires_lastEventId, (req, res, next)->
	xtralife.api.match.finishMatch req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId
	.then (finishedMatch)->
		if err? then return next err
		res
		.status 200
		.json _convertMatchToBasicReturnObject(finishedMatch)
		.end()
	.catch next
	.done()

route.route '/:match_id/join'
.post (req, res, next)->
	xtralife.api.match.joinMatch req.context, req.match_id, req.gamer._id, req.body.osn
	.then (joinedMatch)->
		res
		.status 200
		.json _convertMatchToReturnObject(req.game, joinedMatch)
		.end()
	.catch next
	.done()

route.route '/:match_id/leave'
.post (req, res, next)->
	xtralife.api.match.leaveMatch req.context, req.match_id, req.gamer._id, req.body.osn
	.then (leftMatch)->
		res
		.status 200
		.json _convertMatchToBasicReturnObject(leftMatch)
		.end()
	.catch next
	.done()

route.route '/:match_id/invite/:friend_id'
.post (req, res, next)->
	xtralife.api.match.inviteToMatch req.context, req.match_id, req.gamer._id, req.friend_id, req.body.osn
	.then (updatedMatch)->
		if err? then return next err
		res
		.status 200
		.json _convertMatchToBasicReturnObject(updatedMatch)
		.end()
	.catch next
	.done()

route.route '/:match_id/invitation'
.delete (req, res, next)->
	xtralife.api.match.dismissInvitation req.context, req.match_id, req.gamer._id
	.then (finishedMatch)->
		if err? then return next err
		res
		.status 200
		.json _convertMatchToBasicReturnObject(finishedMatch)
		.end()
	.catch next
	.done()


route.route '/:match_id/move'
.post checkSchema(
	type: 'object'
	properties:
		move:
			type: 'object'
		globalState:
			type: 'object'
	required: ['move'],
	additionalProperties: false
), _requires_lastEventId, (req, res, next)->
	xtralife.api.match.postMove req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId, req.body
	.then (updatedMatch)->
		if err? then return next err
		res
		.status 200
		.json _convertMatchToBasicReturnObject(updatedMatch)
		.end()
	.catch next
	.done()

route.route '/:match_id/shoe/draw'
.post _requires_lastEventId, (req, res, next)->
	count = parseInt(req.query.count) or null
	return next new errors.MissingParameter('count') unless count

	xtralife.api.match.drawFromShoe req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId, count
	.spread (match, drawnItems)->
		response = _convertMatchToBasicReturnObject(match)
		response.drawnItems = drawnItems
		res
		.status 200
		.json response
		.end()
	.catch next
	.done()

route.route '/'
.get _domainHandler, (req, res, next)->
	props =
		if req.query.properties? then JSON.parse req.query.properties else {}
	# Limit to 30 matches by default
	limit = parseInt(req.query.limit, 10) or 30
	skip = parseInt(req.query.skip, 10) or 0
	includeFinished = req.query.finished?
	includeFull = req.query.full?
	onlyParticipating = req.query.participating?
	onlyInvited = req.query.invited?
	xtralife.api.match.findMatches req.params.domain, req.gamer._id, props, skip, limit, includeFinished, includeFull, onlyParticipating, onlyInvited
	.spread (count, matches)->
		result = _convertMatchesToReturnObject(matches)
		result.count = count
		res
		.status 200
		.json result
		.end()
	.catch next
	.done()

.post checkSchema(
	type: 'object'
	properties:
		description:
			type: 'string'
		maxPlayers:
			type: 'number'
		customProperties:
			type: 'object'
			patternProperties:
				".*":
					type: ['number', 'string']
		globalState:
			type: 'object'
		shoe:
			type: 'array'
	required: ['maxPlayers'],
	additionalProperties: false
), _domainHandler, (req, res, next)->
	xtralife.api.match.createMatch req.context, req.params.domain, req.gamer._id, req.body.description, req.body.maxPlayers, req.body.customProperties, req.body.globalState, req.body.shoe
	.then (createdMatch)->
		res
		.status 200
		.json _convertMatchToReturnObject(req.game, createdMatch)
		.end()
	.catch next
	.done()

module.exports = route
