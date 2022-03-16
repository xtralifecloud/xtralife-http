/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const _domainHandler = require('./domainHandler.js');

const router = require('express').Router({ caseSensitive: true });

const forceGamerVFS_V1 = () => {
    return __guard__(__guard__(typeof xlenv !== 'undefined' && xlenv !== null ? xlenv.options : undefined, x1 => x1.feature), x => x.forceGamerVFS_V1);
};

router.route('/:domain/:key')
    .all(_domainHandler)
    .get((req, res, next) => xtralife.api.virtualfs.read(req.context, req.params.domain, req.gamer._id, req.params.key)
        .then(function (value) {
            if (value[req.params.key] == null) { return next(new errors.KeyNotFound(req)); }

            const result = forceGamerVFS_V1() || (req.version === "v1") ? value[req.params.key] : { result: value };

            return res
                .json(result)
                .end();
        }).catch(next)
        .done()).put(function (req, res, next) {
            const _write = (value, result) => xtralife.api.virtualfs.write(req.context, req.params.domain, req.gamer._id, req.params.key, value)
                .then(count => {
                    result.done = count;
                    if (req.context.customData != null) { result.customData = req.context.customData; }
                    return res
                        .json(result)
                        .end();
                });

            return ((req.query.binary != null) ?
                xtralife.api.virtualfs.createSignedURL(req.params.domain, req.gamer._id, req.params.key, req.query.contentType)
                    .then(([signedURL, getURL]) => _write(getURL, {
                        putURL: signedURL,
                        getURL
                    }
                    ).catch(next).done())
                :
                _write(req.body, {}).catch(next).done()
            )   
        }).delete(function (req, res, next) {
            if (req.query.binary != null) {
                xtralife.api.virtualfs.deleteURL(req.params.domain, req.gamer._id, req.params.key)
                    .catch(err => logger.error(err.message, { stack: err.stack }))
                    .done();
            }

            return xtralife.api.virtualfs.delete(req.context, req.params.domain, req.gamer._id, req.params.key)
                .then(function (count) {
                    const result = { done: count };
                    if (req.context.customData != null) { result.customData = req.context.customData; }
                    return res
                        .json(result)
                        .end();
                }).catch(next);
        }).all((req, res, next) => next(new errors.InvalidMethodError()));

// list all keys in domain, with values
router.route("/:domain")
    .all(_domainHandler)
    .all(function (req, res, next) {
        req.context = { game: req.game };
        return next();
    }).get((req, res, next) => xtralife.api.virtualfs.read(req.context, req.params.domain, req.gamer._id, null)
        .then(function (value) {
            const result = forceGamerVFS_V1() || (req.version === 'v1') ? value : { result: value };
            return res
                .json(result)
                .end();
        }).catch(next)
        .done()).put((req, res, next) => xtralife.api.virtualfs.write(req.context, req.params.domain, req.gamer._id, null, req.body)
            .then(function (count) {
                const result = { done: count };
                if (req.context.customData != null) { result.customData = req.context.customData; }
                return res
                    .json(result)
                    .end();
            }).catch(next)
            .done()).delete((req, res, next) => xtralife.api.virtualfs.delete(req.context, req.params.domain, req.gamer._id, null)
                .then(function (count) {
                    const result = { done: count };
                    if (req.context.customData != null) { result.customData = req.context.customData; }
                    return res
                        .json(result)
                        .end();
                }).catch(next)
                .done()).all((req, res, next) => next(new errors.InvalidMethodError()));

module.exports = router;
function __guard__(value, transform) {
    return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}