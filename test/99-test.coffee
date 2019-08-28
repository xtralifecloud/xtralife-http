request = require 'supertest'
should = require 'should'
async = require 'async'
util = require 'util'
ObjectID = require('mongodb').ObjectID
#agent = require 'superagent'

require './00-config.coffee'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

gamer_id = dataset.gamer_id 		#"541189411ea82ffa76b7b72a"
gamer_token = dataset.gamer_token 	#"c562a081f4a6bb24df29684635c354f1f86a0b76"

anonym_id = null
anonym_token = null

# Testing Gamer routes

describe 'UnitTest', ->

	before 'should wait for initialisation', (done)->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle
			done()
		.catch done
		.done()


	describe 'ping', ->
		it "should succes ping call", (done)->
			request(shuttle)
			.get '/v1/ping'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log res.body
				res.body.should.have.property 'utc'
				res.body.should.have.property 'tag'
				res.body.tag.should.eql('custom test tag')
				done err

	describe.skip 'create-delete users', ->

		it "should populate with temporary user", (done)->
			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				anonym_id = res.body.gamer_id
				anonym_token = res.body.gamer_secret
				#console.log "------- user_id is #{anonym_id}"
				#console.log "create a match"
				request(shuttle)
				.post '/v1/gamer/matches?domain=private'
				.set dataset.validAppCredentials
				.auth(anonym_id, anonym_token)
				.type 'json'
				.send
					description: "Sample match for testing"
					maxPlayers: 3
					customProperties: {type: "coop", other: "property"}
					shoe: [
						{prop1: {attr: 'value1'}}
						{prop2: 'value2'}
						{prop3: 'value3'}
						{prop4: 'value4'}
					]
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					#console.log "add a transaction"
					request(shuttle)
					.post '/v1/gamer/tx/private'
					.set dataset.validAppCredentials
					.auth(anonym_id, anonym_token)
					.type 'json'
					.send
						transaction:
							Gold: 100
						description: 'Unit Testing transactions'
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err
						#console.log "score in test"
						request(shuttle)
						.post '/v2.6/gamer/scores/private/test'
						.set dataset.validAppCredentials
						.auth(anonym_id, anonym_token)
						.send { score: 450, info: "this is a description"}
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							if err? then return done err
							#console.log "add a friend"
							request(shuttle)
							.post '/v2.6/gamer/friends/private/'+dataset.gamer_id+'?status=add'
							.set dataset.validAppCredentials
							.auth(anonym_id, anonym_token)
							.send {"en": "relation changed"}
							.expect 'content-type', /json/
							.expect 200
							.end (err, res)->
								if err? then return done err
								#console.log "write in S3"
								request(shuttle)
								.put '/v1/gamer/vfs/private/binTest?binary'
								.set dataset.validAppCredentials
								.auth(anonym_id, anonym_token)
								.set('Content-Type', 'application/json')
								.expect 'content-type', /json/
								.expect 200
								.end (err, res)->
									###
									string = "some data to write to s3"
									agent
									.put res.body.putURL
									.set('Content-Type', 'application/octet-stream')
									.set('Content-Length', Buffer.byteLength(string))
									.send string
									.end (err, res)->
										console.log res.error
									###
									done err

		it "should delete temporary users", (done)->
			xtralife = require 'xtralife-api'
			async = require 'async'
			this.timeout(4000)
			xtralife.api.onDeleteUser ObjectID(anonym_id), done, 'com.clanofthecloud.cloudbuilder'



	describe.skip 'all', ->
		it.skip 'should register email', (done)->
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'email', id : 'rolandvl@mac.com' , secret  : 'pass' }
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log res.body
				done(err)

		it "should login", (done)->
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'anonymous', id: gamer_id, secret: gamer_token}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				#console.log util.inspect(res.body, { depth: null, colors: true })
				done()

		it 'should get outline', (done)->
			request(shuttle)
			.get '/v1/gamer/outline'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log util.inspect(res.body, { depth: null, colors: true })
				done(err)

		it.skip 'should get outline flatten with domains', (done)->
			request(shuttle)
			.get '/v1/gamer/outline?flat&domains=com.clanofthecloud.cloudbuilder.test,com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log util.inspect(res.body, { depth: null, colors: true })
				done(err)

		it.skip "should send", (done)->
			this.timeout 30000
			request(shuttle)
			.post '/v1/gamer/event/private/'+dataset.friend_id
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send { type: "user", from:dataset.gamer_id,  event: 'hello world', osn : {en : "Hello you!", fr: "Salut !"}}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				messageId = res.body.id
				if err? then return done(err)

			setTimeout ->
				done()
			, 20000
