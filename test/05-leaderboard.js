/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');
let async = require('async');
const util = require("util");
const rs = require("randomstring");
const {
	ObjectID
} = require('mongodb');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');

// Testing Gamer routes
let gamer_id = null;
let gamer_token = null;
let friend_id = null;
let friend_token = null;

const gamers_id = [];
const gamers_token = [];

const print = function (obj) { };
//console.log util.inspect(obj, { showHidden: false, depth: 8, colors: true })


describe('Leaderboards', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before('should setup users', function (done) {
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

				return request(shuttle)
					.put('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/key1')
					.set(dataset.validAppCredentials)
					.auth(gamer_id, gamer_token)
					.send({ value: "value of gamer key1" })
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }

						return request(shuttle)
							.post('/v1/login/anonymous')
							.set(dataset.validAppCredentials)
							.type('json')
							.send({})
							.expect('content-type', /json/)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								friend_id = res.body.gamer_id;
								friend_token = res.body.gamer_secret;

								return request(shuttle)
									.put('/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/key1')
									.set(dataset.validAppCredentials)
									.auth(friend_id, friend_token)
									.send({ value: "value of friend key1" })
									.expect('content-type', /json/)
									.expect(200)
									.end((err, res) => done(err));
							});
					});
			});
		return null;
	});

	describe('Success', function () {


		it('gamer should be able to score in <easy>', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/easyboard')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 500, info: "this is a description" })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("done");
					if (res.body.done === 1) {
						res.body.should.have.property("rank");
					}
					return done(err);
				});
			return null;
		});

		it('should allow bestscores in batch', function (done) {
			request(shuttle)
				.post('/v1/gamer/batch/private/bestscoresInBatch')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.type('json')
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property('easyboard');
					res.body.easyboard.score.should.eql(500);
					return done();
				});
			return null;
		});

		it('should allow highscore in batch', function (done) {
			request(shuttle)
				.post('/v1/gamer/batch/private/highscoreInBatch')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.type('json')
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property('easyboard');
					return done();
				});
			return null;
		});

		it('should allow centered score in batch', function (done) {
			request(shuttle)
				.post('/v1/gamer/batch/private/centeredScoreInBatch')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.type('json')
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property('easyboard');
					return done();
				});
			return null;
		});


		it('gamer should not be able to score a lower score in <easy>', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/easyboard')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 90, info: "this is a description" })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					res.body.should.have.property("done");
					res.body.done.should.eql(0);
					return done(err);
				});
			return null;
		});

		it('gamer should be able to score in <medium>', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/mediumboard')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 50, info: "this is a description" })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("done");
					if (res.body.done === 1) {
						res.body.should.have.property("rank");
					}
					return done(err);
				});
			return null;
		});

		it('gamer should retreive his bestscores', function (done) {

			request(shuttle)
				.get('/v1/gamer/bestscores')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.have.property("easyboard");
					res.body.easyboard.should.have.property("score");
					res.body.should.have.property("mediumboard");
					res.body.mediumboard.should.have.property("score");
					return done(err);
				});
			return null;
		});

		it('friend should be able to score', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/easyboard')
				.set(dataset.validAppCredentials)
				.auth(friend_id, friend_token)
				.send({ score: 300, info: "this is a description" })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					//console.log res.body
					res.body.should.have.property("done");
					if (res.body.done === 1) {
						res.body.should.have.property("rank");
					}
					return done(err);
				});
			return null;
		});


		it('gamer should retreive a Leaderboard hightolow', function (done) {
			//console.log {gamer_id}
			//console.log {friend_id}
			request(shuttle)
				.get('/v1/gamer/scores/easyboard')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					//console.log res.body.easyboard.scores[0]
					if (err != null) { return done(err); }
					//console.log res.body
					//console.log res.body.easyboard.scores
					print(res.body);
					res.body.should.have.property("easyboard");
					res.body.easyboard.should.have.property("scores");
					//res.body.easyboard.scores.should.containDeep([{gamer_id:gamer_id }])
					//res.body.easyboard.scores.should.containDeep([{gamer_id:friend_id }])
					res.body.easyboard.scores[0].should.have.property("score");
					res.body.easyboard.scores[0].score.should.have.property("score");
					res.body.easyboard.scores[0].score.score.should.not.be.below(res.body.easyboard.scores[1].score.score);
					return done(err);
				});
			return null;
		});

		return it.skip('gamer should retreive a Leaderboard', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easyboard')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					//console.log res.body
					//console.log res.body.easyboard.scores
					res.body.should.have.property("easyboard");
					res.body.easyboard.should.have.property("scores");
					//res.body.easyboard.scores.should.containDeep([{gamer_id:gamer_id }])
					//res.body.easyboard.scores.should.containDeep([{gamer_id:friend_id }])
					res.body.easyboard.scores[0].should.have.property("score");
					res.body.easyboard.scores[0].score.should.have.property("score");
					return done(err);
				});
			return null;
		});
	});

	describe('Failures', function () {

		it('should reject if score is not a Number', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/easy')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: "test" })
				.expect('content-type', /json/)
				.expect(404)
				.end(function (err, res) {
					res.body.name.should.eql('ScoreNotFound');
					return done(err);
				});
			return null;
		});

		it('should reject score if order is not in hightolow, lowtohigh', function (done) {

			request(shuttle)
				.post('/v1/gamer/scores/easy?order=whatever')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('InvalidScoreOrder');
					return done(err);
				});
			return null;
		});

		it('should reject hisghscores if type is not in hisghscore, friendscore', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easy?type=whatever')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('InvalidScoreType');
					return done(err);
				});
			return null;
		});

		it('should reject hisghscores if page is not an integer', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easy?page=whatever')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadPageScore');
					return done(err);
				});
			return null;
		});

		it('should reject hisghscores if page<= 0', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easy?page=0')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadPageScore');
					return done(err);
				});
			return null;
		});

		it('should reject hisghscores if count is not an integer', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easy?count=whatever')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadCountScore');
					return done(err);
				});
			return null;
		});

		it('should reject hisghscores if count<= 0', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/easy?count=0')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadCountScore');
					return done(err);
				});
			return null;
		});

		return it('should reject centered score if gamer never score', function (done) {

			request(shuttle)
				.get('/v1/gamer/scores/noboard?page=me')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.send({ score: 10 })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					//console.log res.body
					res.body.name.should.eql('MissingScore');
					return done(err);
				});
			return null;
		});
	});



	const board = rs.generate(10);

	return describe.skip("Many scores", function () {

		it('populate', function (done) {
			this.timeout(4000);

			return async.forEachSeries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
				(i, cb) => request(shuttle)
					.post('/v1/login/anonymous')
					.set(dataset.validAppCredentials)
					.type('json')
					.send({})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						gamers_id[i] = res.body.gamer_id;
						gamers_token[i] = res.body.gamer_secret;
						const score = (i <= 10) || (i > 15) ? i * 10 : 110;
						return request(shuttle)
							.post(`/v1/gamer/scores/${board}?order=lowtohigh`)
							.set(dataset.validAppCredentials)
							.auth(gamers_id[i], gamers_token[i])
							.send({ score, info: `this is a description for gamer ${i}` })
							.expect('content-type', /json/)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								//print res.body
								res.body.should.have.property("done");
								if (res.body.done === 1) {
									res.body.should.have.property("rank");
									res.body.rank.should.equal(i);
								}

								if (i === 1) { return cb(err); }

								return request(shuttle)
									.post(`/v1/gamer/friends/${gamers_id[i]}?status=add`)
									.set(dataset.validAppCredentials)
									.auth(gamers_id[1], gamers_token[1])
									.expect('content-type', /json/)
									.expect(200)
									.end(function (err, res) {
										if (err != null) { return done(err); }
										res.body.should.have.property("done");
										res.body.done.should.equal(1);
										return cb(err);
									});
							});
					})

				, err => //print gamers_id
					request(shuttle)
						.get("/v1/gamer/friends")
						.set(dataset.validAppCredentials)
						.auth(gamers_id[1], gamers_token[1])
						.expect('content-type', /json/)
						.expect(200)
						.end(function (err, res) {
							if (err != null) { return done(err); }
							print(res.body);
							return done(err);
						}));
		});

		it('should retreive easy', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?count=5`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[1], gamers_token[1])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body[board].scores.length.should.be.eql(5);
					res.body[board].rankOfFirst.should.be.eql(1);
					res.body[board].page.should.be.eql(1);
					res.body[board].maxpage.should.be.eql(4);
					res.body[board].scores[0].gamer_id.should.equal(gamers_id[1]);
					res.body[board].scores[0].score.score.should.equal(10);
					res.body[board].scores[1].gamer_id.should.equal(gamers_id[2]);
					res.body[board].scores[1].score.score.should.equal(20);
					res.body[board].scores[2].gamer_id.should.equal(gamers_id[3]);
					res.body[board].scores[2].score.score.should.equal(30);
					res.body[board].scores[3].gamer_id.should.equal(gamers_id[4]);
					res.body[board].scores[3].score.score.should.equal(40);
					res.body[board].scores[4].gamer_id.should.equal(gamers_id[5]);
					res.body[board].scores[4].score.score.should.equal(50);
					return done(err);
				});
			return null;
		});

		it('should retreive easy page 2', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?page=2&count=5`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[1], gamers_token[1])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body[board].scores.length.should.be.eql(5);
					res.body[board].rankOfFirst.should.be.eql(6);
					res.body[board].page.should.be.eql(2);
					res.body[board].maxpage.should.be.eql(4);
					res.body[board].scores[0].gamer_id.should.equal(gamers_id[6]);
					res.body[board].scores[0].score.score.should.equal(60);
					res.body[board].scores[1].gamer_id.should.equal(gamers_id[7]);
					res.body[board].scores[1].score.score.should.equal(70);
					res.body[board].scores[2].gamer_id.should.equal(gamers_id[8]);
					res.body[board].scores[2].score.score.should.equal(80);
					res.body[board].scores[3].gamer_id.should.equal(gamers_id[9]);
					res.body[board].scores[3].score.score.should.equal(90);
					res.body[board].scores[4].gamer_id.should.equal(gamers_id[10]);
					res.body[board].scores[4].score.score.should.equal(100);
					return done(err);
				});
			return null;
		});

		it('should retreive centered score', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?page=me&count=5`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[7], gamers_token[7])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body[board].should.have.property("scores");
					res.body[board].scores.should.containDeep([{ gamer_id: gamers_id[7] }]);
					return done(err);
				});
			return null;
		});

		it('should retreive equivalent score', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?page=me&count=5`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[13], gamers_token[13])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					print(res.body);
					res.body[board].should.have.property("scores");
					res.body[board].scores.length.should.be.eql(5);
					res.body[board].rankOfFirst.should.be.eql(11);
					res.body[board].page.should.be.eql(3);
					res.body[board].maxpage.should.be.eql(4);
					res.body[board].scores[0].gamer_id.should.equal(gamers_id[11]);
					res.body[board].scores[0].score.score.should.equal(110);
					res.body[board].scores[1].gamer_id.should.equal(gamers_id[12]);
					res.body[board].scores[1].score.score.should.equal(110);
					res.body[board].scores[2].gamer_id.should.equal(gamers_id[13]);
					res.body[board].scores[2].score.score.should.equal(110);
					res.body[board].scores[3].gamer_id.should.equal(gamers_id[14]);
					res.body[board].scores[3].score.score.should.equal(110);
					res.body[board].scores[4].gamer_id.should.equal(gamers_id[15]);
					res.body[board].scores[4].score.score.should.equal(110);
					return done(err);
				});
			return null;
		});

		it('should retreive last score', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?page=me&count=3`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[20], gamers_token[20])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					print(res.body);
					res.body[board].should.have.property("scores");
					res.body[board].scores.length.should.be.eql(2);
					res.body[board].rankOfFirst.should.be.eql(19);
					res.body[board].page.should.be.eql(7);
					res.body[board].maxpage.should.be.eql(7);
					res.body[board].scores[0].gamer_id.should.equal(gamers_id[19]);
					res.body[board].scores[0].score.score.should.equal(190);
					res.body[board].scores[1].gamer_id.should.equal(gamers_id[20]);
					res.body[board].scores[1].score.score.should.equal(200);
					return done(err);
				});
			return null;
		});

		it('should retreive best scores', function (done) {

			request(shuttle)
				.get("/v1/gamer/bestscores")
				.set(dataset.validAppCredentials)
				.auth(gamers_id[4], gamers_token[4])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body[board].score.should.equal(40);
					res.body[board].order.should.equal("lowtohigh");
					res.body[board].rank.should.equal(4);
					print(res.body);
					return done(err);
				});
			return null;
		});

		it('should retreive friends scores', function (done) {

			request(shuttle)
				.get(`/v1/gamer/scores/${board}?type=friendscore`)
				.set(dataset.validAppCredentials)
				.auth(gamers_id[1], gamers_token[1])
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					print(res.body);
					res.body[board].length.should.equal(19);
					res.body[board][0].rank.should.equal(2);
					res.body[board][0].gamer_id.should.equal(gamers_id[2]);
					res.body[board][0].score.score.should.equal(20);
					return done(err);
				});
			return null;
		});


		return it("should delete temporary users", function (done) {
			const xtralife = require('xtralife-api');
			async = require('async');
			this.timeout(4000);
			return async.forEachSeries(gamers_id,
				(userid, cb) => xtralife.api.onDeleteUser(ObjectID(userid), cb, 'com.clanofthecloud.cloudbuilder')
				, err => {
					return done(err);
				});
		});
	});
});


