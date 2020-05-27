/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const _domainHandler = require('./domainHandler.js');

const checkRequest = require('../middleware.js').check;
const router = require('express').Router({caseSensitive: true});

router.get("/:domain/balance", _domainHandler, (req, res, next) => xtralife.api.transaction.balance(req.context, req.params.domain, req.gamer._id)
.then(balance => res.json(balance)
.end()).catch(next)
.done());

router.route("/:domain")
.all(_domainHandler)
.post((req, res, next) => // TODO ?checkAchievements ?
xtralife.api.transaction.transaction(req.context, req.params.domain, req.gamer._id, req.body.transaction, req.body.description)
.spread(function(balance, achievements){
    let result;
    switch (req.version) {
        case 'v1':
            result = balance;
            res.header('X-Obsolete', 'true');
            break;
        case 'v2.2': result = {balance, achievements}; break;
        default: return next(new errors.InvalidAPIVersion);
    }

    return res.json(result)
    .end();}).catch(next)
.done()).get((req, res, next) => // optional ?unit= param
xtralife.api.transaction.txHistory(
    req.params.domain,
    req.gamer._id,
    req.query.unit,
    parseInt(req.query.skip, 10) || 0,
    parseInt(req.query.limit, 10) || 100,
    function(err, data){
		if (err != null) { return next(err); }

		const result = {
			history: data.transactions,
			servertime: new Date(),
			count: data.count
		};

		return res.json(result)
		.end();
	}
)).all((req, res, next) => next(new errors.InvalidMethodError()));

module.exports = router;