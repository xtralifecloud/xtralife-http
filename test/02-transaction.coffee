request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

describe 'Transactions', ->

	txHistory = null
	balance = null

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


	it 'should return the balance', (done)->
		request(shuttle)
		.get '/v1/gamer/tx/private/balance'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type 'json'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			balance = res.body
			done()

	it 'should list transactions before anything', (done)->
		request(shuttle)
		.get '/v1/gamer/tx/private?limit=9999'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type 'json'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			txHistory = res.body.history
			done()


	it 'should then send a transaction', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type 'json'
		.send
			transaction:
				Gold: 100
			description: 'Unit Testing transactions'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			oldBalance = balance
			balance = res.body
			balance.Gold.should.eql(unless oldBalance.Gold? then 100 else oldBalance.Gold+100)
			done()

	it 'should have updated the balance', (done)->
		request(shuttle)
		.get '/v1/gamer/tx/private/balance'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type 'json'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.Gold.should.eql(balance.Gold)
			done(err)


	it 'should zero the balance on Gold', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
			transaction:
				Gold: -balance.Gold
				Silver: 1
			description: 'Unit Testing transactions, Zeroing Gold'
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type 'json'
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			balance = res.body
			balance.Gold.should.eql(0)
			done()

	it 'should list transactions after everything', (done)->
		request(shuttle)
		.get '/v1/gamer/tx/private?limit=9999'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			newtxHistory = res.body.history
			newtxHistory.length.should.eql(txHistory.length + 2)
			done()

	it 'should page through lists of transactions', (done)->
		request(shuttle)
		.get '/v2.4/gamer/tx/private?skip=0&limit=10'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.count.should.eql txHistory.length + 2
			#res.body.history.length.should.eql(10) # doesn't work with empty db
			done()

	it 'should forbid illegal transactions', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
			transaction:
				Gold: -1
			description: 'Should not work, should not be logged'
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			if err? then return done err
			res.body.name.should.eql 'BalanceInsufficient'
			done()

	it 'should forbid string transactions', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
			transaction: "Gold: -1"
			description: 'Should not work, should not be logged'
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done()

	it 'should forbid invalid transactions format', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
			transaction:
				Gold: "-1"
			description: 'Should not work, should not be logged'
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done()


	it 'should list 2 transactions for a single currency', (done)->
		request(shuttle)
		.get '/v1/gamer/tx/private?unit=Silver&skip=0&limit=2'
		.set dataset.validAppCredentials
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			silvertxHistory = res.body.history
			silvertxHistory.length.should.be.lessThan(3)
			done()

	it 'should not allow transaction without transaction', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
			description: "should fail"
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			res.body.should.eql { name: 'BadArgument', message: 'A passed argument is invalid' }
			done(err)


	it 'should allow -auto transactions', (done)->
		request(shuttle)
		.post '/v1/gamer/tx/private'
		.set dataset.validAppCredentials
		.send
				transaction:
					Gold: '-auto'
				description: 'Reset Gold'
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.Gold.should.eql 0
			done(err)
