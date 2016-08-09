request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

# Testing Gamer routes

describe 'Properties', ->

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

	describe 'Failure', ->

		it 'set objet property should fail', (done)->

			request(shuttle)
			.post '/v1/gamer/property/object'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : { field : 12, otherfield: "test" } }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadPropertyType')
				done(err)

		it 'set array of objets property should fail', (done)->

			request(shuttle)
			.post '/v1/gamer/property/arrayobject'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : [{ field : 12 }, { field : 12 }] }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadPropertyType')
				done(err)

		it 'missing value should fail', (done)->

			request(shuttle)
			.post '/v1/gamer/property/miss'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send "value"
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('MissingPropertyValue')
				done(err)

		it 'change all properties with objetcs should fail', (done)->

			request(shuttle)
			.post '/v1/gamer/property'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { board: "round", level : 30 , invalid : { test : "test"} }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadPropertyType')
				done()


	describe 'Success', ->

		it 'set string property should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/property/board'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : "cube" }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				done()

		it 'get property should sucess', (done)->

			request(shuttle)
			.get '/v1/gamer/property/board'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.properties.should.have.property "board"
				res.body.properties.board.should.be.eql "cube"
				done()

		it 'set number property should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/property/level'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : 10 }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				done()

		it 'set boolean property should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/property/enable'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : true }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				done()

		it 'set array property should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/property/data'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { value : [ 1, 2, 3] }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				done()

		it 'get all property should sucess', (done)->

			request(shuttle)
			.get '/v1/gamer/property'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "properties"
				res.body.properties.should.containEql { board : "cube"}
				res.body.properties.should.containEql { level : 10 }
				done()

		it 'change all properties should sucess', (done)->

			request(shuttle)
			.post '/v1/gamer/property'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { board: "square", level : 20 }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				done()

		it 'find user who match properties', (done)->

			request(shuttle)
			.get '/v1/gamer/matchproperties'
			.set dataset.validAppCredentials
			.auth(dataset.friend_id, dataset.friend_token)
			.send { level : { '$gt' : 10 } }
			.expect 'content-type', /json/
			.expect 410
			.end (err, res)->
				done()

		it 'find should fail on bad query', (done)->

			request(shuttle)
			.get '/v1/gamer/matchproperties'
			.set dataset.validAppCredentials
			.auth(dataset.friend_id, dataset.friend_token)
			.send { level : { '$dt' : 10 } }
			.expect 'content-type', /json/
			.expect 410
			.end (err, res)->
				done()


		it 'vefify all properties should sucess', (done)->

			request(shuttle)
			.get '/v1/gamer/property'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "properties"
				res.body.properties.should.containEql { board : "square"}
				res.body.properties.should.containEql { level : 20}
				done()

		it 'del property should sucess', (done)->

			request(shuttle)
			.delete '/v1/gamer/property/board'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				res.body.done.should.eql 1
				done()

		it 'del properties should sucess', (done)->

			request(shuttle)
			.delete '/v1/gamer/property'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				res.body.done.should.eql 1
				done()

