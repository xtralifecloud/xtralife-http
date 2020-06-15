/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

module.exports = function (req, _, next) {
	req.params.domain = req.params.domain || req.query.domain;
	// we could check that req.game has access to this domain
	if (req.params.domain === "private") {
		req.params.domain = `${req.game.appid}.${req.game.apisecret}`;
		return next();
	} else {
		return xtralife.api.game.checkDomain(req.game, req.params.domain, (err, allowed) => {
			if (allowed) { return next(); }
			return next(new errors.InvalidDomain);
		});
	}
};