request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

Q = require 'bluebird'
xtralife = require 'xtralife-api'

gamer_id = null
gamer_token = null

describe 'Index', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	before "should create an anonymous user", (done)->

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
		null

	it "should index a document", (done)->

		request(shuttle)
		.post '/v1/index/private/test'
		.set dataset.validAppCredentials
		.send
			id: gamer_id
			properties:
				a:1
				b:2
				token: gamer_token # used to have a singleton
			payload: {string: "this is from our unit tests"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.created.should.eql true
			done(err)
		null

	it 'should get the indexed document', (done)->
		request(shuttle)
		.get "/v1/index/private/test/#{gamer_id}"
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.found.should.eql true
			res.body._id.should.eql gamer_id
			res.body._source.a.should.eql 1
			res.body._source.b.should.eql 2
			#console.log res.body
			done(err)
		null

	it "should index a document with / in the id", (done)->

		request(shuttle)
		.post '/v1/index/private/test'
		.set dataset.validAppCredentials
		.send
			id: "#{gamer_id}/with_a_slash"
			properties: {}
			payload: {string: "this is from our unit tests"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.created.should.eql true
			done(err)
		null

	it 'should get and delete the indexed document with / in the id', (done)->
		request(shuttle)
		.get "/v1/index/private/test/#{gamer_id}/with_a_slash"
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.found.should.eql true
			res.body._id.should.eql "#{gamer_id}/with_a_slash"
			request(shuttle)
			.delete "/v1/index/private/test/#{gamer_id}/with_a_slash"
			.set dataset.validAppCredentials
			.send
				id: gamer_id
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.found.should.eql true
				#console.log res.body
				done()

		null


	it 'should report missing document', (done)->
		request(shuttle)
		.get "/v1/index/private/test/missing_document_id"
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			done(err)
		null

	it 'should allow searching all entries and get max limit entries', (done)->

		request(shuttle)
		.post '/v1/index/private/test/search?max=5&q=*'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)

			should(res.body.hits.length > 0 and res.body.hits.length <= 5)
			done(err)
		null

	it 'should allow searching entries by value', (done)->

		request(shuttle)
		.post  "/v1/index/private/test/search?max=50&q=token:#{gamer_token}"
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.hits.length.should.eql 1
			res.body.hits[0]._id.should.eql gamer_id
			res.body.hits[0]._source.payload.should.eql {string: 'this is from our unit tests' }
			done(err)
		null

	it 'should allow querying by body', (done)->

		request(shuttle)
		.post  "/v1/index/private/test/search?max=50"
		.set dataset.validAppCredentials
		.send
			query:
				term:
					token: gamer_token
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.hits.length.should.eql 1
			res.body.hits[0]._id.should.eql gamer_id
			res.body.hits[0]._source.payload.should.eql {string: 'this is from our unit tests' }
			done(err)
		null

	it 'should allow querying inexistant document', (done)->

		request(shuttle)
		.post  "/v1/index/private/test/search?max=50"
		.set dataset.validAppCredentials
		.send
				query:
					term:
						token: 'doesnt exist'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.hits.length.should.eql 0
			done(err)
		null


	it "should overwrite a document", (done)->

		request(shuttle)
		.post  '/v1/index/private/test'
		.set dataset.validAppCredentials
		.send
			id: gamer_id
			properties:
				a:2
				b:1
				token: gamer_token # used to have a singleton
			payload: {string: "this is still from our unit tests"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.created.should.eql false

			request(shuttle)
			.post "/v1/index/private/test/search?max=50&q=token:#{gamer_token}"
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.hits.length.should.eql 1
				res.body.hits[0]._id.should.eql gamer_id
				res.body.hits[0]._source.payload.should.eql {string: 'this is still from our unit tests' }
				done(err)
		null


	# skip it, to let the db grow...
	it "should delete a document", (done)->

		request(shuttle)
		.delete "/v1/index/private/test/#{gamer_id}"
		.set dataset.validAppCredentials
		.send
			id: gamer_id
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.found.should.eql true
			#console.log res.body
			done()
		null
