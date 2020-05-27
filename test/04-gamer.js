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

describe('Gamers', function() {

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

	describe('Profile', function() {

		it('set addr1 to profile should sucess', function(done){

			request(shuttle)
			.post('/v1/gamer/profile')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.send({ "addr1" : "rue condorcet, Paris"})
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property('profile');
				res.body.profile.should.containDeep({"addr1" : "rue condorcet, Paris"});
				return done();
			});
			return null;
		});

		return it('get profile should sucess', function(done){

			request(shuttle)
			.get('/v1/gamer/profile')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.containDeep({"addr1" : "rue condorcet, Paris"});
				return done();
			});
			return null;
		});
	});

	describe('Search', function() {

		let networkid = null;

		it('bad method should fail', function(done){

			request(shuttle)
			.get(`/v1/gamer/whatever/${dataset.friend_id}`)
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				res.body.name.should.eql('InvalidOption');
				return done();
			});
			return null;
		});

		it('get existing gamer_id should sucess', function(done){

			request(shuttle)
			.get(`/v1/gamer/gamer_id/${dataset.friend_id}`)
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){

				// save networkid for later
				({
                    networkid
                } = res.body);

				if (err != null) { return done(err); }
				res.body.should.have.property("_id");
				return done();
			});
			return null;
		});

		it('get non existing gamer_id should fail', function(done){

			request(shuttle)
			.get("/v1/gamer/gamer_id/whatever")
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(533)
			.end(function(err, res){
				res.body.name.should.eql('BadGamerID');
				return done();
			});
			return null;
		});

		it('get existing network_id should sucess', function(done){

			const id = networkid;

			request(shuttle)
			.get(`/v1/gamer/anonymous/${id}`)
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("_id");
				return done();
			});
			return null;
		});

		it('get non existing network_id should fail', function(done){

			request(shuttle)
			.get('/v1/gamer/anonymous/whatever')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(400)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.name.should.eql('BadGamerID');
				return done();
			});
			return null;
		});

		return it('get displayName containing "Guest" should sucess', function(done){

			request(shuttle)
			.get('/v1/gamer?q=Guest&skip=2&limit=2')
			.set(dataset.validAppCredentials)
			.auth(dataset.gamer_id, dataset.gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				if (err != null) { return done(err); }
				res.body.should.have.property("count");
				return done();
			});
			return null;
		});
	});

	return describe('GDPR user nuking', () => it('should create a guinee pig and nuke it', done=> {
        request(shuttle)
        .post('/v1/login/anonymous')
        .set(dataset.validAppCredentials)
        .type('json')
        .send({})
        .expect('content-type', /json/)
        .expect(200)
        .end(function(err, res){
            should(err).be.null;
            const {
                gamer_id
            } = res.body;
            const gamer_token = res.body.gamer_secret;

            return request(shuttle)
            .post('/v1/gamer/nuke/me')
            .set(dataset.validAppCredentials)
            .auth(gamer_id, gamer_token)
            .type('json')
            .send({})
            .expect('content-type', /json/)
            .expect(200)
            .end(function(err, res){
                res.body.nuked.should.eql(true);

                // same call, should fail for bad auth, missing user
                return request(shuttle)
                .post('/v1/gamer/nuke/me')
                .set(dataset.validAppCredentials)
                .auth(gamer_id, gamer_token)
                .type('json')
                .send({})
                .expect('content-type', /json/)
                .expect(200)
                .end(function(err, res){
                    res.status.should.eql(401);
                    res.body.name.should.eql('InvalidLoginTokenError');
                    return done();
                });
            });
        });
        return null;
    }));
});


