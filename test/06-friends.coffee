request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

# Testing Gamer routes

describe 'Friends', ->

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

	describe 'Failures', ->

		it 'gamer should reject an unknown status', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id+'?status=whatever'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('StatusNotSupported')
				done(err)

		it 'gamer should reject an bad gamer_id', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/whatever?status=add'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadGamerID')
				done(err)

		it 'gamer should reject an unknown gamer_id', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/5400b2ed1221cd000045d64e?status=add'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 404
			.end (err, res)->
				res.body.name.should.eql('GamerIdNotFound')
				done(err)

		it 'gamer should reject a missing status', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 404
			.end (err, res)->
				res.body.name.should.eql('StatusNotFound')
				done(err)


	describe 'Success', ->

		it 'gamer should add a new friend', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id+'?status=add'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send {"en": "relation changed"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.eql { done : 1}
				done(err)

		it 'should list gamer friends and gamer friend friends', (done)->

			request(shuttle)
			.get '/v1/gamer/friends'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "friends"
				res.body.friends.should.be.an.Array
				res.body.friends.should.containDeep([{gamer_id:dataset.friend_id }])
				request(shuttle)
						.get '/v1/gamer/friends'
						.set dataset.validAppCredentials
						.auth(dataset.friend_id, dataset.friend_token)
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							if err? then return done(err)
							res.body.should.have.property "friends"
							res.body.friends.should.be.an.Array
							res.body.friends.should.containDeep([{gamer_id:dataset.gamer_id }])
							done(err)
						
		it 'gamer should blacklist a gamer', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id+'?status=blacklist'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.eql { done : 1}
				done(err)

		it 'should list blacklisted users', (done)->

			request(shuttle)
			.get '/v1/gamer/friends?status=blacklist'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "blacklisted"
				res.body.blacklisted.should.be.an.Array
				res.body.blacklisted.should.containDeep([{gamer_id:dataset.friend_id }])
				done(err)

		it 'list friends should not contains friend', (done)->

			request(shuttle)
			.get '/v1/gamer/friends'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "friends"
				res.body.friends.should.be.an.Array
				res.body.friends.should.not.containDeep([{gamer_id:dataset.friend_id }])
				done(err)

		it 'should not accept to add a blacklisted friend', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id+'?status=add'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.eql { done : 0}
				done(err)


		it 'gamer should forget a relation', (done)->

			request(shuttle)
			.post '/v1/gamer/friends/'+dataset.friend_id+'?status=forget'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.eql { done : 1}
				done(err)

		it 'list friends shouldnt contains friend' , (done)->

			request(shuttle)
			.get '/v1/gamer/friends'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "friends"
				res.body.friends.should.be.an.Array
				res.body.friends.should.not.containDeep([{gamer_id:dataset.friend_id }])
				done(err)

		it 'blacklisted shouldnt contains friend', (done)->

			request(shuttle)
			.get '/v1/gamer/friends?status=blacklist'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "blacklisted"
				res.body.blacklisted.should.be.an.Array
				res.body.blacklisted.should.not.containDeep([{gamer_id:dataset.friend_id }])
				done(err)
