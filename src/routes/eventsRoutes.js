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
	.route('/volatile/:domain/:user')
	.all(_domainHandler)
	.post(function (req, res, next) {
		if (!xtralife.api.game.hasListener(req.params.domain)) {
			return next(new errors.NoListenerOnDomain(req.params.domain));
		}

		const message = req.body;
		message.volatile = true;
		message.from = req.gamer._id;
		return xlenv.broker.sendVolatile(req.params.domain, req.params.user, message)
			.then(() => res.status(200)
				.json(message) // with .id field added
				.end()).catch(err => next(err));
	});

router
	.route('/:domain/:user')
	.all(_domainHandler)
	.post(function (req, res, next) {
		if (!xtralife.api.game.hasListener(req.params.domain)) {
			return next(new errors.NoListenerOnDomain(req.params.domain));
		}

		const message = req.body;
		return xlenv.broker.send(req.params.domain, req.params.user, message)
			.then(() => res.status(200)
				.json(message) // with .id field added
				.end()).catch(err => next(err));
	});

router
	.route('/:domain')
	.all(_domainHandler)
	.get(function (req, res, next) {

		//logger.debug "#{JSON.stringify xtralife.api.game.eventedDomains}"

		if (!xtralife.api.game.hasListener(req.params.domain)) {
			return next(new errors.NoListenerOnDomain(req.params.domain));
		}

		// ack=auto is not the default anymore
		// I don't know how tests could pass with the previous version
		// noack = not req.query.ack?

		let timeout = 50000;
		try {
			timeout = parseInt(req.query.timeout);
		} catch (error) { }
		if (isNaN(timeout)) { timeout = 50000; }

		const _receive = function () {
			const isprivate = req.params.domain === `${req.game.appid}.${req.game.apisecret}`;
			if (isprivate) { middleware.ccuIncrement(req.game.appid, req.gamer._id.toString()); }

			return xlenv.broker.receive(req.params.domain, req.gamer._id.toString())
				.timeout(timeout)
				.then(function (message) {
					if (req.query.ack === 'auto') {
						return xlenv.broker.ack(req.params.domain, req.gamer._id.toString(), message.id)
							.then(() => res.status(200)
								.json(message)
								.end());
					} else {
						return res.status(200)
							.json(message)
							.end();
					}
				}).catch(function (err) {
					if (err.message.match(/timed out/i)) {
						//console.log "TIME OUT"
						return res.status(204)
							.end();
					} else {
						//console.log err
						return next(err);
					}
				}).finally(function () {
					if (isprivate) { return middleware.ccuDecrement(req.game.appid, req.gamer._id); }
				});
		};

		if ((req.query.ack != null) && (req.query.ack !== 'auto')) {
			return xlenv.broker.ack(req.params.domain, req.gamer._id.toString(), req.query.ack)
				.then(_receive)
				.catch(err => logger.error(err)).done();
		} else {
			return _receive()
				.catch(err => logger.error(err)).done();
		}
	});

module.exports = router;