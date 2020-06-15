/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const _domainHandler = require('./domainHandler.js');

const router = require('express').Router({ caseSensitive: true });

const forbiddenRoute = function (req, res, next) {
    res.status(403); // forbidden
    res.header('X-Obsolete', 'true');
    res.json({ error: "This route is no longer available" });
    return res.end();
};

router.route('/:domain/:key')
    .all(_domainHandler)
    .get((req, res, next) => xtralife.api.gamevfs.read(req.params.domain, req.params.key, function (err, value) {
        if (err != null) { return next(err); }

        if (value[req.params.key] == null) { return next(new errors.KeyNotFound(req)); }
        const result = req.version === "v1" ? value[req.params.key] : { result: value };

        return res
            .status(200)
            .json(result)
            .end();
    })).put(forbiddenRoute)
    .delete(forbiddenRoute)

    .all((req, res, next) => next(new errors.InvalidMethodError()));

// list all keys in domain, with values
router.route("/:domain")
    .all(_domainHandler)
    .get((req, res, next) => xtralife.api.gamevfs.read(req.params.domain, null, function (err, value) {
        if (err != null) { return next(err); }

        const result = req.version === 'v1' ? value : { result: value };
        return res
            .status(200)
            .json(result)
            .end();
    })).put(forbiddenRoute)
    .delete(forbiddenRoute)

    .all((req, res, next) => next(new errors.InvalidMethodError()));

module.exports = router;