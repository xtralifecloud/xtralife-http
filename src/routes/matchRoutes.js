/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');
const {
    ObjectID
} = require('mongodb');
const {
    checkSchema
} = require('../middleware.js');
const route = require('express').Router({caseSensitive: true});
const _domainHandler = require('./domainHandler.js');
const {
    sanitizeDomain
} = require('../util.js');

//####################### Private functions ########################

// These fields are the only ones returned in most requests
const _restrictMatchFields = function(game, match){
	const standardAllowedFields = ['creator', 'customProperties', 'description', 'domain', 'events', 'globalState', 'lastEventId', '_id', 'maxPlayers', 'players', 'seed', 'shoe', 'status'];
	for (let prop in match) { if (!Array.from(standardAllowedFields).includes(prop)) { delete match[prop]; } }
	// Only reveal the shoe when the match is finished
	if (match.status !== 'finished') { delete match['shoe']; }
	if (match['domain'] != null) { match['domain'] = sanitizeDomain(game, match['domain']); }
	return match;
};

const _restrictBasicMatchFields = function(match){
	const standardAllowedFields = ['lastEventId', '_id', 'status'];
	for (let prop in match) { if (!Array.from(standardAllowedFields).includes(prop)) { delete match[prop]; } }
	return match;
};

const _restrictMultipleMatchesFields = function(match){
	const allowedFields = ['creator', 'customProperties', 'description', '_id', 'maxPlayers', 'status'];
	for (let prop in match) { if (!Array.from(allowedFields).includes(prop)) { delete match[prop]; } }
	return match;
};

// Exposes a list of matches to an object of type {match_id: {match_data}}
const _convertMatchesToReturnObject = function(matches){
	const result = [];
	for (let each of Array.from(matches)) {
		result.push(_restrictMultipleMatchesFields(each));
	}
	return {matches: result};
};

// Or a single match
const _convertMatchToReturnObject = (game, match) => ({
    match: _restrictMatchFields(game, match)
});

const _convertMatchToBasicReturnObject = match => ({
    match: _restrictBasicMatchFields(match)
});

//####################### Routes ########################
route.param('match_id', function(req, res, next, matchId){
	try {
		req.match_id = ObjectID(matchId);
		return next();
	} catch (error) {
		return next(new errors.InvalidMatch);
	}
});

route.param('friend_id', function(req, res, next, friendId){
	try {
		req.friend_id = ObjectID(friendId);
		return next();
	} catch (error) {
		return next(new errors.GamerIdNotFound);
	}
});

const _requires_lastEventId = function(req, _, next){
	try {
		if (req.query.lastEventId == null) { return next(new errors.MissingParameter('lastEventId')); }
		req.lastEventId = ObjectID(req.query.lastEventId);
		return next();
	} catch (error) {
		return next(new errors.MissingParameter('lastEventId'));
	}
};

route.route('/:match_id')
.get((req, res, next) => xtralife.api.match.getMatch(req.match_id)
.then(foundMatch => res
.status(200)
.json(_convertMatchToReturnObject(req.game, foundMatch))
.end()).catch(next)
.done()).delete((req, res, next) => xtralife.api.match.deleteMatch(req.context, req.match_id, req.gamer._id)
.then(count => res
.status(200)
.json({done: count})
.end()).catch(next)
.done());

route.route('/:match_id/finish')
.post(_requires_lastEventId, (req, res, next) => xtralife.api.match.finishMatch(req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId)
.then(function(finishedMatch){
    if (typeof err !== 'undefined' && err !== null) { return next(err); }
    return res
    .status(200)
    .json(_convertMatchToBasicReturnObject(finishedMatch))
    .end();}).catch(next)
.done());

route.route('/:match_id/join')
.post((req, res, next) => xtralife.api.match.joinMatch(req.context, req.match_id, req.gamer._id, req.body.osn)
.then(joinedMatch => res
.status(200)
.json(_convertMatchToReturnObject(req.game, joinedMatch))
.end()).catch(next)
.done());

