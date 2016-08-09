request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'
xtralife = require 'xtralife-api'

ObjectID = require('mongodb').ObjectID

xtralife = require 'xtralife-api'

ObjectID = require('mongodb').ObjectID

describe 'gamerVFS', ->

	before 'should wait for initialisation', ->
		this.timeout 5000
		shuttlePromise
		.then (_shuttle)->
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

	it 'should delete all game-private keys to begin fresh', (done)->
		request(shuttle)
		.delete '/v1/gamer/vfs/private'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.status.should.eql 200
			done()

	it "should write two keys at once, 'test' and 'test2', through xtralife", ->

		game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"]
		domain = xtralife.api.game.getPrivateDomain game.appid

		xtralife.api.virtualfs.write {game: game}, domain, new ObjectID(dataset.gamer_id), {test:"test", test2:"test2"}


	it "should read the two game private at once through xtralife only", ->
		game = xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"]
		domain = xtralife.api.game.getPrivateDomain game.appid

		xtralife.api.virtualfs.read {game: game}, domain, new ObjectID(dataset.gamer_id), ["test", "test2"]
		.then (result)->
			#console.log result
			result.test.should.eql "test"
			result.test2.should.eql "test2"

	it "should write two game-private 'test' and 'test2' keys", (done)->
		request(shuttle)
		.put '/v1/gamer/vfs/private/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.set('Content-Type', 'application/json')
		.send {hi: "all"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql  {"done" : 1}
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.put '/v1/gamer/vfs/private/test2'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send {hello: 'world'}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {"done" :1}
				res.status.should.eql 200
				if err? then return done(err)
				done(err)


	it 'should read the test key', (done)->
		request(shuttle)
		.get '/v1/gamer/vfs/private/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql {hi: "all"}
			done(err)

	it 'should read all private keys', (done)->
		request(shuttle)
		.get '/v1/gamer/vfs/private'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			res.body.should.eql {test: {hi: "all"}, test2: {hello: 'world'}}
			if err? then return done(err)
			done(err)

	it 'should delete the test key', (done)->
		request(shuttle)
		.delete '/v1/gamer/vfs/private/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)
			request(shuttle)
			.get '/v1/gamer/vfs/private'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {test2: {hello: "world"}}
				done(err)

	it 'should handle a missing key with a 404', (done)->
		request(shuttle)
		.get '/v1/gamer/vfs/private/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.status.should.eql(404)
			done(err)

	it 'should allow setting all keys at once', (done)->
		request(shuttle)
		.put '/v1/gamer/vfs/private'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.set('Content-Type', 'application/json')
		.send {testAll: {hi: "all"}}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql {"done" : 1}
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/gamer/vfs/private/testAll'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.status.should.eql 200
				res.body.should.eql {hi: "all"}
				if err? then return done(err)
				done(err)


	it 'should delete all game-private keys', (done)->
		request(shuttle)
		.delete '/v1/gamer/vfs/private'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/gamer/vfs/private'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {}
				done(err)

	it "should write in specific domain com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3", (done)->
		request(shuttle)
		.put '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.set('Content-Type', 'application/json')
		.send {hi: "all"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql { done: 1, customData: 'DONE!' }
			res.status.should.eql 200
			if err? then return done(err)
			done(err)

	it 'should read all domain keys', (done)->
		request(shuttle)
		.get '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			res.body.should.have.property 'test'
			res.body.test.should.eql
				hi: "all"
			if err? then return done(err)
			done(err)

	it 'should delete all domain keys', (done)->
		request(shuttle)
		.delete '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.status.should.eql 200
			if err? then return done(err)

			request(shuttle)
			.get '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.eql {}
				done(err)

	it "should not access in an unknown domain", (done)->
		request(shuttle)
		.put '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.whaterver/test'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.set('Content-Type', 'application/json')
		.send {hi: "all"}
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.status.should.eql(404)
			done(err)

	getURL = null

describe.skip "binary gamer vfs", ->

	it 'should create binary keys and return presigned url', (done)->
		request(shuttle)
		.put '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.set('Content-Type', 'application/json')
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.have.property('putURL')
			res.body.should.have.property('getURL')
			res.body.should.have.property('done')
			res.body.done.should.eql(1)

			getURL = res.body.getURL
			done(err)

	it "should have stored the url for S3 access", (done)->
		request(shuttle)
		.get '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.eql getURL
			done(err)

	after "should delete the S3 data", (done)->
		request(shuttle)
		.delete '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/binTest?binary'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.should.have.property('done')
			res.body.done.should.eql(1)
			done(err)
