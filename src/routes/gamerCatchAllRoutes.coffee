xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
_ = require "underscore"

module.exports = (app)->

	# WARNING : should be the latests routes !!
	# this route is obsolete, shouble be removed when SD v2.0.0 will be dead
	# use /v1/users/:network/:id' instead

	app.route '/v1/gamer/:network/:id'
	.get (req, res, next)->
		method = req.params.network
		#console.log {method}
		switch method
			when "gamer_id"
				return next new errors.MissingData "id" unless req.params.id?
				xtralife.api.connect.exist req.params.id, (err, result)->
					if err? then return next err
					res
					.status 200
					.json result
					.end()

			when "facebook","googleplus", "anonymous", "email", "gamecenter"
				return next new errors.MissingData "id" unless req.params.id?
				xtralife.api.connect.existInNetwork method, req.params.id, (err, result)->
					if err? then return next err
					res
					.status 200
					.json result
					.end()
			else
				next new errors.InvalidOption(method, ["gamer_id", "facebook", "googleplus", "anonymous", "email", "gamecenter"])
			
	app.route '/v1/gamer'
	.get (req, res, next)->
		return next new errors.MissingData "q" unless req.query.q?
		xtralife.api.user.search req.game.appid, req.query.q, parseInt(req.query.skip, 10) || 0, parseInt(req.query.limit, 10) || 10, (err, count, fullresult)->
			if err? then return next err
			result = _.map fullresult, (item)->
				{user_id : item._id, network : item.network, networkid : item.networkid, profile : item.profile, }
			res
			.status 200
			.json {count, result}
			.end()

	# WARNING : NO ROUTES BEHIND THIS POINT !!


