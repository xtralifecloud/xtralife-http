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

const Q = require('bluebird');
const xtralife = require('xtralife-api');

const gamer_id = null;
const gamer_token = null;

describe('KV Store', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before("should create a key with xtralife api", function () {
		const context = { runFromClient: true, game: { appid: 'com.clanofthecloud.cloudbuilder' } };
		const domain = 'com.clanofthecloud.cloudbuilder.azerty';
		return xtralife.api.kv.create(context, domain, null, 'testKey', 'hi', { r: '*', w: '*', a: '*' });
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

	it("should read the key", function (done) {
		request(shuttle)
			.get('/v1/gamer/kv/private/testKey')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.key.should.eql('testKey');
				res.body.value.should.eql('hi');
				return done();
			});
		return null;
	});

	it("should write the key", function (done) {
		request(shuttle)
			.post('/v1/gamer/kv/private/testKey')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({
				value: "hello world!"
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.ok.should.eql(1);
				res.body.nModified.should.eql(1);
				return done();
			});
		return null;
	});

	it("should read the modified key", function (done) {
		request(shuttle)
			.get('/v1/gamer/kv/private/testKey')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.key.should.eql('testKey');
				res.body.value.should.eql("hello world!");
				return done();
			});
		return null;
	});

	return after("delete key", function (done) {
		request(shuttle)
			.delete("/v1/gamer/kv/private/testKey")
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.should.eql({ ok: 1, n: 1 });
				return done();
			});
		return null;
	});
});
