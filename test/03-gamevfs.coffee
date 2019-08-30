request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'
xtralife = require 'xtralife-api'

# TODO fix tests, put and delete are now disabled permanently

game = domain = null

describe 'GameVFS', ->

	before 'should wait for initialisation', ->
		this.timeout 5000
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle
			game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"]
			domain = xtralife.api.game.getPrivateDomain game.appid

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
		
	it.skip 'should delete all game-private keys to begin fresh', (done)->
		request(shuttle)
		.delete '/v1/vfs/private'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.status.should.eql 200
			done(err)
		null

	it "should write two game-private 'test' and 'test2' keys", ->

		xtralife.api.gamevfs.writeAsync domain, {test: {hi: "all"}, test2: {hello: "world"}}

	it "should read the two game keys at once through xtralife only", (done)->

		xtralife.api.gamevfs.readAsync domain, ["test", "test2"]
		.then (result)->
			result.test.should.eql {hi: "all"}
			result.test2.should.eql {hello: "world"}
			done()
		.catch done
		null


	it 'should read the test key', (done)->
		request(shuttle)
		.get '/v1/vfs/private/test'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.eql {hi: "all"}
			done(err)
		null

	it "should write a counter named 'counter'", (done)->

		xtralife.api.gamevfs.writeAsync domain, {counter: 0}
		.then ->
			xtralife.api.gamevfs.readAsync domain, "counter"
		.then (result)->
			result.counter.should.eql 0
			xtralife.api.gamevfs.incr {}, domain, "counter", 1
		.then (result) ->
			result.counter.should.eql 1
			xtralife.api.gamevfs.readAsync domain, "counter"
		.then (result)->
			result.counter.should.eql 1
		.then ->
			xtralife.api.gamevfs.delete domain, "counter", (err)->
				if err? then return done err
				done()
		.catch done
		null

	it 'should read all private keys', (done)->
		request(shuttle)
		.get '/v1/vfs/private'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.status.should.eql 200
			res.body.should.eql {test: {hi: "all"}, test2: {hello: 'world'}}
			if err? then return done(err)
			done(err)
		null

	it.skip 'should delete the test key', (done)->
		request(shuttle)
		.delete '/v1/vfs/private/test'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)
			request(shuttle)
			.get '/v1/vfs/private'
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {test2: {hello: "world"}}
				done(err)
		null

	it 'should handle a missing key with a 404', (done)->
		request(shuttle)
		.get '/v1/vfs/private/test3'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.status.should.eql(404)
			done(err)
		null

	it.skip 'should allow setting all keys at once', (done)->
		request(shuttle)
		.put '/v1/vfs/private'
		.set dataset.validAppCredentials
		.set('Content-Type', 'application/json')
		.send {testAll: {hi: "all"}}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql {"done" : 1}
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/vfs/private/testAll'
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.status.should.eql 200
				res.body.should.eql {hi: "all"}
				if err? then return done(err)
				done(err)
		null


	it.skip 'should delete all game-private keys', (done)->
		request(shuttle)
		.delete '/v1/vfs/private'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/vfs/private'
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {}
				done(err)
		null

	it.skip "should write in specific domain com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3", (done)->
		request(shuttle)
		.put '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/test'
		.set dataset.validAppCredentials
		.set('Content-Type', 'application/json')
		.send {hi: "all"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql  {"done" : 1}
			res.status.should.eql 200
			if err? then return done(err)
			done(err)
		null

	it.skip 'should read all domain keys', (done)->
		request(shuttle)
		.get '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			res.body.test.should.eql {hi: "all"}
			if err? then return done(err)
			done(err)
		null

	it.skip 'should delete all domain keys', (done)->
		request(shuttle)
		.delete '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
		.set dataset.validAppCredentials
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {}
				done(err)
		null

	it "should not access in an unknown domain", (done)->
		request(shuttle)
		.put '/v1/vfs/com.clanofthecloud.cloudbuilder.whaterver/test'
		.set dataset.validAppCredentials
		.set('Content-Type', 'application/json')
		.send {hi: "all"}
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.status.should.eql(404)
			done(err)
		null

describe.skip "Binary GameVFS", ->

	getURL = null
	before 'should wait for initialisation', (done)->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle
			done()
		.catch done

	it 'should create binary keys and return presigned url', (done)->
		request(shuttle)
		.put '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary'
		.set dataset.validAppCredentials
		.set('Content-Type', 'application/json')
		.expect 'content-type', /json/
		.expect 403
		.end (err, res)->
			res.body.error.should.eql 'This route is no longer available'
			done(err)
		null

	it "should delete S3 data", (done)->
		request(shuttle)
		.delete '/v1/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 403
		.end (err, res)->
			res.body.error.should.eql 'This route is no longer available'
			done(err)
		null



