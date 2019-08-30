request = require 'supertest'
should = require 'should'

shuttlePromise = require '../src/http.coffee'

shuttle = null

require './00-config.coffee'

dataset = require './dataset.coffee'

email_id = null
email_token = null

xlenv.mailer = sendMail: (mail, cb)=> cb(null, {})

describe 'Short Login code', ->

	before 'should wait for initialisation', ->
		this.timeout 5000
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	shortcode = undefined

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

	it 'should register email gamer', (done)->

		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send { network : 'email' , id : 'devteam01@clanofthecloud.com', secret : 'password' }
		.expect 'content-type', /json/
		.end (err, res)->
			#console.log res.body
			res.body.should.have.property 'gamer_id'
			res.body.should.have.property 'gamer_secret'
			email_id = res.body.gamer_id
			email_token = res.body.gamer_secret
			done(err)
		null

	it 'should change the password and re-login', (done)->
		request(shuttle)
		.post '/v1/gamer/password'
		.set dataset.validAppCredentials
		.auth(email_id, email_token)
		.send { password : 'newpassword'}
		.expect 'content-type', /json/
		.end (err, res)->
			#console.log res.body
			res.body.should.have.property 'done'
			request(shuttle)
			.post '/v1/login'
			.set dataset.validAppCredentials
			.send { network : 'email' , id : 'devteam01@clanofthecloud.com', secret : 'newpassword' }
			.expect 'content-type', /json/
			.end (err, res)->
				#console.log res.body
				res.body.should.have.property 'gamer_id'
				res.body.should.have.property 'gamer_secret'
				done(err)
		null


	it 'should restore the password', (done)->
		request(shuttle)
		.post '/v1/gamer/password'
		.set dataset.validAppCredentials
		.auth(email_id, email_token)
		.send { password : 'password'}
		.expect 'content-type', /json/
		.end (err, res)->
			res.body.should.have.property 'done'
			done(err)
		null

	it 'should send an email', (done)->
		this.timeout(15000);

		request(shuttle)
		.post "/v1/login/devteam01@clanofthecloud.com"
		.set dataset.validAppCredentials
		.send { from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "You temporary code is [[SHORTCODE]] \nEnjoy." }
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property "done"
			done(err)
		null

	it 'should send an email with html', (done)->
		this.timeout(15000);
		request(shuttle)
		.post "/v1/login/devteam01@clanofthecloud.com"
		.set dataset.validAppCredentials
		.send { from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "You temporary code is [[SHORTCODE]] \nEnjoy.", html: "<h1>Hi!</h1> <p>You temporary code is <b>[[SHORTCODE]]<b> </p> <br /><p>Enjoy.</p>" }
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			should(err).be.null
			res.body.should.have.property "done"
			done(err)
		null

	it 'should return 400 in case of unknown email', (done)->
		request(shuttle)
		.get "/v1/login/devteamXXXX@clanofthecloud.com"
		.set dataset.validAppCredentials
		.send { from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "Your temporary code is [[SHORTCODE]] \nEnjoy." }
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done(err)
		null

	it 'should return 400 in case of missing SHORTCODE email', (done)->
		request(shuttle)
		.get "/v1/login/devteam@clanofthecloud.com"
		.set dataset.validAppCredentials
		.send { from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "Your temporary code \nEnjoy." }
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done(err)
		null


	it 'should create a login code', (done)->

		request(shuttle)
		.get '/v1/gamer/shortlogin'
		.set dataset.validAppCredentials
		.auth(email_id, email_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property "shortcode"
			shortcode = res.body.shortcode
			done(err)
		null

	it 'should login with code', (done)->
		#console.log {shortcode}
		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send { network: 'restore', id: '', secret : "#{shortcode}:password" }
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property 'gamer_id'
			res.body.should.have.property 'gamer_secret'
			res.body.should.have.property 'passwordChanged'
			done(err)
		null

	it 'login with same code should fail', (done)->
		request(shuttle)
		.post '/v1/login'
		.set dataset.validAppCredentials
		.send { network: 'restore', id: '', secret : shortcode }
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->			
			res.body.name.should.eql "BadToken"
			done(err)
		null

	it 'should fail to get code on bad domain', (done)->

		request(shuttle)
		.get '/v1/gamer/shortlogin/domaindoesnotexist'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.body.name.should.eql "InvalidDomain"
			done(err)
		null

	it 'should success to get code on owned domain with an expiry in 5"', (done)->

		this.timeout(15000);
		request(shuttle)
		.get '/v1/gamer/shortlogin/com.clanofthecloud.cloudbuilder.test?ttl=5'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done(err)
			res.body.should.have.property "shortcode"
			shortcode = res.body.shortcode

			setTimeout ->
				request(shuttle)
				.post '/v1/login'
				.set dataset.validAppCredentials
				.send { network: 'restore', id: '', secret : shortcode }
				.expect 'content-type', /json/
				.expect 400
				.end (err, res)->
					res.body.name.should.eql "BadToken"
					done(err)
			, 7*1000
		null


