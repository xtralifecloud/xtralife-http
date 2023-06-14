/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let gamer_token_p1, gamer_token_p2;
const request = require('supertest');
const should = require('should');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');
const {
	ObjectId
} = require('mongodb');

const Q = require('bluebird');

// Eats pending events for a gamer on Broker
var _eatPendingEvents = (gamer_id, gamer_token, whenDone) => request(shuttle)
	.get('/v1/gamer/event/private?ack=auto&timeout=50')
	.set(dataset.validAppCredentials)
	.auth(gamer_id, gamer_token)
	.expect(200)
	.end(function (err, res) {
		if (err != null) { return whenDone(); }
		// No err, we may have more left
		return _eatPendingEvents(gamer_id, gamer_token, whenDone);
	});

// Selects a match in the body of the response
const _selectMatch = (res, expected_match_id) => (Array.from(res.body.matches).filter((match) => match._id === expected_match_id))[0];

// Filled during tests
let sample_match_id = null;
let sample_match_id_2 = null;
let gamer_id_p1 = (gamer_token_p1 = null);
let gamer_id_p2 = (gamer_token_p2 = null);
let lastEventId_p1 = null;
let lastEventId_p2 = null;

describe('Matches', function () { // there's an interraction somewhere in our tests, can run .only only...

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	it("should create users just for matches", function (done) {

		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				gamer_id_p1 = res.body.gamer_id;
				gamer_token_p1 = res.body.gamer_secret;

				return request(shuttle)
					.post('/v1/login/anonymous')
					.set(dataset.validAppCredentials)
					.type('json')
					.send({})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						gamer_id_p2 = res.body.gamer_id;
						gamer_token_p2 = res.body.gamer_secret;
						return done();
					});
			});
		return null;
	});

	it("should create a match", function (done) {

		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
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
				sample_match_id = res.body.match._id;
				res.body.match.status.should.eql("running");
				res.body.match.creator.gamer_id.should.eql(gamer_id_p1);
				res.body.match.description.should.eql("Sample match for testing");
				res.body.match.customProperties.type.should.eql("coop");
				res.body.match.events.should.eql([]);
				should.exist(res.body.match.seed);
				should.not.exist(res.body.match.shoe);

				// Then create a second match
				return request(shuttle)
					.post('/v1/gamer/matches?domain=private')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p1, gamer_token_p1)
					.type('json')
					.send({
						description: "Another sample match",
						maxPlayers: 1,
						customProperties: { type: "versus" }
					})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						sample_match_id_2 = res.body.match._id;
						return done();
					});
			});
		return null;
	});

	it("should not be able to create a match with insufficient information", function (done) {

		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should not be able to create a match with complex objects in the properties", function (done) {

		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				description: "Sample match for testing",
				maxPlayers: 3,
				customProperties: { complex: { object: "value" } }
			})
			.expect('content-type', /json/)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should contain the profile of the creator in the match list, but no players", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				const match = _selectMatch(res, sample_match_id);
				match.creator.gamer_id.should.eql(gamer_id_p1);
				should.not.exist(match.players);
				return done();
			});
		return null;
	});

	it("should list filtered matches", function (done) {

		request(shuttle)
			.get('/v1/gamer/matches/?domain=private&properties={"type": "coop"}')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				_selectMatch(res, sample_match_id).description.should.eql('Sample match for testing');
				return done();
			});
		return null;
	});

	it("should not list filtered matches that do not fit", function (done) {

		request(shuttle)
			.get('/v1/gamer/matches?domain=private&properties={"type": "coo"}')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.matches.should.eql([]);
				return done();
			});
		return null;
	});

	let first_match_id = null;
	it("should use pagination parameters", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private&full&limit=1")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// We should get only one match
				res.body.matches.length.should.eql(1);
				first_match_id = res.body.matches[0]._id;
				res.body.count.should.be.above(1);

				// Now with a skip and limit
				return request(shuttle)
					.get("/v1/gamer/matches?domain=private&full&skip=1&limit=1")
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p1, gamer_token_p1)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						// We should get one match and not the same as without skip param
						res.body.matches.length.should.eql(1);
						res.body.matches[0]._id.should.not.eql(first_match_id);
						return done();
					});
			});
		return null;
	});

	it("should fetch value about a single match", function (done) {

		request(shuttle)
			.get(`/v1/gamer/matches/${sample_match_id}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.match.description.should.eql('Sample match for testing');
				res.body.match.creator.gamer_id.should.eql(gamer_id_p1);
				res.body.match.players[0].gamer_id.should.eql(gamer_id_p1);
				return done();
			});
		return null;
	});

	it("should not be able to fetch an invalid match ID", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches/1234")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect(404)
			.end((err, res) => done(err));
		return null;
	});

	it("should not be able to fetch a non-existing match ID", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches/123456789012345678901234")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should eat all pending messages from broker", function (done) {
		_eatPendingEvents(gamer_id_p1, gamer_token_p1, () => done());
		return null;
	});

	it("should join a match", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/join`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.match.lastEventId);
				should.not.exist(res.body.match.shoe);
				lastEventId_p2 = res.body.match.lastEventId;
				return done();
			});
		return null;
	});

	it("should receive a notification when another player joins", function (done) {
		// P1 should receive a notification
		request(shuttle)
			.get('/v1/gamer/event/private?ack=auto')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.type.should.eql("match.join");
				res.body.event.match_id.should.eql(sample_match_id);
				res.body.event.playersJoined[0].gamer_id.should.eql(gamer_id_p2);
				lastEventId_p1 = res.body.event._id;
				return done();
			});
		return null;
	});

	it("should not be able to join a match twice", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/join`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('AlreadyJoinedMatch');
				return done();
			});
		return null;
	});

	it("should be limited to the maximum number of players", function (done) {
		// The second game already has one player (the one who created it)
		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id_2}/join`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('MaximumNumberOfPlayersReached');
				return done();
			});
		return null;
	});

	it("should refuse invalid move", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({
				globalState: {
					dummy: 1
				}
			}).expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('InvalidJSONBody');
				return done();
			});
		return null;
	});

	it("should not be able to make a move without a lastEventId", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({
				move: {
					thrown: "fifth_dice"
				}
			}).expect('content-type', /json/)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should not be able to make a move with an invalid lastEventId", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=123456789012345678901234`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({
				move: {
					thrown: "fifth_dice"
				}
			}).expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('InvalidLastEventId');
				return done();
			});
		return null;
	});

	it("should not receive an own move from broker", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({
				move: {
					thrown: "fifth_dice"
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.match.lastEventId);
				lastEventId_p2 = res.body.match.lastEventId;
				// Only summarized information should be returned
				should.not.exist(res.body.match.globalState);

				return request(shuttle)
					.get('/v1/gamer/event/private?timeout=500&ack=auto')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect(204)
					.end(function (err, res) {
						if (err != null) { return done(err); }

						// We still need to acknowledge the message for the first user
						return request(shuttle)
							.get('/v1/gamer/event/private?ack=auto')
							.set(dataset.validAppCredentials)
							.auth(gamer_id_p1, gamer_token_p1)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								should.exist(res.body.event._id);
								res.body.type.should.eql('match.move');
								lastEventId_p1 = res.body.event._id;
								return done();
							});
					});
			});
		return null;
	});

	it("should receive a move from broker if another player posts a move", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				move: {
					thrown: "nothing"
				},
				globalState: {
					full: 1
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.match.lastEventId);
				lastEventId_p1 = res.body.match.lastEventId;

				return request(shuttle)
					.get('/v1/gamer/event/private?ack=auto')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.type.should.eql("match.move");
						res.body.event.player_id.should.eql(gamer_id_p1);
						res.body.event.move.thrown.should.eql("nothing");
						should.not.exist(res.body.event.globalState);
						should.exist(res.body.event._id);
						lastEventId_p2 = res.body.event.move.move_id;
						return done();
					});
			});
		return null;
	});

	it("should post a move in the match", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				move: {
					thrown: "dice"
				},
				globalState: {
					score: 100
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(res.body.match.lastEventId);
				lastEventId_p1 = res.body.match.lastEventId;
				return done();
			});
		return null;
	});

	it("should post a second move in the match", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				move: {
					thrown: "another_dice"
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				lastEventId_p1 = res.body.match.lastEventId;
				return done();
			});
		return null;
	});

	it("should clear the move list when posting a global state", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/move?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				move: {
					thrown: "third_dice"
				},
				globalState: {
					score: 200
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				lastEventId_p1 = res.body.match.lastEventId;
				return done();
			});
		return null;
	});

	it("should draw an element from the shoe", function (done) {

		_eatPendingEvents(gamer_id_p2, gamer_token_p2, () => request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/shoe/draw?count=2&lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				lastEventId_p1 = res.body.match.lastEventId;
				res.body.drawnItems.length.should.eql(2);

				// P2 Should receive a notification
				return request(shuttle)
					.get('/v1/gamer/event/private?ack=auto')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.type.should.eql("match.shoedraw");
						res.body.event.count.should.eql(2);
						lastEventId_p2 = res.body.event._id;
						return done();
					});
			}));
		return null;
	});

	it("should draw more elements than available from the shoe", function (done) {

		_eatPendingEvents(gamer_id_p2, gamer_token_p2, () => request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/shoe/draw?count=5&lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				lastEventId_p1 = res.body.match.lastEventId;
				res.body.drawnItems.length.should.eql(5);
				return done();
			}));
		return null;
	});

	it("should complete a match", function (done) {
		// Eat pending messages to start up clean
		_eatPendingEvents(gamer_id_p2, gamer_token_p2, () => request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/finish?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// Only summarized information should be returned
				should.not.exist(res.body.match.globalState);
				lastEventId_p1 = res.body.match.lastEventId;

				return request(shuttle)
					.get('/v1/gamer/event/private?ack=auto')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.type.should.eql("match.finish");
						res.body.event.finished.should.eql(1);
						lastEventId_p2 = res.body.event._id;
						return done();
					});
			}));
		return null;
	});

	it("should reveal the shoe after the match has ended", function (done) {
		// Eat pending messages to start up clean
		_eatPendingEvents(gamer_id_p2, gamer_token_p2, () => request(shuttle)
			.get(`/v1/gamer/matches/${sample_match_id}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// Was 4 initially, but drew 5 so increased to the double
				res.body.match.shoe.length.should.eql(8);
				return done();
			}));
		return null;
	});

	it("should complete a match only once", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/finish?lastEventId=${lastEventId_p1}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('MatchAlreadyFinished');
				return done();
			});
		return null;
	});

	it("shouldn't be able to complete a match to which one doesn't belong", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id_2}/finish?lastEventId=${lastEventId_p2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('BadMatchID');
				return done();
			});
		return null;
	});

	it("should not list finished matches", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private&full&participating")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.not.exist(_selectMatch(res, sample_match_id));
				should.exist(_selectMatch(res, sample_match_id_2));
				return done();
			});
		return null;
	});

	it("should list finished matches", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private&full&participating&finished")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.exist(_selectMatch(res, sample_match_id));
				should.exist(_selectMatch(res, sample_match_id_2));
				return done();
			});
		return null;
	});

	it("should not list full matches by default", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should.not.exist(_selectMatch(res, sample_match_id));
				should.not.exist(_selectMatch(res, sample_match_id_2));
				return done();
			});
		return null;
	});

	it("should leave a match", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/leave`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// Only summarized information should be returned
				should.not.exist(res.body.match.globalState);
				return done();
			});
		return null;
	});

	it("should receive a notification when another player leaves", function (done) {
		// P1 should receive a notification
		request(shuttle)
			.get('/v1/gamer/event/private?ack=auto')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.type.should.eql("match.leave");
				should.exist(res.body.event.match_id);
				res.body.event.playersLeft[0].gamer_id.should.eql(gamer_id_p2);
				return done();
			});
		return null;
	});

	it("should not leave a match twice", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/leave`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end((err, res) => done(err));
		return null;
	});

	it("should not allow to delete a match unless being owner", function (done) {

		request(shuttle)
			.delete(`/v1/gamer/matches/${sample_match_id}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('BadMatchID');
				return done();
			});
		return null;
	});

	it("should not allow to delete a match unless it is finished", function (done) {

		request(shuttle)
			.delete(`/v1/gamer/matches/${sample_match_id_2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('MatchNotFinished');
				return done();
			});
		return null;
	});

	it("should delete a finished match", function (done) {

		request(shuttle)
			.delete(`/v1/gamer/matches/${sample_match_id}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.done.should.eql(1);
				return done();
			});
		return null;
	});

	it("should complete a match that just started", function (done) {
		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				description: "Sample match for testing",
				maxPlayers: 3
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }

				return request(shuttle)
					.post(`/v1/gamer/matches/${res.body.match._id}/finish?lastEventId=${res.body.match.lastEventId}`)
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p1, gamer_token_p1)
					.type('json')
					.send({})
					.expect('content-type', /json/)
					.expect(200)
					.end((err, res) => done(err));
			});
		return null;
	});

	it("should not be able to invite himself", function (done) {

		// First create a match to start up anew
		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				description: "Match for testing",
				maxPlayers: 2
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				sample_match_id = res.body.match._id;

				// Then invite himself
				return request(shuttle)
					.post(`/v1/gamer/matches/${sample_match_id}/invite/${gamer_id_p1}`)
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p1, gamer_token_p1)
					.type('json')
					.send({})
					.expect('content-type', /json/)
					.expect(400)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.name.should.eql('AlreadyJoinedMatch');
						return done(err);
					});
			});
		return null;
	});

	it("should invite somebody else", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/invite/${gamer_id_p2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				// P2 should receive a notification
				return request(shuttle)
					.get('/v1/gamer/event/private?ack=auto')
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.type.should.eql("match.invite");
						res.body.event.match_id.should.eql(sample_match_id);
						res.body.event.inviter.gamer_id.should.eql(gamer_id_p1);
						return done();
					});
			});
		return null;
	});

	it("should not invite somebody twice", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/invite/${gamer_id_p2}`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('AlreadyInvitedToMatch');
				return done(err);
			});
		return null;
	});

	it("should list matches to which one is invited", function (done) {

		request(shuttle)
			.get("/v1/gamer/matches?domain=private&invited")
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				_selectMatch(res, sample_match_id).description.should.eql('Match for testing');
				return done();
			});
		return null;
	});

	it("should not be invited anymore once match is joined", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/join`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }

				// Check now that we aren't invited anymore
				return request(shuttle)
					.get("/v1/gamer/matches?domain=private&invited")
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p2, gamer_token_p2)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						should.not.exist(_selectMatch(res, sample_match_id));
						return done();
					});
			});
		return null;
	});

	it("should not invite non-existing gamer", function (done) {

		request(shuttle)
			.post(`/v1/gamer/matches/${sample_match_id}/invite/123456789012345678901234`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.eql('BadGamerID');
				return done(err);
			});
		return null;
	});

	it("should be able to dismiss an invitation", function (done) {

		// Create a match to start up anew
		request(shuttle)
			.post('/v1/gamer/matches?domain=private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p1, gamer_token_p1)
			.type('json')
			.send({
				description: "Match for testing",
				maxPlayers: 2
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				sample_match_id = res.body.match._id;

				// Invite P2
				return request(shuttle)
					.post(`/v1/gamer/matches/${sample_match_id}/invite/${gamer_id_p2}`)
					.set(dataset.validAppCredentials)
					.auth(gamer_id_p1, gamer_token_p1)
					.type('json')
					.send({})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }

						// P2 should be marked as invited
						return request(shuttle)
							.get('/v1/gamer/matches?domain=private&invited')
							.set(dataset.validAppCredentials)
							.auth(gamer_id_p2, gamer_token_p2)
							.expect('content-type', /json/)
							.expect(200)
							.end(function (err, res) {
								if (err != null) { return done(err); }
								should.exist(_selectMatch(res, sample_match_id));

								// Then he'll dismiss the invitation
								return request(shuttle)
									.delete(`/v1/gamer/matches/${sample_match_id}/invitation`)
									.set(dataset.validAppCredentials)
									.auth(gamer_id_p2, gamer_token_p2)
									.expect('content-type', /json/)
									.expect(200)
									.end(function (err, res) {
										if (err != null) { return done(err); }

										// And should not be marked as invited anymore
										return request(shuttle)
											.get('/v1/gamer/matches?domain=private&invited')
											.set(dataset.validAppCredentials)
											.auth(gamer_id_p2, gamer_token_p2)
											.expect('content-type', /json/)
											.expect(200)
											.end(function (err, res) {
												if (err != null) { return done(err); }
												should.not.exist(_selectMatch(res, sample_match_id));
												return done(err);
											});
									});
							});
					});
			});
		return null;
	});

	it("should not be able to dismiss an invitation from a match he hasn't been invited to", function (done) {
		// Then he'll dismiss the invitation
		request(shuttle)
			.delete(`/v1/gamer/matches/${sample_match_id}/invitation`)
			.set(dataset.validAppCredentials)
			.auth(gamer_id_p2, gamer_token_p2)
			.expect('content-type', /json/)
			.expect(400)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.name.should.be.eql('BadMatchID');
				return done(err);
			});
		return null;
	});

	return it("should delete the user", function (done) {
		const xtralife = require('xtralife-api');
		const async = require('async');
		async.parallel([cb => xtralife.api.onDeleteUser(new ObjectId(gamer_id_p1), cb, 'com.clanofthecloud.cloudbuilder'),
		cb => xtralife.api.onDeleteUser(new ObjectId(gamer_id_p2), cb, 'com.clanofthecloud.cloudbuilder')
		], err => {
			return done(err);
		});
		return null;
	});
});


