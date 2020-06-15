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
const {
	ObjectID
} = require('mongodb');

const Q = require('bluebird');

// These will be filled when the test user is created
let gamer_id = null;
let gamer_token = null;

describe('Achievements', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	it("should create an anonymous user just for achievements", function (done) {

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

	it("should reset key/value for a user with -auto", function (done) {

		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					score: "-auto"
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				//console.log res.body
				res.body.balance.score.should.eql(0);
				res.body.achievements.should.eql({});
				return done();
			});
		return null;
	});

	it("should increment key/value for a user", function (done) {

		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					score: 100
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.balance.score.should.eql(100);
				res.body.achievements.should.eql({});
				return done();
			});
		return null;
	});

	// This time do not check for achievements (old call)
	it("should decrement key/value for a user", function (done) {

		request(shuttle)
			.post('/v1/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					score: -40
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.score.should.eql(60);
				should(res.body.achievements).be.undefined;
				return done();
			});
		return null;
	});

	it("should add an achievement", function (done) {
		const xtralife = require('xtralife-api');

		const definitions = {
			testOnce: {
				type: 'limit',
				config: {
					maxValue: 1000,
					unit: 'score'
				},
				gameData: {
					hidden: true
				}
			},
			testMultiple: {
				type: 'limit',
				config: {
					maxValue: 10,
					maxTriggerCount: 2,
					unit: 'kills'
				}
			},
			testWithTx: {
				type: 'limit',
				config: {
					maxValue: 100,
					maxTriggerCount: -1,
					unit: 'gold',
					rewardTx: {
						gold: -40
					}
				}
			},
			recursionTestA: {
				type: 'limit',
				config: {
					maxValue: 10,
					maxTriggerCount: -1,
					unit: 'a',
					rewardTx: {
						a: "-auto",
						b: 10
					}
				}
			},
			recursionTestB: {
				type: 'limit',
				config: {
					maxValue: 10,
					maxTriggerCount: -1,
					unit: 'b',
					rewardTx: {
						b: "-auto",
						a: 10
					}
				}
			}
		};

		xtralife.api.achievement.saveAchievementsDefinitions('com.clanofthecloud.cloudbuilder.azerty', definitions)
			.then(result => done())
			.catch(done)
			.done();
		return null;
	});

	it("should list achievements for the user even before having set gamer data", function (done) {

		request(shuttle)
			.get('/v1/gamer/achievements/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.achievements.testOnce.progress.should.eql(0.06);
				return done();
			});
		return null;
	});

	it("should add gamer data to achievement", function (done) {
		request(shuttle)
			.post('/v1/gamer/achievements/private/testOnce/gamerdata')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				test: "data"
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.achievement.gamerData.test.should.eql('data');
				return done();
			});
		return null;
	});

	it("should modify gamer data of achievement", function (done) {
		request(shuttle)
			.post('/v1/gamer/achievements/private/testOnce/gamerdata')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				aKey: "aData",
				otherKey: "newData"
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.achievement.gamerData.test);
				res.body.achievement.gamerData.aKey.should.eql('aData');
				res.body.achievement.gamerData.otherKey.should.eql('newData');
				return done();
			});
		return null;
	});

	it("should show gamer data in achievements", function (done) {

		request(shuttle)
			.get('/v1/gamer/achievements/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.achievements.testOnce.gamerData.aKey.should.eql('aData');
				return done();
			});
		return null;
	});

	it("should retrieve gamer data", function (done) {

		request(shuttle)
			.get('/v1/gamer/achievements/private/testOnce/gamerdata')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.gamerData.otherKey.should.eql('newData');
				return done();
			});
		return null;
	});

	it("should list empty achievements for the user", function (done) {

		request(shuttle)
			.get('/v1/gamer/achievements/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.achievements.testOnce.progress.should.eql(0.06);
				return done();
			});
		return null;
	});

	it("should complete achievement for a user", function (done) {

		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					score: 940
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.balance.score.should.eql(1000);
				// We should have one entry: the achievement just triggered
				// Verify that it is enriched as well ;)
				res.body.achievements.testOnce.progress.should.eql(1);
				return done();
			});
		return null;
	});

	it("should not complete achievement twice", function (done) {

		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					score: "-auto"
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end((err, res) => request(shuttle)
				.post('/v2.2/gamer/tx/private')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.type('json')
				.send({
					transaction: {
						score: 1050
					},
					description: 'Unit Testing achievements'
				}).expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.balance.score.should.eql(1050);
					res.body.achievements.should.eql({});
					return done();
				}));
		return null;
	});

	it("should be able to complete achievement twice for a user", function (done) {

		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					kills: 10
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.achievements.testMultiple);

				// Now let's reset it
				return request(shuttle)
					.post('/v2.2/gamer/tx/private')
					.set(dataset.validAppCredentials)
					.auth(gamer_id, gamer_token)
					.type('json')
					.send({
						transaction: {
							kills: "-auto"
						},
						description: 'Unit Testing achievements'
					}).expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.achievements.should.eql({});

						// Now trigger it again
						return request(shuttle)
							.post('/v2.2/gamer/tx/private')
							.set(dataset.validAppCredentials)
							.auth(gamer_id, gamer_token)
							.type('json')
							.send({
								transaction: {
									kills: 10
								},
								description: 'Unit Testing achievements'
							}).expect('content-type', /json/)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								should.exist(res.body.achievements.testMultiple);
								return done();
							});
					});
			});
		return null;
	});

	it("should not be able to complete achievement more times than allowed", function (done) {

		// Reset it from previous test
		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					kills: "-auto"
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.achievements.should.eql({});

				// Now trigger it again
				return request(shuttle)
					.post('/v2.2/gamer/tx/private')
					.set(dataset.validAppCredentials)
					.auth(gamer_id, gamer_token)
					.type('json')
					.send({
						transaction: {
							kills: 10
						},
						description: 'Unit Testing achievements'
					}).expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.achievements.should.eql({});
						return done();
					});
			});
		return null;
	});

	it("should run an associated transaction", function (done) {

		// Reset it from previous test
		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					gold: 100
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// Achievement should have been triggered
				should.exist(res.body.achievements.testWithTx);
				// And it should have affected the actual gold, which should go from the directed 100 to 60
				res.body.balance.gold.should.eql(60);
				return done();
			});
		return null;
	});

	it("should prevent recursion in reward transactions", function (done) {

		// Reset it from previous test
		request(shuttle)
			.post('/v2.2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					a: 10
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// The first achievement shall be triggered, but not the second one (wanted limitation)
				should.exist(res.body.achievements.recursionTestA);
				should.not.exist(res.body.achievements.recursionTestB);
				// Only the code in recursionTestA's rewardTx should have been executed
				res.body.balance.a.should.eql(0);
				res.body.balance.b.should.eql(10);
				return done();
			});
		return null;
	});

	it("should refuse an invalid API version", function (done) {

		// Reset it from previous test
		request(shuttle)
			.post('/v2/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					a: 10
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should mark an old API as obsolete", function (done) {

		// Reset it from previous test
		request(shuttle)
			.post('/v1/gamer/tx/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.type('json')
			.send({
				transaction: {
					a: 10
				},
				description: 'Unit Testing achievements'
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.get('X-Obsolete').should.eql('true');
				return done();
			});
		return null;
	});

	it.skip("should reset achievements (works in DEV mode only)", function (done) {
		// Reset it from previous test
		request(shuttle)
			.post('/v1/gamer/achievements/private/reset')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end((err, res) => done(err));
		return null;
	});

	return it("should delete the temporary user", function (done) {
		const xtralife = require('xtralife-api');
		xtralife.api.onDeleteUser(ObjectID(gamer_id), done, 'com.clanofthecloud.cloudbuilder');
		return null;
	});
});
