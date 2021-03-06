request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

# Testing Gamer routes

describe 'Gamers', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle


	before "should create a user", (done)->
		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			dataset.gamer_id = res.body.gamer_id
			dataset.gamer_token = res.body.gamer_secret
			done()
		null

	before "should create a friend", (done)->
		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			dataset.friend_id = res.body.gamer_id
			dataset.friend_token = res.body.gamer_secret
			done()
		null

	describe 'Profile', ->

		it 'set addr1 to profile should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/profile'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { "addr1" : "rue condorcet, Paris"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property 'profile'
				res.body.profile.should.containDeep {"addr1" : "rue condorcet, Paris"}
				done()
			null

		it 'get profile should sucess', (done)->

			request(shuttle)
			.get '/v1/gamer/profile'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.containDeep {"addr1" : "rue condorcet, Paris"}
				done()
			null

	describe 'Search', ->

		networkid = null

		it 'bad method should fail', (done)->

			request(shuttle)
			.get "/v1/gamer/whatever/#{dataset.friend_id}"
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('InvalidOption')
				done()
			null

		it 'get existing gamer_id should sucess', (done)->

			request(shuttle)
			.get "/v1/gamer/gamer_id/#{dataset.friend_id}"
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->

				# save networkid for later
				networkid = res.body.networkid

				if err? then return done(err)
				res.body.should.have.property "_id"
				done()
			null

		it 'get non existing gamer_id should fail', (done)->

			request(shuttle)
			.get "/v1/gamer/gamer_id/whatever"
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 533
			.end (err, res)->
				res.body.name.should.eql('BadGamerID')
				done()
			null

		it 'get existing network_id should sucess', (done)->

			id = networkid

			request(shuttle)
			.get "/v1/gamer/anonymous/#{id}"
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "_id"
				done()
			null

		it 'get non existing network_id should fail', (done)->

			request(shuttle)
			.get '/v1/gamer/anonymous/whatever'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				if err? then return done(err)
				res.body.name.should.eql('BadGamerID')
				done()
			null

		it 'get displayName containing "Guest" should sucess', (done)->

			request(shuttle)
			.get '/v1/gamer?q=Guest&skip=2&limit=2'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "count"
				done()
			null

	describe 'GDPR user nuking', ->

		it 'should create a guinee pig and nuke it', (done)=>
			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				should(err).be.null
				gamer_id = res.body.gamer_id
				gamer_token = res.body.gamer_secret

				request(shuttle)
				.post '/v1/gamer/nuke/me'
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.type 'json'
				.send {}
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					res.body.nuked.should.eql(true)

					# same call, should fail for bad auth, missing user
					request(shuttle)
					.post '/v1/gamer/nuke/me'
					.set dataset.validAppCredentials
					.auth(gamer_id, gamer_token)
					.type 'json'
					.send {}
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						res.status.should.eql(401)
						res.body.name.should.eql('InvalidLoginTokenError')
						done()
			null