route.route('/:match_id/leave')
.post((req, res, next) => xtralife.api.match.leaveMatch(req.context, req.match_id, req.gamer._id, req.body.osn)
.then(leftMatch => res
.status(200)
.json(_convertMatchToBasicReturnObject(leftMatch))
.end()).catch(next)
.done());

route.route('/:match_id/invite/:friend_id')
.post((req, res, next) => xtralife.api.match.inviteToMatch(req.context, req.match_id, req.gamer._id, req.friend_id, req.body.osn)
.then(function(updatedMatch){
    if (typeof err !== 'undefined' && err !== null) { return next(err); }
    return res
    .status(200)
    .json(_convertMatchToBasicReturnObject(updatedMatch))
    .end();}).catch(next)
.done());

route.route('/:match_id/invitation')
.delete((req, res, next) => xtralife.api.match.dismissInvitation(req.context, req.match_id, req.gamer._id)
.then(function(finishedMatch){
    if (typeof err !== 'undefined' && err !== null) { return next(err); }
    return res
    .status(200)
    .json(_convertMatchToBasicReturnObject(finishedMatch))
    .end();}).catch(next)
.done());


route.route('/:match_id/move')
.post(checkSchema({
	type: 'object',
	properties: {
		move: {
			type: 'object'
		},
		globalState: {
			type: 'object'
		}
	},
	required: ['move'],
	additionalProperties: true
}), _requires_lastEventId, (req, res, next) => xtralife.api.match.postMove(req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId, req.body)
.then(function(updatedMatch){
    if (typeof err !== 'undefined' && err !== null) { return next(err); }
    return res
    .status(200)
    .json(_convertMatchToBasicReturnObject(updatedMatch))
    .end();}).catch(next)
.done());

route.route('/:match_id/shoe/draw')
.post(_requires_lastEventId, function(req, res, next){
	const count = parseInt(req.query.count) || null;
	if (!count) { return next(new errors.MissingParameter('count')); }

	return xtralife.api.match.drawFromShoe(req.context, req.match_id, req.gamer._id, req.body.osn, req.lastEventId, count)
	.spread(function(match, drawnItems){
		const response = _convertMatchToBasicReturnObject(match);
		response.drawnItems = drawnItems;
		return res
		.status(200)
		.json(response)
		.end();}).catch(next)
	.done();
});

route.route('/')
.get(_domainHandler, function(req, res, next){
	const props =
		(req.query.properties != null) ? JSON.parse(req.query.properties) : {};
	// Limit to 30 matches by default
	const limit = parseInt(req.query.limit, 10) || 30;
	const skip = parseInt(req.query.skip, 10) || 0;
	const includeFinished = (req.query.finished != null);
	const includeFull = (req.query.full != null);
	const onlyParticipating = (req.query.participating != null);
	const onlyInvited = (req.query.invited != null);
	return xtralife.api.match.findMatches(req.params.domain, req.gamer._id, props, skip, limit, includeFinished, includeFull, onlyParticipating, onlyInvited)
	.spread(function(count, matches){
		const result = _convertMatchesToReturnObject(matches);
		result.count = count;
		return res
		.status(200)
		.json(result)
		.end();}).catch(next)
	.done();
}).post(checkSchema({
	type: 'object',
	properties: {
		description: {
			type: 'string'
		},
		maxPlayers: {
			type: 'number'
		},
		customProperties: {
			type: 'object',
			patternProperties: {
				".*": {
					type: ['number', 'string']
				}
			}
		},
		globalState: {
			type: 'object'
		},
		shoe: {
			type: 'array'
		}
	},
	required: ['maxPlayers'],
	additionalProperties: false
}), _domainHandler, (req, res, next) => xtralife.api.match.createMatch(req.context, req.params.domain, req.gamer._id, req.body.description, req.body.maxPlayers, req.body.customProperties, req.body.globalState, req.body.shoe)
.then(createdMatch => res
.status(200)
.json(_convertMatchToReturnObject(req.game, createdMatch))
.end()).catch(next)
.done());

module.exports = route;
