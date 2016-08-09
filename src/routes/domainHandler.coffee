xtralife = require 'xtralife-api'
errors = require '../errors.coffee'

module.exports = (req, _ , next)->
	req.params.domain = req.params.domain or req.query.domain
	# we could check that req.game has access to this domain
	if req.params.domain is "private"
		req.params.domain = "#{req.game.appid}.#{req.game.apisecret}"
		next()
	else
		xtralife.api.game.checkDomain req.game, req.params.domain, (err, allowed)=>
			return next() if allowed
			next new errors.InvalidDomain