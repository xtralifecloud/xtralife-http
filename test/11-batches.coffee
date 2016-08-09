request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

gamer_id = null
gamer_token = null

describe 'Batches', ->

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

	it 'should run a synchronous unauthenticated batch', (done)->
		request(shuttle)
		.post '/v1/batch/private/test1'
		.set dataset.validAppCredentials
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.input.should.eql 'hello'
			res.body.domain.should.eql 'com.clanofthecloud.cloudbuilder.azerty'
			done()

	it 'should run a synchronous authenticated batch', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/test2'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.userFound.should.eql gamer_id
			done()

	it 'unauthenticated batch reports no user', (done)->
		request(shuttle)
		.post '/v1/batch/private/test2'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.should.eql {}
			done()

	it 'should allow running an asynchronous gamer batch', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/test3'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.should.eql { fs: {}, balance: {} }
			done()

	it 'should not crash if batch doesnt compile', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/doesntcompile'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			if err? then return done err
			res.body.should.eql { name: 'HookError', message: 'Hook com.clanofthecloud.cloudbuilder.azerty/__doesntcompile does not exist' }
			done()

	it 'should have access to common', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/usecommon'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.should.eql "itworks"
			done()

	it 'should have access to mod in common', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/usecommon2'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {input: "hello"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.should.eql "itworks"
			done()

	it 'should add isSafe==false when calling a batch', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/hasIsSafe'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.isSafe.should.eql false
			done()

	it 'should receive true when calling hasIsSafe indirectly', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/callsHasIsSafe'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.isSafe.should.eql true
			done()

	it 'should return explicit error if batch does not exist', (done)->
		request(shuttle)
		.post '/v1/gamer/batch/private/doesnotexist'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			if err? then return done err
			res.body.should.eql
				name: 'HookError'
				message: 'Hook com.clanofthecloud.cloudbuilder.azerty/__doesnotexist does not exist'
			done()
