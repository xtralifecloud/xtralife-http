/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');
let async = require('async');
const util = require('util');
const {
	ObjectId
} = require('mongodb');
//agent = require 'superagent'

require('./00-config.js');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');

const {
	gamer_id
} = dataset; 		//"541189411ea82ffa76b7b72a"
const {
	gamer_token
} = dataset; 	//"c562a081f4a6bb24df29684635c354f1f86a0b76"

let anonym_id = null;
let anonym_token = null;

// Testing Gamer routes

describe('UnitTest', function () {

	before('should wait for initialisation', done => shuttlePromise.then(function (_shuttle) {
		shuttle = _shuttle;
		return done();
	}).catch(done)
		.done());

	after('should close', done => {
		setTimeout(() => {
			return process.exit(0);
		}
			, 1000);
		done();
		return null;
	});

	describe('ping', () => it("should succes ping call", function (done) {
		request(shuttle)
			.get('/v1/ping')
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				//console.log res.body
				res.body.should.have.property('utc');
				res.body.should.have.property('tag');
				res.body.tag.should.eql('custom test tag');
				return done(err);
			});
		return null;
	}));

	describe.skip('create-delete users', function () {

		it("should populate with temporary user", done => request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				anonym_id = res.body.gamer_id;
				anonym_token = res.body.gamer_secret;
				//console.log "------- user_id is #{anonym_id}"
				//console.log "create a match"
				return request(shuttle)
					.post('/v1/gamer/matches?domain=private')
					.set(dataset.validAppCredentials)
					.auth(anonym_id, anonym_token)
					.type('json')
					.send({
						description: "Sample match for testing",
						maxPlayers: 3,
						customProperties: { type: "coop", other: "property" },
						shoe: [
							{ prop1: { attr: 'value1' } },
							{ prop2: 'value2' },
							{ prop3: 'value3' },
							{ prop4: 'value4' }
						]
					})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						//console.log "add a transaction"
						return request(shuttle)
							.post('/v1/gamer/tx/private')
							.set(dataset.validAppCredentials)
							.auth(anonym_id, anonym_token)
							.type('json')
							.send({
								transaction: {
									Gold: 100
								},
								description: 'Unit Testing transactions'
							}).expect('content-type', /json/)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								//console.log "score in test"
								return request(shuttle)
									.post('/v2.6/gamer/scores/private/test')
									.set(dataset.validAppCredentials)
									.auth(anonym_id, anonym_token)
									.send({ score: 450, info: "this is a description" })
									.expect('content-type', /json/)
									.expect(200)
									.end(function (err, res) {
										if (err != null) { return done(err); }
										//console.log "add a friend"
										return request(shuttle)
											.post('/v2.6/gamer/friends/private/' + dataset.gamer_id + '?status=add')
											.set(dataset.validAppCredentials)
											.auth(anonym_id, anonym_token)
											.send({ "en": "relation changed" })
											.expect('content-type', /json/)
											.expect(200)
											.end(function (err, res) {
												if (err != null) { return done(err); }
												//console.log "write in S3"
												return request(shuttle)
													.put('/v1/gamer/vfs/private/binTest?binary')
													.set(dataset.validAppCredentials)
													.auth(anonym_id, anonym_token)
													.set('Content-Type', 'application/json')
													.expect('content-type', /json/)
													.expect(200)
													.end((err, res) => /*
                                                                string = "some data to write to s3"
                                                                agent
                                                                .put res.body.putURL
                                                                .set('Content-Type', 'application/octet-stream')
                                                                .set('Content-Length', Buffer.byteLength(string))
                                                                .send string
                                                                .end (err, res)->
                                                                    console.log res.error
                                                                */
														done(err));
											});
									});
							});
					});
			}));

		return it("should delete temporary users", function (done) {
			const xtralife = require('xtralife-api');
			async = require('async');
			this.timeout(4000);
			return xtralife.api.onDeleteUser(ObjectId(anonym_id), done, 'com.clanofthecloud.cloudbuilder');
		});
	});



	return describe.skip('all', function () {
		it.skip('should register email', done => request(shuttle)
			.post('/v1/login')
			.set(dataset.validAppCredentials)
			.send({ network: 'email', id: 'rolandvl@mac.com', secret: 'pass' })
			.expect('content-type', /json/)
			.expect(200)
			.end((err, res) => //console.log res.body
				done(err)));

		it("should login", done => request(shuttle)
			.post('/v1/login')
			.set(dataset.validAppCredentials)
			.send({ network: 'anonymous', id: gamer_id, secret: gamer_token })
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				//console.log util.inspect(res.body, { depth: null, colors: true })
				return done();
			}));

		it('should get outline', done => request(shuttle)
			.get('/v1/gamer/outline')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end((err, res) => //console.log util.inspect(res.body, { depth: null, colors: true })
				done(err)));

		it.skip('should get outline flatten with domains', done => request(shuttle)
			.get('/v1/gamer/outline?flat&domains=com.clanofthecloud.cloudbuilder.test,com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end((err, res) => //console.log util.inspect(res.body, { depth: null, colors: true })
				done(err)));

		return it.skip("should send", function (done) {
			this.timeout(30000);
			request(shuttle)
				.post('/v1/gamer/event/private/' + dataset.friend_id)
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.send({ type: "user", from: dataset.gamer_id, event: 'hello world', osn: { en: "Hello you!", fr: "Salut !" } })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					const messageId = res.body.id;
					if (err != null) { return done(err); }
				});

			return setTimeout(() => done()
				, 20000);
		});
	});
});
