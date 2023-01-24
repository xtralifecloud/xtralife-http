/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
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
	.route('/:domain/:indexName/search')
	.post(_domainHandler, function (req, res, next) {
		let { q, sort, max, from } = req.query;
		sort =
			(sort != null) ?
				(() => {
					try {
						return JSON.parse(sort);
					} catch (error) {
						return [];
					}
				})()
				: [];

		from = parseInt(from) || 0;
		max = parseInt(max) || 10;
		if (max > 100) { max = 100; }
		const { domain, indexName } = req.params;

		const promise =
			(q != null) ? xtralife.api.index.search(req.context, domain.toLowerCase(), indexName, q, sort, from, max)
				: xtralife.api.index.query(req.context, domain.toLowerCase(), indexName, req.body, from, max);

		return promise.then(result => res.status(200)
			.json(result.body.hits)
			.end()).catch(next);
	});

router
	.route('/:domain/:indexName/:id(*)')
	.all(_domainHandler)
	.get(function (req, res, next) {
		const { id, domain, indexName } = req.params;
		return xtralife.api.index.get(req.context, domain.toLowerCase(), indexName, id)
			.then(function (result) {
				if (result.body.found) {
					return res.status(200)
						.json(result.body)
						.end();
				} else {
					return next(new errors.NotFound());
				}
			}).catch(function (err) {
				if (err.meta.body.found === false) {
					return next(new errors.NotFound());
				} else { return next(err); }
			});
	}).delete(function (req, res, next) {

		const { domain, indexName, id } = req.params;

		return xtralife.api.index.delete(req.context, domain.toLowerCase(), indexName, id)
			.then(result => res.status(200)
				.json(result)
				.end()).catch(next);
	});

router
	.route('/:domain/:indexName')
	.all(_domainHandler)
	.post(function (req, res, next) {
		const { id, properties, payload } = req.body;
		const { domain, indexName } = req.params;

		return xtralife.api.index.index(req.context, domain.toLowerCase(), indexName, id, properties, payload)
			.then(result => res.status(200)
				.json(result)
				.end()).catch(next);
	});

module.exports = router;