/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require('supertest');
const should = require('should');

const shuttlePromise = require('../src/http.js');

let shuttle = null;

require('./00-config.js');

const dataset = require('./dataset.js');

let email_id = null;
let email_token = null;

xlenv.mailer = {sendMail: (mail, cb)=> cb(null, {})};

describe('Short Login code', function() {

	before('should wait for initialisation', function() {
		this.timeout(5000);
		return shuttlePromise.then(_shuttle => shuttle = _shuttle);
	});

	let shortcode = undefined;

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

	it('should register email gamer', function(done){

		request(shuttle)
		.post('/v1/login')
		.set(dataset.validAppCredentials)
		.send({ network : 'email' , id : 'devteam01@clanofthecloud.com', secret : 'password' })
		.expect('content-type', /json/)
		.end(function(err, res){
			//console.log res.body
			res.body.should.have.property('gamer_id');
			res.body.should.have.property('gamer_secret');
			email_id = res.body.gamer_id;
			email_token = res.body.gamer_secret;
			return done(err);
		});
		return null;
	});

	it('should change the password and re-login', function(done){
		request(shuttle)
		.post('/v1/gamer/password')
		.set(dataset.validAppCredentials)
		.auth(email_id, email_token)
		.send({ password : 'newpassword'})
		.expect('content-type', /json/)
		.end(function(err, res){
			//console.log res.body
			res.body.should.have.property('done');
			return request(shuttle)
			.post('/v1/login')
			.set(dataset.validAppCredentials)
			.send({ network : 'email' , id : 'devteam01@clanofthecloud.com', secret : 'newpassword' })
			.expect('content-type', /json/)
			.end(function(err, res){
				//console.log res.body
				res.body.should.have.property('gamer_id');
				res.body.should.have.property('gamer_secret');
				return done(err);
			});
		});
		return null;
	});


	it('should restore the password', function(done){
		request(shuttle)
		.post('/v1/gamer/password')
		.set(dataset.validAppCredentials)
		.auth(email_id, email_token)
		.send({ password : 'password'})
		.expect('content-type', /json/)
		.end(function(err, res){
			res.body.should.have.property('done');
			return done(err);
		});
		return null;
	});

	it('should send an email', function(done){
		this.timeout(15000);

		request(shuttle)
		.post("/v1/login/devteam01@clanofthecloud.com")
		.set(dataset.validAppCredentials)
		.send({ from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "You temporary code is [[SHORTCODE]] \nEnjoy." })
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.have.property("done");
			return done(err);
		});
		return null;
	});

	it('should send an email with html', function(done){
		this.timeout(15000);
		request(shuttle)
		.post("/v1/login/devteam01@clanofthecloud.com")
		.set(dataset.validAppCredentials)
		.send({ from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "You temporary code is [[SHORTCODE]] \nEnjoy.", html: "<h1>Hi!</h1> <p>You temporary code is <b>[[SHORTCODE]]<b> </p> <br /><p>Enjoy.</p>" })
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			should(err).be.null;
			res.body.should.have.property("done");
			return done(err);
		});
		return null;
	});

	it('should return 400 in case of unknown email', function(done){
		request(shuttle)
		.get("/v1/login/devteamXXXX@clanofthecloud.com")
		.set(dataset.validAppCredentials)
		.send({ from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "Your temporary code is [[SHORTCODE]] \nEnjoy." })
		.expect('content-type', /json/)
		.expect(400)
		.end((err, res) => done(err));
		return null;
	});

	it('should return 400 in case of missing SHORTCODE email', function(done){
		request(shuttle)
		.get("/v1/login/devteam@clanofthecloud.com")
		.set(dataset.validAppCredentials)
		.send({ from: "noreply@clanofthecloud.com", title : "Here are your credentials", body : "Your temporary code \nEnjoy." })
		.expect('content-type', /json/)
		.expect(400)
		.end((err, res) => done(err));
		return null;
	});


	it('should create a login code', function(done){

		request(shuttle)
		.get('/v1/gamer/shortlogin')
		.set(dataset.validAppCredentials)
		.auth(email_id, email_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.have.property("shortcode");
			({
                shortcode
            } = res.body);
			return done(err);
		});
		return null;
	});

	it('should login with code', function(done){
		//console.log {shortcode}
		request(shuttle)
		.post('/v1/login')
		.set(dataset.validAppCredentials)
		.send({ network: 'restore', id: '', secret : `${shortcode}:password` })
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.have.property('gamer_id');
			res.body.should.have.property('gamer_secret');
			res.body.should.have.property('passwordChanged');
			return done(err);
		});
		return null;
	});

	it('login with same code should fail', function(done){
		request(shuttle)
		.post('/v1/login')
		.set(dataset.validAppCredentials)
		.send({ network: 'restore', id: '', secret : shortcode })
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){			
			res.body.name.should.eql("BadToken");
			return done(err);
		});
		return null;
	});

	it('should fail to get code on bad domain', function(done){

		request(shuttle)
		.get('/v1/gamer/shortlogin/domaindoesnotexist')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(404)
		.end(function(err, res){
			res.body.name.should.eql("InvalidDomain");
			return done(err);
		});
		return null;
	});

	return it('should success to get code on owned domain with an expiry in 5"', function(done){

		this.timeout(15000);
		request(shuttle)
		.get('/v1/gamer/shortlogin/com.clanofthecloud.cloudbuilder.test?ttl=5')
		.set(dataset.validAppCredentials)
		.auth(dataset.gamer_id, dataset.gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.body.should.have.property("shortcode");
			({
                shortcode
            } = res.body);

			return setTimeout(() => request(shuttle)
            .post('/v1/login')
            .set(dataset.validAppCredentials)
            .send({ network: 'restore', id: '', secret : shortcode })
            .expect('content-type', /json/)
            .expect(400)
            .end(function(err, res){
                res.body.name.should.eql("BadToken");
                return done(err);
            })
			, 7*1000);
		});
		return null;
	});
});


