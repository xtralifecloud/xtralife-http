request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

Q = require 'bluebird'
xtralife = require 'xtralife-api'
ObjectID = require('mongodb').ObjectID

gamer_id = null
gamer_token = null
gplus_gamer_id = null
gplus_gamer_token = null
gplusfriends = {}

print = (obj)->
	#console.log require("util").inspect(obj, { showHidden: false, depth: 8, colors: true })

describe.skip 'GooglePlus', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	it "should create an anonymous user", (done)->

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


	it 'should login with googleplus', (done)->

		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send {network: 'googleplus', id:dataset.googleId, secret: dataset.googleToken}
		.expect 'content-type', /json/
		.end (err, res)->
			if res.status == 401
				done(new Error ("Check your Google token!"))
			else
				if err? then return done(err)
				res.body.gamer_id.should.not.be.undefined
				res.body.gamer_secret.should.not.be.undefined
				res.body.network.should.be.eql("googleplus")
				res.body.networkid.should.not.be.undefined
				gplus_gamer_id = res.body.gamer_id
				gplus_gamer_token = res.body.gamer_secret
				# request google friends
				request("https://www.googleapis.com")
				.get '/plus/v1/people/me/people/visible'
				.set {Authorization: "Bearer #{dataset.googleToken}" }
				.expect 'content-type', /json/
				.end (err, res)->
					return done err if err?
					res.body.items.should.not.be.undefined
					for each in res.body.items
						gplusfriends[each.id] = each
					#console.log gplusfriends
					done()

	it "should delete google user", (done)->
		this.timeout(4000)
		xtralife.api.onDeleteUser ObjectID(gplus_gamer_id), done, 'com.clanofthecloud.cloudbuilder'


	it "should convert anonymous to googleplus", (done)->
		request(shuttle)
		.post '/v1/gamer/convert'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {network: 'googleplus', id:dataset.googleId, secret: dataset.googleToken}
		.expect 'content-type', /json/
		.end (err, res)->
			return done err if err?
			done()

	it 'should list gamer friends', (done)->
		request(shuttle)
		.get '/v1/gamer/friends'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			#console.log res.body
			done()

	it 'should list gamer friends for googleplus (v1)', (done)->
		request(shuttle)
		.post '/v1/gamer/friends?network=googleplus'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send gplusfriends
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			print res.body
			done()

	it 'should list gamer friends for googleplus (v2.12)', (done)->
		request(shuttle)
		.post '/v2.12/gamer/friends/private?network=googleplus'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send { friends : gplusfriends , automatching:true}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			print res.body
			done()


	it 'should list gamer friends', (done)->
		request(shuttle)
		.get '/v1/gamer/friends'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			#console.log res.body
			done()

	it "should delete anonymous user", (done)->
		this.timeout(4000)
		xtralife.api.onDeleteUser ObjectID(gamer_id), done, 'com.clanofthecloud.cloudbuilder'

