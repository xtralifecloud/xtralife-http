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

// Testing Gamer routes

describe('Properties', function() {

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

	before("should create a friend", function(done){
		request(shuttle)
		.post('/v1/login/anonymous')
		.set(dataset.validAppCredentials)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			dataset.friend_id = res.body.gamer_id;
			dataset.friend_token = res.body.gamer_secret;
			return done();
		});
		return null;
	});

	describe('Failure', function() {

		it('set objet property should fail', function(done){

			request(shuttle)
			.post('/v1/gamer/property/object')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : { field : 12, otherfield: "test" } })
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				res.body.name.should.eql('BadPropertyType');
				return done(err);
			});
			return null;
		});

		it('set array of objets property should fail', function(done){

			request(shuttle)
			.post('/v1/gamer/property/arrayobject')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : [{ field : 12 }, { field : 12 }] })
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				res.body.name.should.eql('BadPropertyType');
				return done(err);
			});
			return null;
		});

		it('missing value should fail', function(done){

			request(shuttle)
			.post('/v1/gamer/property/miss')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send("value")
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				res.body.name.should.eql('MissingPropertyValue');
				return done(err);
			});
			return null;
		});

		return it('change all properties with objetcs should fail', function(done){

			request(shuttle)
			.post('/v1/gamer/property')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ board: "round", level : 30 , invalid : { test : "test"} })
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				res.body.name.should.eql('BadPropertyType');
				return done();
			});
			return null;
		});
	});


	return describe('Success', function() {

		it('set string property should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/property/board')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : "cube" })
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				return done();
			});
			return null;
		});

		it('get property should sucess', function(done){

			request(shuttle)
			.get('/v1/gamer/property/board')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.properties.should.have.property("board");
				res.body.properties.board.should.be.eql("cube");
				return done();
			});
			return null;
		});

		it('set number property should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/property/level')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : 10 })
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				return done();
			});
			return null;
		});

		it('set boolean property should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/property/enable')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : true })
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				return done();
			});
			return null;
		});

		it('set array property should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/property/data')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ value : [ 1, 2, 3] })
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				return done();
			});
			return null;
		});

		it('get all property should sucess', function(done){

			request(shuttle)
			.get('/v1/gamer/property')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("properties");
				res.body.properties.should.containEql({ board : "cube"});
				res.body.properties.should.containEql({ level : 10 });
				return done();
			});
			return null;
		});

		it('change all properties should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/property')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ board: "square", level : 20 })
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				return done();
			});
			return null;
		});

		it('find user who match properties', function(done){

			request(shuttle)
			.get('/v1/gamer/matchproperties')
			.set(dataset.validAppCredentials)
			.auth(dataset.friend_id, dataset.friend_token)
			.send({ level : { '$gt' : 10 } })
			.expect('content-type', /json/)
			.expect(410)
			.end((err, res) => done());
			return null;
		});

		it('find should fail on bad query', function(done){

			request(shuttle)
			.get('/v1/gamer/matchproperties')
			.set(dataset.validAppCredentials)
			.auth(dataset.friend_id, dataset.friend_token)
			.send({ level : { '$dt' : 10 } })
			.expect('content-type', /json/)
			.expect(410)
			.end((err, res) => done());
			return null;
		});


		it('vefify all properties should sucess', function(done){

			request(shuttle)
			.get('/v1/gamer/property')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("properties");
				res.body.properties.should.containEql({ board : "square"});
				res.body.properties.should.containEql({ level : 20});
				return done();
			});
			return null;
		});

		it('del property should sucess', function(done){

			request(shuttle)
			.delete('/v1/gamer/property/board')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				res.body.done.should.eql(1);
				return done();
			});
			return null;
		});

		return it('del properties should sucess', function(done){

			request(shuttle)
			.delete('/v1/gamer/property')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("done");
				res.body.done.should.eql(1);
				return done();
			});
			return null;
		});
	});
});

