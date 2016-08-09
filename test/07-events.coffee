request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

Q = require 'bluebird'

gamer_id = null
gamer_token = null

describe 'Events', ->

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

	it "should fail if domain not enable for event ", (done)->

		request(shuttle)
		.get '/v1/gamer/event/com.clanofthecloud.cloudbuilder.test'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			res.body.name.should.eql('NoListenerOnDomain')
			done(err)

	it "should fail if domain not declared ", (done)->

		request(shuttle)
		.post "/v1/gamer/event/com.clanofthecloud.cloudbuilder.notdeclared/#{gamer_id}"
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send { type : "test" }
		.expect 'content-type', /json/
		.expect 404
		.end (err, res)->
			res.body.name.should.eql('InvalidDomain')
			done(err)

	it "should receive (autoack) then send", (done)->

		messageId = null

		request(shuttle)
		.get '/v1/gamer/event/private?ack=auto'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			res.body.id.should.eql messageId
			res.body.hello.should.eql 'world'
			res.status.should.eql 200
			if err? then return done(err)
			done()

		setTimeout ->
			request(shuttle)
			.post '/v1/gamer/event/private/'+gamer_id
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send {hello: 'world'}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				messageId = res.body.id
				if err? then return done(err)
		, 100

	it "volatile should receive (no ACK needed) then send", (done)->

		messageId = null

		request(shuttle)
		.get '/v1/gamer/event/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			should(res.body.id).eql undefined
			res.body.volatile.should.eql true
			res.body.from.should.eql "#{gamer_id}"
			res.body.hello.should.eql 'world'
			res.status.should.eql 200
			if err? then return done(err)
			done()

		setTimeout ->
			request(shuttle)
			.post '/v1/gamer/event/volatile/private/'+gamer_id
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send {hello: 'world'}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				messageId = res.body.id
				if err? then return done(err)
		, 100


	it "should receive twice if not acked", (done)->

		messageId = null

		request(shuttle)
		.post '/v1/gamer/event/private/'+gamer_id
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {hello: 'world'}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			messageId = res.body.id
			if err? then return done(err)

			request(shuttle)
			.get '/v1/gamer/event/private'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log res.body
				res.body.id.should.eql messageId
				res.body.hello.should.eql 'world'
				res.status.should.eql 200
				if err? then return done(err)

				request(shuttle)
				.get "/v1/gamer/event/private?ack=auto"
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					res.body.id.should.eql messageId
					res.body.hello.should.eql 'world'
					res.status.should.eql 200
					if err? then return done(err)
					done()

	it "should receive long sent message", (done)->

		messageId = null

		request(shuttle)
		.post '/v1/gamer/event/private/'+gamer_id
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {hello: 'world'}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			messageId = res.body.id
			if err? then return done(err)


		setTimeout ->
			request(shuttle)
			.get '/v1/gamer/event/private?ack=auto'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.id.should.eql messageId
				res.body.hello.should.eql 'world'
				res.status.should.eql 200
				if err? then return done(err)
				done()
		, 500

	it "should wait for a message", (done)->

		messageId = null

		request(shuttle)
		.get '/v1/gamer/event/private?timeout=500'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 204
		.end (err, res)->
			res.status.should.eql 204

			request(shuttle)
			.get '/v1/gamer/event/private?timeout=500&ack=auto'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.id.should.eql messageId
				res.body.hello.should.eql 'world'
				res.status.should.eql 200
				if err? then return done(err)
				done()

		setTimeout ->
			request(shuttle)
			.post '/v1/gamer/event/private/'+gamer_id
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send {hello: 'world'}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				messageId = res.body.id
				if err? then return done(err)
		, 600

	it 'should allow acking message', (done)->
		messageId = null

		# send message
		request(shuttle)
		.post '/v1/gamer/event/private/'+gamer_id
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {hello: 'ack me'}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			messageId = res.body.id
			if err? then return done(err)

			# get message without acking
			request(shuttle)
			.get '/v1/gamer/event/private'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.id.should.eql messageId
				res.body.hello.should.eql 'ack me'
				res.status.should.eql 200
				if err? then return done(err)

				# get again, but with acking : should block and return with 204
				request(shuttle)
				.get "/v1/gamer/event/private?timeout=500&ack=#{messageId}"
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.expect 204
				.end (err, res)->
					if err? then return done(err)
					done()

	it 'should work even when sending / receiving / acking 2 messages (double receive bug)', (done)->
		messageId = null

		#console.log 'POST first message'
		# send message
		request(shuttle)
		.post '/v1/gamer/event/private/'+gamer_id
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {hello: 'ack me'}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			messageId = res.body.id

			#console.log "GET first message"
			# get message without acking
			request(shuttle)
			.get '/v1/gamer/event/private?timeout=500'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.id.should.eql messageId
				res.body.hello.should.eql 'ack me'
				res.status.should.eql 200
				if err? then return done(err)

				#console.log "GET first message again"
				request(shuttle)
				.get '/v1/gamer/event/private?timeout=500'
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					res.body.id.should.eql messageId
					res.body.hello.should.eql 'ack me'
					res.status.should.eql 200

					# send second message
					#console.log 'POST second message'
					# send message
					request(shuttle)
					.post '/v1/gamer/event/private/'+gamer_id
					.set dataset.validAppCredentials
					.auth(gamer_id, gamer_token)
					.send {hello: 'ack me'}
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err
						second_messageId = res.body.id

						#console.log 'GET second message, ack first one'
						# ack & get again, for second message
						request(shuttle)
						.get "/v1/gamer/event/private?timeout=500&ack=#{messageId}"
						.set dataset.validAppCredentials
						.auth(gamer_id, gamer_token)
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							if err? then return done err

							#console.log 'GET next message, ack second one'
							# ack & get again : should block and return with 204
							request(shuttle)
							.get "/v1/gamer/event/private?timeout=500&ack=#{second_messageId}"
							.set dataset.validAppCredentials
							.auth(gamer_id, gamer_token)
							.expect 204
							.end (err, res)->
								if err? then return done err
								should(res.body).be.eql {}
								#console.log 'should have timedout after 500ms with a 204 status code'
								done()

	it "should not receive on private messages sent to another domain", (done)->

		count = 0
		ok = ->
			if ++count is 3 then done()

		request(shuttle)
		.get "/v1/gamer/event/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3?timeout=500&ack=auto"
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			#console.log res.body
			if err? then return done err
			ok()

		request(shuttle)
		.get "/v1/gamer/event/private?timeout=100"
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 204
		.end (err, res)->
			if err? then return done err
			res.statusCode.should.eql(204)
			ok()

		request(shuttle)
		.post '/v1/gamer/event/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/'+gamer_id
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.send {hello: 'ack me'}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err then return done err
			#console.log res.body
			ok()

	it "should allow sending message in batch, receive in REST api", (done)->
		request(shuttle)
		.get "/v1/gamer/event/private?timeout=500&ack=auto"
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/ # @chris: have a look?
		.expect 200
		.end (err, res)->
			if err? then return done err
			done()

		request(shuttle)
		.post '/v1/gamer/batch/private/sendEventTest'
		.set dataset.validAppCredentials
		.auth gamer_id, gamer_token
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			#console.log res.body
			if err? then return done err

