request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

# Testing Gamer routes

# These will be filled when the test user is created
gamer_id = null
gamer_token = null


describe 'Godfather', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	godfatherCode = undefined

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

	it "should create an anonymous user just for godchilden", (done)->

		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			gamer_id = res.body.gamer_id
			gamer_token = res.body.gamer_secret
			done()

	it 'create godfather code should sucess', (done)->

		request(shuttle)
		.put '/v1/gamer/godfather'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property 'godfathercode'
			godfatherCode = res.body.godfathercode

			done(err)



	it 'set godfather code should sucess', (done)->

		request(shuttle)
		.post '/v1/gamer/godfather'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send { "godfather" : godfatherCode}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property 'done'
			res.body.done.should.eql 1
			#console.log res.body

			request(shuttle)
			.get '/v1/gamer/godfather'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.godfather.gamer_id.should.eql dataset.gamer_id
				done(err)


	it "should create another anonymous user just for godchilden", (done)->

		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			gamer_id = res.body.gamer_id
			gamer_token = res.body.gamer_secret
			done()

	it 'set godfather code with reward should success', (done)->

		request(shuttle)
		.post '/v1/gamer/godfather'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send { "godfather" : godfatherCode, "reward" : { transaction :{ "Gold": 10, "parrainage" : 1}, description : "reward transaction"} }
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			#console.log res.body
			res.body.should.have.property 'done'
			done(err)

	it 'get godchildren should sucess', (done)->

		request(shuttle)
		.get '/v1/gamer/godchildren'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			#console.log res.body
			res.body.should.have.property 'godchildren'
			done(err)

