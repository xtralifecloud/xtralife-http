request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'
ObjectID = require('mongodb').ObjectID

Q = require 'bluebird'

# Eats pending events for a gamer on Broker
_eatPendingEvents = (gamer_id, gamer_token, whenDone)->
	request(shuttle)
	.get '/v1/gamer/event/private?ack=auto&timeout=50'
	.set dataset.validAppCredentials
	.auth(gamer_id, gamer_token)
	.expect 200
	.end (err, res)->
		return whenDone() if err?
		# No err, we may have more left
		_eatPendingEvents gamer_id, gamer_token, whenDone

# Selects a match in the body of the response
_selectMatch = (res, expected_match_id)->
	(match for match in res.body.matches when match._id is expected_match_id)[0]

# Filled during tests
sample_match_id = null
sample_match_id_2 = null
gamer_id_p1 = gamer_token_p1 = null
gamer_id_p2 = gamer_token_p2 = null
lastEventId_p1 = null
lastEventId_p2 = null

describe 'Matches', -> # there's an interraction somewhere in our tests, can run .only only...

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	it "should create users just for matches", (done)->

		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			gamer_id_p1 = res.body.gamer_id
			gamer_token_p1 = res.body.gamer_secret

			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				gamer_id_p2 = res.body.gamer_id
				gamer_token_p2 = res.body.gamer_secret
				done()

	it "should create a match", (done)->

		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			description: "Sample match for testing"
			maxPlayers: 3
			customProperties: {type: "coop", other: "property"}
			shoe: [
				{prop1: {attr: 'value1'}}
				{prop2: 'value2'}
				{prop3: 'value3'}
				{prop4: 'value4'}
			]
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			sample_match_id = res.body.match._id
			res.body.match.status.should.eql("running")
			res.body.match.creator.gamer_id.should.eql(gamer_id_p1)
			res.body.match.description.should.eql("Sample match for testing")
			res.body.match.customProperties.type.should.eql("coop")
			res.body.match.events.should.eql([])
			should.exist(res.body.match.seed)
			should.not.exist(res.body.match.shoe)

			# Then create a second match
			request(shuttle)
			.post '/v1/gamer/matches?domain=private'
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send
				description: "Another sample match"
				maxPlayers: 1
				customProperties: {type: "versus"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				sample_match_id_2 = res.body.match._id
				done()

	it "should not be able to create a match with insufficient information", (done)->

		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should not be able to create a match with complex objects in the properties", (done)->

		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			description: "Sample match for testing"
			maxPlayers: 3
			customProperties: {complex: {object: "value"}}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should contain the profile of the creator in the match list, but no players", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			match = _selectMatch(res, sample_match_id)
			match.creator.gamer_id.should.eql(gamer_id_p1)
			should.not.exist(match.players)
			done()

	it "should list filtered matches", (done)->

		request(shuttle)
		.get '/v1/gamer/matches/?domain=private&properties={"type": "coop"}'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			_selectMatch(res, sample_match_id).description.should.eql('Sample match for testing')
			done()

	it "should not list filtered matches that do not fit", (done)->

		request(shuttle)
		.get '/v1/gamer/matches?domain=private&properties={"type": "coo"}'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.matches.should.eql([])
			done()

	first_match_id = null
	it "should use pagination parameters", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private&full&limit=1"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			# We should get only one match
			res.body.matches.length.should.eql(1)
			first_match_id = res.body.matches[0]._id
			res.body.count.should.be.above(1)

			# Now with a skip and limit
			request(shuttle)
			.get "/v1/gamer/matches?domain=private&full&skip=1&limit=1"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				# We should get one match and not the same as without skip param
				res.body.matches.length.should.eql(1)
				res.body.matches[0]._id.should.not.eql(first_match_id)
				done()

	it "should fetch value about a single match", (done)->

		request(shuttle)
		.get "/v1/gamer/matches/#{sample_match_id}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.match.description.should.eql('Sample match for testing')
			res.body.match.creator.gamer_id.should.eql(gamer_id_p1)
			res.body.match.players[0].gamer_id.should.eql(gamer_id_p1)
			done()

	it "should not be able to fetch an invalid match ID", (done)->

		request(shuttle)
		.get "/v1/gamer/matches/1234"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 404
		.end (err, res)->
			done err

	it "should not be able to fetch a non-existing match ID", (done)->

		request(shuttle)
		.get "/v1/gamer/matches/123456789012345678901234"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 400
		.end (err, res)->
			done err

	it "should eat all pending messages from broker", (done)->
		_eatPendingEvents gamer_id_p1, gamer_token_p1, ->
			done()

	it "should join a match", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/join"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.exist(res.body.match.lastEventId)
			should.not.exist(res.body.match.shoe)
			lastEventId_p2 = res.body.match.lastEventId
			done()

	it "should receive a notification when another player joins", (done)->
		# P1 should receive a notification
		request(shuttle)
		.get '/v1/gamer/event/private?ack=auto'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.type.should.eql("match.join")
			res.body.event.match_id.should.eql(sample_match_id)
			res.body.event.playersJoined[0].gamer_id.should.eql(gamer_id_p2)
			lastEventId_p1 = res.body.event._id
			done()

	it "should not be able to join a match twice", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/join"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('AlreadyJoinedMatch')
			done()

	it "should be limited to the maximum number of players", (done)->
		# The second game already has one player (the one who created it)
		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id_2}/join"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('MaximumNumberOfPlayersReached')
			done()

	it "should refuse invalid move", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send
			globalState:
				dummy: 1
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('InvalidJSONBody')
			done()

	it "should not be able to make a move without a lastEventId", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send
				move:
					thrown: "fifth_dice"
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should not be able to make a move with an invalid lastEventId", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=123456789012345678901234"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send
				move:
					thrown: "fifth_dice"
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('InvalidLastEventId')
			done()

	it "should not receive an own move from broker", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send
			move:
				thrown: "fifth_dice"
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			should.exist(res.body.match.lastEventId)
			lastEventId_p2 = res.body.match.lastEventId
			# Only summarized information should be returned
			should.not.exist(res.body.match.globalState)

			request(shuttle)
			.get '/v1/gamer/event/private?timeout=500&ack=auto'
			.set dataset.validAppCredentials
			.auth(gamer_id_p2, gamer_token_p2)
			.expect 204
			.end (err, res)->
				return done err if err?

				# We still need to acknowledge the message for the first user
				request(shuttle)
				.get '/v1/gamer/event/private?ack=auto'
				.set dataset.validAppCredentials
				.auth(gamer_id_p1, gamer_token_p1)
				.expect 200
				.end (err, res)->
					return done err if err?
					should.exist(res.body.event._id)
					res.body.type.should.eql('match.move')
					lastEventId_p1 = res.body.event._id
					done()

	it "should receive a move from broker if another player posts a move", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p1}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			move:
				thrown: "nothing"
			globalState:
				full: 1
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			should.exist(res.body.match.lastEventId)
			lastEventId_p1 = res.body.match.lastEventId

			request(shuttle)
			.get '/v1/gamer/event/private?ack=auto'
			.set dataset.validAppCredentials
			.auth(gamer_id_p2, gamer_token_p2)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.type.should.eql("match.move")
				res.body.event.player_id.should.eql(gamer_id_p1)
				res.body.event.move.thrown.should.eql("nothing")
				should.not.exist(res.body.event.globalState)
				should.exist(res.body.event._id)
				lastEventId_p2 = res.body.event.move.move_id
				done()

	it "should post a move in the match", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p1}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			move:
				thrown: "dice"
			globalState:
				score: 100
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.exist(res.body.match.lastEventId)
			lastEventId_p1 = res.body.match.lastEventId
			done()

	it "should post a second move in the match", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p1}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			move:
				thrown: "another_dice"
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			lastEventId_p1 = res.body.match.lastEventId
			done()

	it "should clear the move list when posting a global state", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/move?lastEventId=#{lastEventId_p1}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
				move:
					thrown: "third_dice"
				globalState:
					score: 200
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			lastEventId_p1 = res.body.match.lastEventId
			done()

	it "should draw an element from the shoe", (done)->

		_eatPendingEvents gamer_id_p2, gamer_token_p2, ->
			request(shuttle)
			.post "/v1/gamer/matches/#{sample_match_id}/shoe/draw?count=2&lastEventId=#{lastEventId_p1}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				lastEventId_p1 = res.body.match.lastEventId
				res.body.drawnItems.length.should.eql(2)

				# P2 Should receive a notification
				request(shuttle)
				.get '/v1/gamer/event/private?ack=auto'
				.set dataset.validAppCredentials
				.auth(gamer_id_p2, gamer_token_p2)
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					res.body.type.should.eql("match.shoedraw")
					res.body.event.count.should.eql(2)
					lastEventId_p2 = res.body.event._id
					done()

	it "should draw more elements than available from the shoe", (done)->

		_eatPendingEvents gamer_id_p2, gamer_token_p2, ->
			request(shuttle)
			.post "/v1/gamer/matches/#{sample_match_id}/shoe/draw?count=5&lastEventId=#{lastEventId_p1}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				lastEventId_p1 = res.body.match.lastEventId
				res.body.drawnItems.length.should.eql(5)
				done()

	it "should complete a match", (done)->
		# Eat pending messages to start up clean
		_eatPendingEvents gamer_id_p2, gamer_token_p2, ->

			request(shuttle)
			.post "/v1/gamer/matches/#{sample_match_id}/finish?lastEventId=#{lastEventId_p1}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				# Only summarized information should be returned
				should.not.exist(res.body.match.globalState)
				lastEventId_p1 = res.body.match.lastEventId

				request(shuttle)
				.get '/v1/gamer/event/private?ack=auto'
				.set dataset.validAppCredentials
				.auth(gamer_id_p2, gamer_token_p2)
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					res.body.type.should.eql("match.finish")
					res.body.event.finished.should.eql(1)
					lastEventId_p2 = res.body.event._id
					done()

	it "should reveal the shoe after the match has ended", (done)->
		# Eat pending messages to start up clean
		_eatPendingEvents gamer_id_p2, gamer_token_p2, ->

			request(shuttle)
			.get "/v1/gamer/matches/#{sample_match_id}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				# Was 4 initially, but drew 5 so increased to the double
				res.body.match.shoe.length.should.eql(8)
				done()

	it "should complete a match only once", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/finish?lastEventId=#{lastEventId_p1}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('MatchAlreadyFinished')
			done()

	it "shouldn't be able to complete a match to which one doesn't belong", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id_2}/finish?lastEventId=#{lastEventId_p2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('BadMatchID')
			done()

	it "should not list finished matches", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private&full&participating"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.not.exist(_selectMatch(res, sample_match_id))
			should.exist(_selectMatch(res, sample_match_id_2))
			done()

	it "should list finished matches", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private&full&participating&finished"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.exist(_selectMatch(res, sample_match_id))
			should.exist(_selectMatch(res, sample_match_id_2))
			done()

	it "should not list full matches by default", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.not.exist(_selectMatch(res, sample_match_id))
			should.not.exist(_selectMatch(res, sample_match_id_2))
			done()

	it "should leave a match", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/leave"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			# Only summarized information should be returned
			should.not.exist(res.body.match.globalState)
			done()

	it "should receive a notification when another player leaves", (done)->
		# P1 should receive a notification
		request(shuttle)
		.get '/v1/gamer/event/private?ack=auto'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.type.should.eql("match.leave")
			should.exist(res.body.event.match_id)
			res.body.event.playersLeft[0].gamer_id.should.eql(gamer_id_p2)
			done()

	it "should not leave a match twice", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/leave"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should not allow to delete a match unless being owner", (done)->

		request(shuttle)
		.delete "/v1/gamer/matches/#{sample_match_id}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('BadMatchID')
			done()

	it "should not allow to delete a match unless it is finished", (done)->

		request(shuttle)
		.delete "/v1/gamer/matches/#{sample_match_id_2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('MatchNotFinished')
			done()

	it "should delete a finished match", (done)->

		request(shuttle)
		.delete "/v1/gamer/matches/#{sample_match_id}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.done.should.eql(1)
			done()

	it "should complete a match that just started", (done)->
		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			description: "Sample match for testing"
			maxPlayers: 3
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err

			request(shuttle)
			.post "/v1/gamer/matches/#{res.body.match._id}/finish?lastEventId=#{res.body.match.lastEventId}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				done err

	it "should not be able to invite himself", (done)->

		# First create a match to start up anew
		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
			description: "Match for testing"
			maxPlayers: 2
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			sample_match_id = res.body.match._id

			# Then invite himself
			request(shuttle)
			.post "/v1/gamer/matches/#{sample_match_id}/invite/#{gamer_id_p1}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				return done err if err?
				res.body.name.should.eql('AlreadyJoinedMatch')
				done err

	it "should invite somebody else", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/invite/#{gamer_id_p2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			# P2 should receive a notification
			request(shuttle)
			.get '/v1/gamer/event/private?ack=auto'
			.set dataset.validAppCredentials
			.auth(gamer_id_p2, gamer_token_p2)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.type.should.eql("match.invite")
				res.body.event.match_id.should.eql(sample_match_id)
				res.body.event.inviter.gamer_id.should.eql(gamer_id_p1)
				done()

	it "should not invite somebody twice", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/invite/#{gamer_id_p2}"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('AlreadyInvitedToMatch')
			done err

	it "should list matches to which one is invited", (done)->

		request(shuttle)
		.get "/v1/gamer/matches?domain=private&invited"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			_selectMatch(res, sample_match_id).description.should.eql('Match for testing')
			done()

	it "should not be invited anymore once match is joined", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/join"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err

			# Check now that we aren't invited anymore
			request(shuttle)
			.get "/v1/gamer/matches?domain=private&invited"
			.set dataset.validAppCredentials
			.auth(gamer_id_p2, gamer_token_p2)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				should.not.exist(_selectMatch(res, sample_match_id))
				done()

	it "should not invite non-existing gamer", (done)->

		request(shuttle)
		.post "/v1/gamer/matches/#{sample_match_id}/invite/123456789012345678901234"
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			return done err if err?
			res.body.name.should.eql('BadGamerID')
			done err

	it "should be able to dismiss an invitation", (done)->

		# Create a match to start up anew
		request(shuttle)
		.post '/v1/gamer/matches?domain=private'
		.set dataset.validAppCredentials
		.auth(gamer_id_p1, gamer_token_p1)
		.type 'json'
		.send
				description: "Match for testing"
				maxPlayers: 2
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			sample_match_id = res.body.match._id

			# Invite P2
			request(shuttle)
			.post "/v1/gamer/matches/#{sample_match_id}/invite/#{gamer_id_p2}"
			.set dataset.validAppCredentials
			.auth(gamer_id_p1, gamer_token_p1)
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?

				# P2 should be marked as invited
				request(shuttle)
				.get '/v1/gamer/matches?domain=private&invited'
				.set dataset.validAppCredentials
				.auth(gamer_id_p2, gamer_token_p2)
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					should.exist(_selectMatch(res, sample_match_id))

					# Then he'll dismiss the invitation
					request(shuttle)
					.delete "/v1/gamer/matches/#{sample_match_id}/invitation"
					.set dataset.validAppCredentials
					.auth(gamer_id_p2, gamer_token_p2)
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err

						# And should not be marked as invited anymore
						request(shuttle)
						.get '/v1/gamer/matches?domain=private&invited'
						.set dataset.validAppCredentials
						.auth(gamer_id_p2, gamer_token_p2)
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							if err? then return done err
							should.not.exist(_selectMatch(res, sample_match_id))
							done err

	it "should not be able to dismiss an invitation from a match he hasn't been invited to", (done)->
		# Then he'll dismiss the invitation
		request(shuttle)
		.delete "/v1/gamer/matches/#{sample_match_id}/invitation"
		.set dataset.validAppCredentials
		.auth(gamer_id_p2, gamer_token_p2)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			if err? then return done err
			res.body.name.should.be.eql('BadMatchID')
			done err

	it "should delete the user", (done)->
		xtralife = require 'xtralife-api'
		async = require 'async'
		async.parallel [(cb)->
			xtralife.api.onDeleteUser ObjectID(gamer_id_p1), cb, 'com.clanofthecloud.cloudbuilder'
		(cb)->
			xtralife.api.onDeleteUser ObjectID(gamer_id_p2), cb, 'com.clanofthecloud.cloudbuilder'
		], (err)=>
			done(err)
		return null


