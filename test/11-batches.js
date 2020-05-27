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

let gamer_id = null;
let gamer_token = null;

describe('Batches', function() {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before("should create an anonymous user", function(done){

		request(shuttle)
		.post('/v1/login/anonymous')
		.set(dataset.validAppCredentials)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			({
                gamer_id
            } = res.body);
			gamer_token = res.body.gamer_secret;
			return done();
		});
		return null;
	});

	it('should run a synchronous unauthenticated batch', function(done){
		request(shuttle)
		.post('/v1/batch/private/test1')
		.set(dataset.validAppCredentials)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.input.should.eql('hello');
			res.body.domain.should.eql('com.clanofthecloud.cloudbuilder.azerty');
			return done();
		});
		return null;
	});

	it('should run a synchronous authenticated batch', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/test2')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.userFound.should.eql(gamer_id);
			return done();
		});
		return null;
	});

	it('unauthenticated batch reports no user', function(done){
		request(shuttle)
		.post('/v1/batch/private/test2')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql({});
			return done();
		});
		return null;
	});

	it('should allow running an asynchronous gamer batch', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/test3')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql({ fs: {}, balance: {} });
			return done();
		});
		return null;
	});

	it('should not crash if batch doesnt compile', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/doesntcompile')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql({ name: 'HookError', message: 'Hook com.clanofthecloud.cloudbuilder.azerty/__doesntcompile does not exist' });
			return done();
		});
		return null;
	});

	it('should have access to common', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/usecommon')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql("itworks");
			return done();
		});
		return null;
	});

	it('should have access to mod in common', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/usecommon2')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({input: "hello"})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql("itworks");
			return done();
		});
		return null;
	});

	it('should add isSafe==false when calling a batch', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/hasIsSafe')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.isSafe.should.eql(false);
			return done();
		});
		return null;
	});

	it('should receive true when calling hasIsSafe indirectly', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/callsHasIsSafe')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.isSafe.should.eql(true);
			return done();
		});
		return null;
	});

	return it('should return explicit error if batch does not exist', function(done){
		request(shuttle)
		.post('/v1/gamer/batch/private/doesnotexist')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.eql({
				name: 'HookError',
				message: 'Hook com.clanofthecloud.cloudbuilder.azerty/__doesnotexist does not exist'
			});
			return done();
		});
		return null;
	});
});
