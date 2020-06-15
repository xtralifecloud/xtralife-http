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

// Testing Gamer routes

// These will be filled when the test user is created
let gamer_id = null;
let gamer_token = null;

const xtralife = require('xtralife-api');

describe('Godfather', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	let godfatherCode = undefined;

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

	it("should create an anonymous user just for godchilden", function (done) {

		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				({
					gamer_id
				} = res.body);
				gamer_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	it('create godfather code should sucess', function (done) {

		request(shuttle)
			.put('/v1/gamer/godfather')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.should.have.property('godfathercode');
				godfatherCode = res.body.godfathercode;

				return done(err);
			});
		return null;
	});

	it('should find godfather by code', () => {
		const game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"];
		const domain = xtralife.api.game.getPrivateDomain(game.appid);
		return xtralife.api.social.findGodfatherFromCode(null, domain, godfatherCode)
			.then(godfather => {
				return godfather.toString().should.eql(dataset.gamer_id);
			});
	});

	it('set godfather code should sucess', function (done) {

		request(shuttle)
			.post('/v1/gamer/godfather')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.send({ "godfather": godfatherCode })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.should.have.property('done');
				res.body.done.should.eql(1);
				//console.log res.body

				return request(shuttle)
					.get('/v1/gamer/godfather')
					.set(dataset.validAppCredentials)
					.auth(gamer_id, gamer_token)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						res.body.godfather.gamer_id.should.eql(dataset.gamer_id);
						return done(err);
					});
			});
		return null;
	});


	it("should create another anonymous user just for godchilden", function (done) {

		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				({
					gamer_id
				} = res.body);
				gamer_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	it('set godfather code with reward should success', function (done) {

		request(shuttle)
			.post('/v1/gamer/godfather')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.send({ "godfather": godfatherCode, "reward": { transaction: { "Gold": 10, "parrainage": 1 }, description: "reward transaction" } })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				//console.log res.body
				res.body.should.have.property('done');
				return done(err);
			});
		return null;
	});

	return it('get godchildren should sucess', function (done) {

		request(shuttle)
			.get('/v1/gamer/godchildren')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				//console.log res.body
				res.body.should.have.property('godchildren');
				return done(err);
			});
		return null;
	});
});

