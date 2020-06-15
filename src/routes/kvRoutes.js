/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');
const middleware = require('../middleware.js');

const _domainHandler = require('./domainHandler.js');

const Q = require('bluebird');
const router = require('express').Router({ caseSensitive: true });

router
    .route('/:domain/:key')
    .all(_domainHandler)
    .get((req, res, next) => //read
        xtralife.api.kv.get(req.context, req.params.domain, req.gamer._id, req.params.key)
            .then(function (ret) {
                if (ret == null) {
                    return res.status(404)
                        .end();
                } else {
                    return res.status(200)
                        .json(ret)
                        .end();
                }
            }).catch(next)).post((req, res, next) => //update
                xtralife.api.kv.set(req.context, req.params.domain, req.gamer._id, req.params.key, req.body.value)
                    .then(function (ret) {
                        if (ret == null) {
                            return res.status(404)
                                .end();
                        } else {
                            return res.status(200)
                                .json(ret)
                                .end();
                        }
                    }).catch(next)).delete((req, res, next) => //delete
                        xtralife.api.kv.del(req.context, req.params.domain, req.gamer._id, req.params.key)
                            .then(function (ret) {
                                if (ret == null) {
                                    return res.status(404)
                                        .end();
                                } else {
                                    return res.status(200)
                                        .json(ret)
                                        .end();
                                }
                            }).catch(next));

router
    .route('/:domain/:key/acl')
    .all(_domainHandler)
    .post((req, res, next) => //change ACLs
        xtralife.api.kv.changeACL(req.context, req.params.domain, req.gamer._id, req.params.key, req.body.acl)
            .then(function (ret) {
                if (ret == null) {
                    return res.status(404)
                        .end();
                } else {
                    return res.status(200)
                        .json(ret)
                        .end();
                }
            }).catch(next));



module.exports = router;