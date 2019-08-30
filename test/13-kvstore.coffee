request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

Q = require 'bluebird'
xtralife = require 'xtralife-api'

gamer_id = null
gamer_token = null

describe 'KV Store', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	before "should create a key with xtralife api", ->
		context = runFromClient: true, game: appid: 'com.clanofthecloud.cloudbuilder'
		domain = 'com.clanofthecloud.cloudbuilder.azerty'
		xtralife.api.kv.create context, domain, null, 'testKey', 'hi', {r:'*', w:'*', a:'*'}

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

	it "should read the key", (done)->
		request(shuttle)
		.get '/v1/gamer/kv/private/testKey'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.key.should.eql 'testKey'
			res.body.value.should.eql 'hi'
			done()
		null

	it "should write the key", (done)->
		request(shuttle)
		.post '/v1/gamer/kv/private/testKey'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.send
			value: "hello world!"
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.ok.should.eql 1
			res.body.nModified.should.eql 1
			done()
		null

	it "should read the modified key", (done)->
		request(shuttle)
		.get '/v1/gamer/kv/private/testKey'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.key.should.eql 'testKey'
			res.body.value.should.eql "hello world!"
			done()
		null

	after "delete key", (done)->
		request(shuttle)
		.delete "/v1/gamer/kv/private/testKey"
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.should.eql ok:1, n:1
			done()
		null
