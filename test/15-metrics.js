/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');
const xtralife = require('xtralife-api');

let server = null;
const serverPromise = require('../src/metrics-server.js');

describe('Metrics', function () {

	before('should wait for initialisation', () => serverPromise.then(_server => server = _server));

	it("should get metrics from the /metrics endpoint", function (done) {

		const Counter = xtralife.api.game.getMetrics().Counter;
		metric = new Counter({ name: "http_test_metric", help: "test metric", labelNames: ['game'] })
		metric.labels('test').inc()

		console.log("getting metrics")
		request(server)
			.get('/metrics')
			.send({})
			.expect('content-type', /text/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				(res.text.indexOf(`http_test_metric{game="test`) != -1).should.be.true()
				console.log(res.text)
				return done();
			});
		return null;
	});
});
