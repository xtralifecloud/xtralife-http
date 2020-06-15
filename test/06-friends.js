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

describe('Friends', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

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

	before("should create a friend", function (done) {
		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				dataset.friend_id = res.body.gamer_id;
				dataset.friend_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	describe('Failures', function () {

		it('gamer should reject an unknown status', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id + '?status=whatever')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('StatusNotSupported');
					return done(err);
				});
			return null;
		});

		it('gamer should reject an bad gamer_id', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/whatever?status=add')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadGamerID');
					return done(err);
				});
			return null;
		});

		it('gamer should reject an unknown gamer_id', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/5400b2ed1221cd000045d64e?status=add')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(404)
				.end(function (err, res) {
					res.body.name.should.eql('GamerIdNotFound');
					return done(err);
				});
			return null;
		});

		return it('gamer should reject a missing status', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id)
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(404)
				.end(function (err, res) {
					res.body.name.should.eql('StatusNotFound');
					return done(err);
				});
			return null;
		});
	});


	return describe('Success', function () {

		it('gamer should add a new friend', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id + '?status=add')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.send({ "en": "relation changed" })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.eql({ done: 1 });
					return done(err);
				});
			return null;
		});

		it('should list gamer friends and gamer friend friends', function (done) {

			request(shuttle)
				.get('/v1/gamer/friends')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("friends");
					res.body.friends.should.be.an.Array;
					res.body.friends.should.containDeep([{ gamer_id: dataset.friend_id }]);
					return request(shuttle)
						.get('/v1/gamer/friends')
						.set(dataset.validAppCredentials)
						.auth(dataset.friend_id, dataset.friend_token)
						.expect('content-type', /json/)
						.expect(200)
						.end(function (err, res) {
							if (err != null) { return done(err); }
							res.body.should.have.property("friends");
							res.body.friends.should.be.an.Array;
							res.body.friends.should.containDeep([{ gamer_id: dataset.gamer_id }]);
							return done(err);
						});
				});
			return null;
		});

		it('gamer should blacklist a gamer', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id + '?status=blacklist')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.eql({ done: 1 });
					return done(err);
				});
			return null;
		});

		it('should list blacklisted users', function (done) {

			request(shuttle)
				.get('/v1/gamer/friends?status=blacklist')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("blacklisted");
					res.body.blacklisted.should.be.an.Array;
					res.body.blacklisted.should.containDeep([{ gamer_id: dataset.friend_id }]);
					return done(err);
				});
			return null;
		});

		it('list friends should not contains friend', function (done) {

			request(shuttle)
				.get('/v1/gamer/friends')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("friends");
					res.body.friends.should.be.an.Array;
					res.body.friends.should.not.containDeep([{ gamer_id: dataset.friend_id }]);
					return done(err);
				});
			return null;
		});

		it('should not accept to add a blacklisted friend', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id + '?status=add')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.eql({ done: 0 });
					return done(err);
				});
			return null;
		});


		it('gamer should forget a relation', function (done) {

			request(shuttle)
				.post('/v1/gamer/friends/' + dataset.friend_id + '?status=forget')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.eql({ done: 1 });
					return done(err);
				});
			return null;
		});

		it('list friends shouldnt contains friend', function (done) {

			request(shuttle)
				.get('/v1/gamer/friends')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("friends");
					res.body.friends.should.be.an.Array;
					res.body.friends.should.not.containDeep([{ gamer_id: dataset.friend_id }]);
					return done(err);
				});
			return null;
		});

		return it('blacklisted shouldnt contains friend', function (done) {

			request(shuttle)
				.get('/v1/gamer/friends?status=blacklist')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("blacklisted");
					res.body.blacklisted.should.be.an.Array;
					res.body.blacklisted.should.not.containDeep([{ gamer_id: dataset.friend_id }]);
					return done(err);
				});
			return null;
		});
	});
});
