request = require 'supertest'
should = require 'should'
shuttlePromise = require '../src/http.coffee'
shuttle = null

require './00-config.coffee'
dataset = require './dataset.coffee'
ObjectID = require('mongodb').ObjectID

print = (obj)->
	return
	#console.log require("util").inspect(obj, { showHidden: false, depth: 8, colors: true })

describe 'App Authentication', ->

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
		null
		
	# Test App credentials

	it 'should reject missing app creds', (done)->

		request(shuttle)
		.post '/v1/login'
		.expect 'content-type', /json/
		.expect 401
		.end (err, res)->
			#console.log res.body
			res.body.name.should.eql('InvalidAppAuthenticationError')
			done(err)
		null

	it 'should reject invalid app creds', (done)->

		wrongAppCredentials = {'x-apikey': 'hello', 'x-apisecret': 'world'}

		request(shuttle)
		.post '/v1/login'
		.set wrongAppCredentials
		.expect 'content-type', /json/
		.expect 401
		.end (err, res)->
			res.body.name.should.eql('InvalidAppAuthenticationError')
			done(err)
		null

	# Test Anonymous login
	describe "Anonymous login", ->

		it 'should reject missing network', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				res.body.name.should.eql('LoginError')
				res.body.message.should.eql('Invalid Gamer Credentials (unknown network)')
				done(err)
			null

		it 'should reject missing id', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'facebook'}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				res.body.name.should.eql('LoginError')
				res.body.message.should.eql('Invalid user credentials')
				done(err)
			null

		it 'should reject missing secret', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'facebook', id: 'any'}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				res.body.name.should.eql('LoginError')
				res.body.message.should.eql('Invalid user credentials')
				done(err)
			null

		it 'should register anonymous gamer', (done)->

			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				print res.body
				res.body.should.have.property 'gamer_id'
				res.body.should.have.property 'gamer_secret'
				done(err)
			null

		it 'should accept anonymous gamer creds', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'anonymous', id: dataset.gamer_id, secret: dataset.gamer_token}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				print res.body
				res.body.should.have.property 'gamer_id'
				res.body.should.have.property 'gamer_secret'
				res.body.gamer_id.should.eql(dataset.gamer_id)
				res.body.gamer_secret.should.eql(dataset.gamer_token)
				done(err)
			null

		it 'should accept anonymous gamer creds then batch', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'anonymous', id: dataset.gamer_id, secret: dataset.gamer_token, thenBatch : {name:"login", domain : "com.clanofthecloud.cloudbuilder.azerty", params: { contest: "Silver"} }}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				print res.body
				res.body.should.have.property 'gamer_id'
				res.body.should.have.property 'gamer_secret'
				res.body.gamer_id.should.eql(dataset.gamer_id)
				res.body.gamer_secret.should.eql(dataset.gamer_token)
				done(err)
			null


		it 'should reject wrong anonymous gamer creds', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'anonymous',  id: dataset.gamer_id, secret: 'this is wrong'}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				if err? then return done(err)
				res.body.name.should.eql("LoginError")
				res.body.message.should.eql('Invalid user credentials')
				done(err)
			null

		it 'should convert anonymous account to e-mail', (done)->
			# Create anonymous account
			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				id = res.body.gamer_id
				secret = res.body.gamer_secret

				# Convert to e-mail
				creds = {network: "email", id: "dummy" + new ObjectID() + "@localhost.localdomain", secret: "passwd"}
				request(shuttle)
				.post '/v1/gamer/convert'
				.set dataset.validAppCredentials
				.auth(id, secret)
				.send creds
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					return done err if err?
					res.body.done.should.eql 1

					# Then we should be able to log by e-mail
					request(shuttle)
					.post '/v1/login'
					.set dataset.validAppCredentials
					.send creds
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						done err
			null

	# Testing Facebook Login (will work only with valid token)
	describe 'Facebook login', ->

		it 'should reject wrong facebook gamer creds', (done)->
			this.timeout 5000

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'facebook', id:'wrong', secret: 'wrong'}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				#console.log err
				if err? then return done(err)
				res.body.name.should.eql('InvalidLoginTokenError')
				done(err)
			null

		it.skip 'should accept valid facebook token regardless of id, and unlink from facebook', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'facebook', id:'any will do', secret: dataset.facebookToken}
			.expect 'content-type', /json/
			.end (err, res)->
				if res.status == 401
					done(new Error ("Check your Facebook token!"))
				else
					#console.log res.body
					res.body.gamer_id.should.not.be.undefined
					res.body.gamer_secret.should.not.be.undefined
					res.body.network.should.be.eql("facebook")
					res.body.networkid.should.not.be.undefined
					done(err)
			null

		it.skip 'user should link to facebook, then unlink', (done)->

			request(shuttle)
			.post '/v1/gamer/link'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send {network: 'facebook', id:'any will do', secret: dataset.facebookToken}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done(err) if err?
				request(shuttle)
				.post '/v1/gamer/unlink'
				.set dataset.validAppCredentials
				.auth(dataset.gamer_id, dataset.gamer_token)
				.send {network: 'facebook'}
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					done(err)
			null

		it.skip 'should convert anonymous account to facebook', (done)->
			# Create anonymous account
			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				id = res.body.gamer_id
				secret = res.body.gamer_secret

				# Convert to e-mail
				creds = {network: "facebook", id: "dummy" + new ObjectID(), secret: dataset.facebookToken}
				request(shuttle)
				.post '/v1/gamer/convert'
				.set dataset.validAppCredentials
				.auth(id, secret)
				.send creds
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					return done err if err?
					res.body.done.should.eql 1

					# Then we should be able to log by e-mail
					request(shuttle)
					.post '/v1/login'
					.set dataset.validAppCredentials
					.send creds
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						done err
			null

	# Testing Google Login (will work only with valid token)
	describe 'Google login', ->

		it 'should reject wrong google gamer creds', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'googleplus', id:'wrong', secret: 'wrong'}
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				if err? then return done(err)

				res.body.name.should.eql('InvalidLoginTokenError')
				done(err)
			null

		it.skip 'should accept valid google token regardless of id', (done)->

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'googleplus', id:'any will do', secret: dataset.googleToken}
			.expect 'content-type', /json/
			.end (err, res)->
				if res.status == 401
					done(new Error ("Check your Google token!"))
				else
					#console.log res.body
					if err? then return done(err)
					res.body.gamer_id.should.not.be.undefined
					res.body.gamer_secret.should.not.be.undefined
					res.body.network.should.be.eql("googleplus")
					res.body.networkid.should.not.be.undefined
					done(err)
			null


		it.skip 'user should link to google, then unlink', (done)->

			request(shuttle)
			.post '/v1/gamer/link'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send {network: 'googleplus', id:'any will do', secret: dataset.googleToken}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				#console.log res.body
				request(shuttle)
				.post '/v1/gamer/unlink'
				.set dataset.validAppCredentials
				.auth res.body.gamer_id, res.body.gamer_secret
				.send {network: 'googleplus'}
				.expect 'content-type', /json/
				.end (err, res)->
					done(err)
			null

		it.skip 'should convert anonymous account to googleplus', (done)->
			# Create anonymous account
			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				id = res.body.gamer_id
				secret = res.body.gamer_secret

				# Convert to e-mail
				creds = {network: "googleplus", id: "dummy" + new ObjectID(), secret: dataset.googleToken}
				request(shuttle)
				.post '/v1/gamer/convert'
				.set dataset.validAppCredentials
				.auth(id, secret)
				.send creds
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					return done err if err?
					res.body.done.should.eql 1

					# Then we should be able to log by e-mail
					request(shuttle)
					.post '/v1/login'
					.set dataset.validAppCredentials
					.send creds
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						done err
			null

	describe "Game Center login", ()=>
		it 'should connect with good creds', (done)=>
			auth = {
				bundleId: "cloud.xtralife.gamecenterauth"
				playerId: "G:1965586982"
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer"
				salt: "NRRF0g=="
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g=="
				timestamp: 1565253768519
			}

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth)}
			.expect 'content-type', /json/
			.end (err, res)->
				if err? then return done(err)
				res.body.gamer_id.should.not.be.undefined
				res.body.gamer_secret.should.not.be.undefined
				res.body.network.should.be.eql("gamecenter")
				res.body.networkid.should.be.eql(auth.playerId)
				done(err)
			null

		it 'should fail for bad bundleId', (done)=>
			auth = {
				bundleId: "cloud.xtralife.badBundleId"
				playerId: "G:1965586982"
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer"
				salt: "NRRF0g=="
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g=="
				timestamp: 1565253768519
			}

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth)}
			.expect 'content-type', /json/
			.end (err, res)->
				res.body.name.should.eql("GameCenterLoginError")
				res.body.message.should.eql("Invalid bundleId")
				done()
			null

		it 'should fail for bad signature', (done)=>
			auth = {
				bundleId: "cloud.xtralife.gamecenterauth"
				playerId: "G:1965586982 modified"
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer"
				salt: "NRRF0g=="
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g=="
				timestamp: 1565253768519
			}

			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth)}
			.expect 'content-type', /json/
			.end (err, res)->
				res.body.name.should.eql("GameCenterLoginError")
				res.body.message.should.eql("Invalid Signature")
				done()
			null

	# Testing Custom Network Login
	describe.skip 'Custom Network login', ->

		it 'should connect with good creds', (done)->
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'external:customNetwork', id:'good', secret: 'good'}
			.expect 'content-type', /json/
			.end (err, res)->
				if err? then return done(err)
				res.body.gamer_id.should.not.be.undefined
				res.body.gamer_secret.should.not.be.undefined
				res.body.network.should.be.eql("customNetwork")
				res.body.networkid.should.not.be.undefined
				done(err)
			null

		it 'should not connect with bad creds', (done)->
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'external:customNetwork', id:'good', secret: 'bad'}
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadUserCredentials')
				done(err)
			null

		it 'should not connect with bad custom Name', (done)->
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send {network: 'external:Unknown', id:'good', secret: 'good'}
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('HookError')
				done(err)
			null


	# Testing Gamer authentication
	describe 'Gamer authentication', ->

		it 'should not allow wrong gamer_id in basic auth', (done)->

			request(shuttle)
			.post '/v1/gamer/logout'
			.set dataset.validAppCredentials
			.auth('wrowsdfqsdf<wxvcwsdgsergdfhwdvqsdf sqfcqsfcZERS H QERCDze sdd vqdt vqegqe gng', 'wrong')
			.expect 'content-type', /json/
			.expect 401
			.end (err, res)->
				done(err)
			null


		it 'should not allow wrong gamer_secret in basic auth', (done)->

			request(shuttle)
			.post '/v1/gamer/logout'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, 'wrong')
			.expect 'content-type', /json/
			.expect 401
			.end done
			null

		it 'should not allow wrong basic auth', (done)->

			request(shuttle)
			.post '/v1/gamer/logout'
			.set dataset.validAppCredentials
			.auth('536cf67b2a4d430000a6b9aa', dataset.gamer_token) # 536cf67b2a4d430000a6b9aa is wrong
			.expect 'content-type', /json/
			.expect 401
			.end done
			null

	# Testing Logout
	describe 'Logout', ->

		it 'should allow logout', (done)->

			request(shuttle)
			.post '/v1/gamer/logout'
			.set dataset.validAppCredentials
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.eql({})
				done()
			null

		it 'should allow check user while logged out', (done)->

			request(shuttle)
			.get "/v1/users/gamer_id/#{dataset.gamer_id}"
			.set dataset.validAppCredentials
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				print res.body
				done()
			null
