/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');

let shuttle = null;
const shuttlePromise = require('../src/http.js');

const dataset = require('./dataset.js');

describe('Transactions', function() {

	let txHistory = null;
	let balance = null;

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before("should create a user", function(done){
		request(shuttle)
		.post('/v1/login/anonymous')
		.set(dataset.validAppCredentials)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			dataset.gamer_id = res.body.gamer_id;
			dataset.gamer_token = res.body.gamer_secret;
			return done();
		});
		return null;
	});

	it('should return the balance', function(done){
		request(shuttle)
		.get('/v1/gamer/tx/private/balance')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type('json')
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			balance = res.body;
			return done();
		});
		return null;
	});

	it('should list transactions before anything', function(done){
		request(shuttle)
		.get('/v1/gamer/tx/private?limit=9999')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type('json')
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			txHistory = res.body.history;
			return done();
		});
		return null;
	});


	it('should then send a transaction', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type('json')
		.send({
			transaction: {
				Gold: 100
			},
			description: 'Unit Testing transactions'}).expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			const oldBalance = balance;
			balance = res.body;
			balance.Gold.should.eql((oldBalance.Gold == null) ? 100 : oldBalance.Gold+100);
			return done();
		});
		return null;
	});

	it('should have updated the balance', function(done){
		request(shuttle)
		.get('/v1/gamer/tx/private/balance')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.type('json')
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.Gold.should.eql(balance.Gold);
			return done(err);
		});
		return null;
	});


	it('should zero the balance on Gold', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
			transaction: {
				Gold: -balance.Gold,
				Silver: 1
			},
			description: 'Unit Testing transactions, Zeroing Gold'}).auth(dataset.gamer_id, dataset.gamer_token)
		.type('json')
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			balance = res.body;
			balance.Gold.should.eql(0);
			return done();
		});
		return null;
	});

	it('should list transactions after everything', function(done){
		request(shuttle)
		.get('/v1/gamer/tx/private?limit=9999')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			const newtxHistory = res.body.history;
			newtxHistory.length.should.eql(txHistory.length + 2);
			return done();
		});
		return null;
	});

	it('should page through lists of transactions', function(done){
		request(shuttle)
		.get('/v2.4/gamer/tx/private?skip=0&limit=10')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.count.should.eql(txHistory.length + 2);
			//res.body.history.length.should.eql(10) # doesn't work with empty db
			return done();
		});
		return null;
	});

	it('should forbid illegal transactions', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
			transaction: {
				Gold: -1
			},
			description: 'Should not work, should not be logged'}).auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.name.should.eql('BalanceInsufficient');
			return done();
		});
		return null;
	});

	it('should forbid string transactions', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
			transaction: "Gold: -1",
			description: 'Should not work, should not be logged'}).auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(400)
		.end((err, res) => done());
		return null;
	});

	it('should forbid invalid transactions format', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
			transaction: {
				Gold: "-1"
			},
			description: 'Should not work, should not be logged'}).auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(400)
		.end((err, res) => done());
		return null;
	});


	it('should list 2 transactions for a single currency', function(done){
		request(shuttle)
		.get('/v1/gamer/tx/private?unit=Silver&skip=0&limit=2')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			const silvertxHistory = res.body.history;
			silvertxHistory.length.should.be.lessThan(3);
			return done();
		});
		return null;
	});

	it('should not allow transaction without transaction', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
			description: "should fail"})
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){
			res.body.should.eql({ name: 'PreconditionError', message: 'Incorrect parameters (transaction must be a valid transaction)' });
			return done(err);
		});
		return null;
	});


	return it('should allow -auto transactions', function(done){
		request(shuttle)
		.post('/v1/gamer/tx/private')
		.set(dataset.validAppCredentials)
		.send({
				transaction: {
					Gold: '-auto'
				},
				description: 'Reset Gold'}).auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.Gold.should.eql(0);
			return done(err);
		});
		return null;
	});
});
