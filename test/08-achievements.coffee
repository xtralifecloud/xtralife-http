request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'
ObjectID = require('mongodb').ObjectID

Q = require 'bluebird'

# These will be filled when the test user is created
gamer_id = null
gamer_token = null

describe 'Achievements', ->

	before 'should wait for initialisation', ->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

	it "should create an anonymous user just for achievements", (done)->

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
		null

	it "should reset key/value for a user with -auto", (done)->

		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
				transaction:
					score: "-auto"
				description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			#console.log res.body
			res.body.balance.score.should.eql(0)
			res.body.achievements.should.eql({})
			done()
		null

	it "should increment key/value for a user", (done)->

		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				score: 100
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.balance.score.should.eql(100)
			res.body.achievements.should.eql({})
			done()
		null

	# This time do not check for achievements (old call)
	it "should decrement key/value for a user", (done)->

		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				score: -40
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.score.should.eql(60)
			should(res.body.achievements).be.undefined
			done()
		null

	it "should add an achievement", (done)->
		xtralife = require 'xtralife-api'

		definitions =
		testOnce:
			type: 'limit'
			config:
				maxValue: 1000
				unit: 'score'
			gameData:
				hidden: true
		testMultiple:
			type: 'limit'
			config:
				maxValue: 10
				maxTriggerCount: 2
				unit: 'kills'
		testWithTx:
			type: 'limit'
			config:
				maxValue: 100
				maxTriggerCount: -1
				unit: 'gold'
				rewardTx:
					gold: -40
		recursionTestA:
			type: 'limit'
			config:
				maxValue: 10
				maxTriggerCount: -1
				unit: 'a'
				rewardTx:
					a: "-auto"
					b: 10
		recursionTestB:
			type: 'limit'
			config:
				maxValue: 10
				maxTriggerCount: -1
				unit: 'b'
				rewardTx:
					b: "-auto"
					a: 10

		xtralife.api.achievement.saveAchievementsDefinitions 'com.clanofthecloud.cloudbuilder.azerty',definitions
		.then (result)-> done()
		.catch done
		.done()
		null

	it "should list achievements for the user even before having set gamer data", (done)->

		request(shuttle)
		.get '/v1/gamer/achievements/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.achievements.testOnce.progress.should.eql(0.06)
			done()
		null

	it "should add gamer data to achievement", (done)->
		request(shuttle)
		.post '/v1/gamer/achievements/private/testOnce/gamerdata'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			test: "data"
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.achievement.gamerData.test.should.eql('data')
			done()
		null

	it "should modify gamer data of achievement", (done)->
		request(shuttle)
		.post '/v1/gamer/achievements/private/testOnce/gamerdata'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			aKey: "aData"
			otherKey: "newData"
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.exist(res.body.achievement.gamerData.test)
			res.body.achievement.gamerData.aKey.should.eql('aData')
			res.body.achievement.gamerData.otherKey.should.eql('newData')
			done()
		null

	it "should show gamer data in achievements", (done)->

		request(shuttle)
		.get '/v1/gamer/achievements/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.achievements.testOnce.gamerData.aKey.should.eql('aData')
			done()
		null

	it "should retrieve gamer data", (done)->

		request(shuttle)
		.get '/v1/gamer/achievements/private/testOnce/gamerdata'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.gamerData.otherKey.should.eql('newData')
			done()
		null

	it "should list empty achievements for the user", (done)->

		request(shuttle)
		.get '/v1/gamer/achievements/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.achievements.testOnce.progress.should.eql(0.06)
			done()
		null

	it "should complete achievement for a user", (done)->

		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				score: 940
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.balance.score.should.eql(1000)
			# We should have one entry: the achievement just triggered
			# Verify that it is enriched as well ;)
			res.body.achievements.testOnce.progress.should.eql(1)
			done()
		null

	it "should not complete achievement twice", (done)->

		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				score: "-auto"
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->

			request(shuttle)
			.post '/v2.2/gamer/tx/private'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.send
				transaction:
					score: 1050
				description: 'Unit Testing achievements'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.balance.score.should.eql(1050)
				res.body.achievements.should.eql({})
				done()
		null

	it "should be able to complete achievement twice for a user", (done)->

		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				kills: 10
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			should.exist(res.body.achievements.testMultiple)

			# Now let's reset it
			request(shuttle)
			.post '/v2.2/gamer/tx/private'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.send
				transaction:
					kills: "-auto"
				description: 'Unit Testing achievements'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.achievements.should.eql({})

				# Now trigger it again
				request(shuttle)
				.post '/v2.2/gamer/tx/private'
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.type 'json'
				.send
					transaction:
						kills: 10
					description: 'Unit Testing achievements'
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err
					should.exist(res.body.achievements.testMultiple)
					done()
		null

	it "should not be able to complete achievement more times than allowed", (done)->

		# Reset it from previous test
		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
				transaction:
					kills: "-auto"
				description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.achievements.should.eql({})

			# Now trigger it again
			request(shuttle)
			.post '/v2.2/gamer/tx/private'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.send
				transaction:
					kills: 10
				description: 'Unit Testing achievements'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.achievements.should.eql({})
				done()
		null

	it "should run an associated transaction", (done)->

		# Reset it from previous test
		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				gold: 100
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			# Achievement should have been triggered
			should.exist(res.body.achievements.testWithTx)
			# And it should have affected the actual gold, which should go from the directed 100 to 60
			res.body.balance.gold.should.eql(60)
			done()
		null

	it "should prevent recursion in reward transactions", (done)->

		# Reset it from previous test
		request(shuttle)
		.post '/v2.2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				a: 10
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			# The first achievement shall be triggered, but not the second one (wanted limitation)
			should.exist(res.body.achievements.recursionTestA)
			should.not.exist(res.body.achievements.recursionTestB)
			# Only the code in recursionTestA's rewardTx should have been executed
			res.body.balance.a.should.eql(0)
			res.body.balance.b.should.eql(10)
			done()
		null

	it "should refuse an invalid API version", (done)->

		# Reset it from previous test
		request(shuttle)
		.post '/v2/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
			transaction:
				a: 10
			description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done(err)
		null

	it "should mark an old API as obsolete", (done)->

		# Reset it from previous test
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send
				transaction:
					a: 10
				description: 'Unit Testing achievements'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.get('X-Obsolete').should.eql('true')
			done()
		null

	it.skip "should reset achievements (works in DEV mode only)", (done)->
		# Reset it from previous test
		request(shuttle)
		.post '/v1/gamer/achievements/private/reset'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			done(err)
		null

	it "should delete the temporary user", (done)->
		xtralife = require 'xtralife-api'
		xtralife.api.onDeleteUser ObjectID(gamer_id), done, 'com.clanofthecloud.cloudbuilder'
		return null
