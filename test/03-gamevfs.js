/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let domain;
const request = require('supertest');
const should = require('should');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');
const xtralife = require('xtralife-api');

// TODO fix tests, put and delete are now disabled permanently

let game = (domain = null);

describe('GameVFS', function () {

	before('should wait for initialisation', function () {
		this.timeout(5000);
		return shuttlePromise.then(function (_shuttle) {
			shuttle = _shuttle;
			game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"];
			return domain = xtralife.api.game.getPrivateDomain(game.appid);
		});
	});

	before("should create a user", function (done) {
		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				dataset.gamer_id = res.body.gamer_id;
				dataset.gamer_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	it.skip('should delete all game-private keys to begin fresh', function (done) {
		request(shuttle)
			.delete('/v1/vfs/private')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.status.should.eql(200);
				return done(err);
			});
		return null;
	});

	it("should write two game-private 'test' and 'test2' keys", () => xtralife.api.gamevfs.writeAsync(domain, { test: { hi: "all" }, test2: { hello: "world" } }));

	it("should read the two game keys at once through xtralife only", function (done) {

		xtralife.api.gamevfs.readAsync(domain, ["test", "test2"])
			.then(function (result) {
				result.test.should.eql({ hi: "all" });
				result.test2.should.eql({ hello: "world" });
				return done();
			}).catch(done);
		return null;
	});


	it('should read the test key', function (done) {
		request(shuttle)
			.get('/v1/vfs/private/test')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.should.eql({ hi: "all" });
				return done(err);
			});
		return null;
	});

	it("should write a counter named 'counter'", function (done) {

		xtralife.api.gamevfs.writeAsync(domain, { counter: 0 })
			.then(() => xtralife.api.gamevfs.readAsync(domain, "counter")).then(function (result) {
				result.counter.should.eql(0);
				return xtralife.api.gamevfs.incr({}, domain, "counter", 1);
			}).then(function (result) {
				result.counter.should.eql(1);
				return xtralife.api.gamevfs.readAsync(domain, "counter");
			}).then(result => result.counter.should.eql(1)).then(() => xtralife.api.gamevfs.delete(domain, "counter", function (err) {
				if (err != null) { return done(err); }
				return done();
			})).catch(done);
		return null;
	});

	it('should read all private keys', function (done) {
		request(shuttle)
			.get('/v1/vfs/private')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.status.should.eql(200);
				res.body.should.eql({ test: { hi: "all" }, test2: { hello: 'world' } });
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it.skip('should delete the test key', function (done) {
		request(shuttle)
			.delete('/v1/vfs/private/test')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }
				return request(shuttle)
					.get('/v1/vfs/private')
					.set(dataset.validAppCredentials)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({ test2: { hello: "world" } });
						return done(err);
					});
			});
		return null;
	});

	it('should handle a missing key with a 404', function (done) {
		request(shuttle)
			.get('/v1/vfs/private/test3')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(404)
			.end(function (err, res) {
				res.status.should.eql(404);
				return done(err);
			});
		return null;
	});

	it.skip('should allow setting all keys at once', function (done) {
		request(shuttle)
			.put('/v1/vfs/private')
			.set(dataset.validAppCredentials)
			.set('Content-Type', 'application/json')
			.send({ testAll: { hi: "all" } })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ "done": 1 });
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/vfs/private/testAll')
					.set(dataset.validAppCredentials)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.status.should.eql(200);
						res.body.should.eql({ hi: "all" });
						if (err != null) { return done(err); }
						return done(err);
					});
			});
		return null;
	});


	it.skip('should delete all game-private keys', function (done) {
		request(shuttle)
			.delete('/v1/vfs/private')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/vfs/private')
					.set(dataset.validAppCredentials)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({});
						return done(err);
					});
			});
		return null;
	});

	it.skip("should write in specific domain com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3", function (done) {
		request(shuttle)
			.put('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/test')
			.set(dataset.validAppCredentials)
			.set('Content-Type', 'application/json')
			.send({ hi: "all" })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ "done": 1 });
				res.status.should.eql(200);
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it.skip('should read all domain keys', function (done) {
		request(shuttle)
			.get('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				res.body.test.should.eql({ hi: "all" });
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it.skip('should delete all domain keys', function (done) {
		request(shuttle)
			.delete('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
					.set(dataset.validAppCredentials)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({});
						return done(err);
					});
			});
		return null;
	});

	return it("should not access in an unknown domain", function (done) {
		request(shuttle)
			.put('/v1/vfs/com.clanofthecloud.cloudbuilder.whaterver/test')
			.set(dataset.validAppCredentials)
			.set('Content-Type', 'application/json')
			.send({ hi: "all" })
			.expect('content-type', /json/)
			.expect(404)
			.end(function (err, res) {
				res.status.should.eql(404);
				return done(err);
			});
		return null;
	});
});

describe.skip("Binary GameVFS", function () {

	const getURL = null;
	before('should wait for initialisation', done => shuttlePromise.then(function (_shuttle) {
		shuttle = _shuttle;
		return done();
	}).catch(done));

	it('should create binary keys and return presigned url', function (done) {
		request(shuttle)
			.put('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary')
			.set(dataset.validAppCredentials)
			.set('Content-Type', 'application/json')
			.expect('content-type', /json/)
			.expect(403)
			.end(function (err, res) {
				res.body.error.should.eql('This route is no longer available');
				return done(err);
			});
		return null;
	});

	return it("should delete S3 data", function (done) {
		request(shuttle)
			.delete('/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(403)
			.end(function (err, res) {
				res.body.error.should.eql('This route is no longer available');
				return done(err);
			});
		return null;
	});
});



