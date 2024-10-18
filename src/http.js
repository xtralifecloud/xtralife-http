/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const xtralife = require("xtralife-api");
const bodyParser = require('body-parser');
const middleware = require('./middleware.js');
const Promise = require('bluebird');
const cors = require('cors');
const _ = require("underscore");

const env = (process.env.NODE_ENV != null) ? process.env.NODE_ENV : "dev";

const app = express();

app.use(bodyParser.json({ strict: false, limit: (xlenv.http.bodySizeLimit || '500kb') }));

app.use(middleware.requestLogger);

app.use(middleware.sanityChecks);

// Allow for mocking in dev/tests
if (env === 'dev') {
	const mockRouter = require('express').Router({ caseSensitive: true });
	app.mock = mockRouter;
	app.use('/mock', mockRouter);
}


// options does not use auth I think...
app.options('/*', cors(xlenv.http.cors));

app.get("/v1/ping", cors(xlenv.http.cors), function (req, res) {
	const response = { version: xlenv.version, utc: new Date() };
	if (xlenv.options.tag != null) {
		response.tag = xlenv.options.tag;
	}
	return res
		.set('content-type', 'application/json')
		.status(200)
		.json(response)
		.end();
});

// All routes require App authentication with x-apikey and x-apisecret
app.all("/v*/*", middleware.authenticateApp, middleware.apiCallCounter, cors(xlenv.http.cors), middleware.waterline);

// now setup routes
require('./routes.js')(app);

// missing entry point handler
app.use(middleware.missingEntryPoint);

// error handler
app.use(middleware.errorHandler);

const def = Promise.defer();

xtralife.configure(function (err) {
	if (err != null) { def.reject(err); }
	if (err != null) { return logger.error(err.message, { stack: err.stack }); }

	xlenv.inject(['=redisClient'], function (err, redis) {
		if (err != null) { return def.reject(err); }
		return xlenv.redis.client = redis;
	});

	// listen backlog set to a higher limit of 16384-1
	var server = http.createServer(app).listen(xlenv.http.port, 16383, function (err) {
		if (err != null) { return def.reject(err); }
		const { version } = require("../package.json");
		logger.info(`HTTP REST API server listening on port ${xlenv.http.port} (${version})`  );
		app.set('server', server);

		require('./metrics-server')

		return def.resolve(app);
	});

	return server.timeout = xlenv.http.timeout || 600000;
});

module.exports = def.promise;