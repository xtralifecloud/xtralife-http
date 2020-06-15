/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const _domainHandler = require('./domainHandler.js');

const unauthenticatedBatch = require('express').Router({ caseSensitive: true });
const authenticatedBatch = require('express').Router({ caseSensitive: true });

const _runbatch = paramsfn => (function (req, res, next) {
    const hookName = `__${req.params.name}`;
    return xtralife.api.game.runBatch(req.context, req.params.domain, hookName, paramsfn(req))
        .then(customData => res
            .status(200)
            .json(customData)
            .end()).catch(next)
        .done();
});

unauthenticatedBatch.route('/:domain/:name')
    .all(_domainHandler)
    .post(_runbatch(req => ({
        domain: req.params.domain,
        request: req.body
    })));

authenticatedBatch.route('/:domain/:name')
    .all(_domainHandler)
    .post(_runbatch(req => ({
        domain: req.params.domain,
        gamer_id: req.gamer._id,
        user_id: req.gamer._id,
        request: req.body
    })));
// we set both user_id and gamer_id before gamer_id is better... but we used user_id first :-(

module.exports = { unauthenticatedBatch, authenticatedBatch };