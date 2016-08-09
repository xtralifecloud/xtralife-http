xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

domainHandler = require './domainHandler.coffee'

module.exports = (app)->

	app.route '/v2.6/gamer/scores/:domain/:leaderboard'
	.all domainHandler
	.post postScore = (req, res, next)->
		board = req.params.leaderboard
		info = req.body.info
		order = req.query.order || "hightolow"
		score = Number(req.body.score)
		return next new errors.ScoreNotFound if isNaN(score)
		if ["hightolow", "lowtohigh"].indexOf(order)==-1 then return next new errors.InvalidScoreOrder

		domain = req.params.domain

		mayvary = req.query.mayvary? and ( req.query.mayvary.toLowerCase() isnt "false" )
		force = req.query.force? and ( req.query.force.toLowerCase() isnt "false" )

		xtralife.api.leaderboard.score  domain, req.gamer._id, board, order, score, info, (mayvary or force), (err, rank)->
			if err? then return next err
			res
			.status 200
			.json rank
			.end()

	.get getScores = (req, res, next)->
		board = req.params.leaderboard
		order = req.query.order || 'hightolow'

		page = req.query.page || 1
		if page == "me" 
			page = -1 
		else
			page = parseInt(page, 10)
			return next new errors.BadPageScore if isNaN(page) or page<=0

		if req.query.count?
			count = parseInt(req.query.count, 10)
			return next new errors.BadCountScore if isNaN(count) or count<=0
		else
			count = 10

		type = req.query.type || "highscore"

		if ["hightolow", "lowtohigh"].indexOf(order)==-1 then return next new errors.InvalidScoreOrder
		if ["highscore", "friendscore"].indexOf(type)==-1 then return next new errors.InvalidScoreType

		domain = req.params.domain
		
		if type == "highscore"
			xtralife.api.leaderboard.gethighscore req.context, domain, req.gamer._id, board, page, count, (err, leaderboard)->
				if err? then return next err
				if req.context.customData? then leaderboard.customData = req.context.customData
				res
				.status 200
				.json leaderboard
				.end()
		else
			xtralife.api.leaderboard.getfriendscore req.context, domain, req.gamer._id, board, order, page, count, (err, leaderboard)->
				if err? then return next err
				if req.context.customData? then leaderboard.customData = req.context.customData
				res
				.status 200
				.json leaderboard
				.end()

	.put (req, res, next)->
		domain = req.params.domain
		board = req.params.leaderboard
		score = Number(req.body.score)
		xtralife.api.leaderboard.getrank domain, board, score, (err, rank)->
			if err? then return next err
			res
			.status 200
			.json {rank}
			.end()
		
	.all (req, res, next)->
		next new errors.InvalidMethodError()

	app.route '/v1/gamer/scores/:leaderboard'
	.all (req, res, next)->
		req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
		res.header 'X-Obsolete', 'true'
		next()
	.post postScore
	.get getScores
	.all (req, res, next)->
		next new errors.InvalidMethodError()


	app.get "/v2.6/gamer/bestscores/:domain", domainHandler, getBestscores = (req, res, next)->
		xtralife.api.leaderboard.bestscores req.params.domain, req.gamer._id, (err, scores)->
			if err? then return next err
			res
			.status 200
			.json scores
			.end()

	app.route "/v1/gamer/bestscores"
	.all (req, res, next)->
		req.params.domain = xtralife.api.game.getPrivateDomain req.game.appid
		res.header 'X-Obsolete', 'true'
		next()
	.get getBestscores
