/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');
let xtralife = require('xtralife-api');

let {
	ObjectId
} = require('mongodb');

xtralife = require('xtralife-api');

({
	ObjectId
} = require('mongodb'));

describe('gamerVFS', function () {

	let getURL;
	before('should wait for initialisation', function () {
		this.timeout(5000);
		return shuttlePromise
			.then(_shuttle => shuttle = _shuttle);
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

	it('should delete all game-private keys to begin fresh', function (done) {
		request(shuttle)
			.delete('/v1/gamer/vfs/private')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.status.should.eql(200);
				return done();
			});
		return null;
	});

	it("should write two keys at once, 'test' and 'test2', through xtralife", function () {

		const game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"];
		const domain = xtralife.api.game.getPrivateDomain(game.appid);

		return xtralife.api.virtualfs.write({ game }, domain, new ObjectId(dataset.gamer_id), { test: "test", test2: "test2" });
	});


	it("should read the two game private at once through xtralife only", function () {
		const game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"];
		const domain = xtralife.api.game.getPrivateDomain(game.appid);

		return xtralife.api.virtualfs.read({ game }, domain, new ObjectId(dataset.gamer_id), ["test", "test2"])
			.then(function (result) {
				//console.log result
				result.test.should.eql("test");
				return result.test2.should.eql("test2");
			});
	});

	it("should write two game-private 'test' and 'test2' keys", function (done) {
		request(shuttle)
			.put('/v1/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.set('Content-Type', 'application/json')
			.send({ hi: "all" })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ "done": 1 });
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.put('/v1/gamer/vfs/private/test2')
					.set(dataset.validAppCredentials)
					.auth(dataset.gamer_id, dataset.gamer_token)
					.send({ hello: 'world' })
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({ "done": 1 });
						res.status.should.eql(200);
						if (err != null) { return done(err); }
						return done(err);
					});
			});
		return null;
	});

	it('should read the test key', function (done) {
		request(shuttle)
			.get('/v1/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ hi: "all" });
				return done(err);
			});
		return null;
	});

	it('should read the test key with newest API', function (done) {
		request(shuttle)
			.get('/v3/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ result: { test: { hi: "all" } } });
				return done(err);
			});
		return null;
	});

	it('should allow forcing v1 api even when called with v3', function (done) {
		xlenv.options.feature.forceGamerVFS_V1 = true;

		request(shuttle)
			.get('/v3/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ hi: "all" });
				xlenv.options.feature.forceGamerVFS_V1 = false;
				return done(err);
			});
		return null;
	});

	it('should read all private keys', function (done) {
		request(shuttle)
			.get('/v1/gamer/vfs/private')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				res.body.should.eql({ test: { hi: "all" }, test2: { hello: 'world' } });
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it('should read all private keys with newest API', function (done) {
		request(shuttle)
			.get('/v3/gamer/vfs/private')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				res.body.should.eql({ result: { test: { hi: "all" }, test2: { hello: 'world' } } });
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it('should delete the test key', function (done) {
		request(shuttle)
			.delete('/v1/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }
				return request(shuttle)
					.get('/v1/gamer/vfs/private')
					.set(dataset.validAppCredentials)
					.auth(dataset.gamer_id, dataset.gamer_token)
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
			.get('/v1/gamer/vfs/private/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(404)
			.end(function (err, res) {
				res.status.should.eql(404);
				return done(err);
			});
		return null;
	});

	it('should allow setting all keys at once', function (done) {
		request(shuttle)
			.put('/v1/gamer/vfs/private')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.set('Content-Type', 'application/json')
			.send({ testAll: { hi: "all" } })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ "done": 1 });
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/gamer/vfs/private/testAll')
					.set(dataset.validAppCredentials)
					.auth(dataset.gamer_id, dataset.gamer_token)
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

	it('should delete all game-private keys', function (done) {
		request(shuttle)
			.delete('/v1/gamer/vfs/private')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/gamer/vfs/private')
					.set(dataset.validAppCredentials)
					.auth(dataset.gamer_id, dataset.gamer_token)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({});
						return done(err);
					});
			});
		return null;
	});

	it("should write in specific domain com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3", function (done) {
		request(shuttle)
			.put('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.set('Content-Type', 'application/json')
			.send({ hi: "all" })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql({ done: 1, customData: 'DONE!' });
				res.status.should.eql(200);
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it('should read all domain keys', function (done) {
		request(shuttle)
			.get('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				res.body.should.have.property('test');
				res.body.test.should.eql({
					hi: "all"
				});
				if (err != null) { return done(err); }
				return done(err);
			});
		return null;
	});

	it('should return the domains on login', done => {
		request(shuttle)
			.post('/v1/login')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({ network: 'anonymous', credentials: {id: dataset.gamer_id, secret: dataset.gamer_token }})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.domains.length.should.eql(2); // breaks with options.cleanLogin of course
				return done();
			});
		return null;
	});


	it('should delete all domain keys', function (done) {
		request(shuttle)
			.delete('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
					.get('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
					.set(dataset.validAppCredentials)
					.auth(dataset.gamer_id, dataset.gamer_token)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.should.eql({});
						return done(err);
					});
			});
		return null;
	});

	it("should not access in an unknown domain", function (done) {
		request(shuttle)
			.put('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.whaterver/test')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
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

	return getURL = null;
});

describe.skip("binary gamer vfs", function () {

	it('should create binary keys and return presigned url', function (done) {
		request(shuttle)
			.put('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.set('Content-Type', 'application/json')
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.have.property('putURL');
				res.body.should.have.property('getURL');
				res.body.should.have.property('done');
				res.body.done.should.eql(1);

				const {
					getURL
				} = res.body;
				return done(err);
			});
		return null;
	});

	it("should have stored the url for S3 access", function (done) {
		request(shuttle)
			.get('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.eql(getURL);
				return done(err);
			});
		return null;
	});

	return after("should delete the S3 data", function (done) {
		request(shuttle)
			.delete('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				res.body.should.have.property('done');
				res.body.done.should.eql(1);
				return done(err);
			});
		return null;
	});
});
