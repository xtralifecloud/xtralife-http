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
gplusfriends = 
	"571377632" : 
		name: "Michael El Baki"
		id: "571377632"
		firstName: 'Michael'
		lastName: 'Baki'
	"100005995985880":
		name: "Roro Leheros"
		id: "100005995985880"
		firstName: 'Roro'
		lastName: 'Leheros'


print = (obj)->
	#console.log require("util").inspect(obj, { showHidden: false, depth: 8, colors: true })

describe.skip 'Facebook', ->

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

	it 'should login with facebook for friend', (done)->

		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send {network: 'facebook', id:"", secret: dataset.facebookTokenFriend}
		.expect 'content-type', /json/
		.end (err, res)->
			if res.status == 401
				done(new Error ("Check your Facebook token!"))
			else
				if err? then return done(err)
				done()

	it 'should login with facebook', (done)->

		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send {network: 'facebook', id:"", secret: dataset.facebookToken}
		.expect 'content-type', /json/
		.end (err, res)->
			if res.status == 401
				done(new Error ("Check your Facebook token!"))
			else
				if err? then return done(err)
				res.body.gamer_id.should.not.be.undefined
				res.body.gamer_secret.should.not.be.undefined
				res.body.network.should.be.eql("facebook")
				res.body.networkid.should.not.be.undefined
				gplus_gamer_id = res.body.gamer_id
				gplus_gamer_token = res.body.gamer_secret
				done()

	it "should delete facebook user", (done)->
		this.timeout(4000)
		xtralife.api.onDeleteUser ObjectID(gplus_gamer_id), done


	it "should convert anonymous to facebook", (done)->
		request(shuttle)
		.post '/v1/gamer/convert'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {network: 'facebook', id:"", secret: dataset.facebookToken}
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

	it 'should list gamer friends for facebook (v1)', (done)->
		request(shuttle)
		.post '/v1/gamer/friends?network=facebook'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send gplusfriends
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			print res.body
			done()

	it 'should list gamer friends for facebook (v2.12)', (done)->
		request(shuttle)
		.post '/v2.12/gamer/friends/private?network=facebook'
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
		xtralife.api.onDeleteUser ObjectID(gamer_id), done

