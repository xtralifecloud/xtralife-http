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

const Q = require('bluebird');

let gamer_id = null;
let gamer_token = null;

describe('Events', function() {

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

	it("should fail if domain not enable for event ", function(done){

		request(shuttle)
		.get('/v1/gamer/event/com.clanofthecloud.cloudbuilder.test')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect('content-type', /json/)
		.expect(400)
		.end(function(err, res){
			res.body.name.should.eql('NoListenerOnDomain');
			return done(err);
		});
		return null;
	});

	it("should fail if domain not declared ", function(done){

		request(shuttle)
		.post(`/v1/gamer/event/com.clanofthecloud.cloudbuilder.notdeclared/${gamer_id}`)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({ type : "test" })
		.expect('content-type', /json/)
		.expect(404)
		.end(function(err, res){
			res.body.name.should.eql('InvalidDomain');
			return done(err);
		});
		return null;
	});

	it("should receive (autoack) then send", function(done){

		let messageId = null;

		request(shuttle)
		.get('/v1/gamer/event/private?ack=auto')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			res.body.id.should.eql(messageId);
			res.body.hello.should.eql('world');
			res.status.should.eql(200);
			if (err != null) { return done(err); }
			return done();
		});

		setTimeout(() => request(shuttle)
        .post('/v1/gamer/event/private/'+gamer_id)
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send({hello: 'world'})
        .expect('content-type', /json/)
        .expect(200)
        .end(function(err, res){
            messageId = res.body.id;
            if (err != null) { return done(err); }
        })
		, 100);
		return null;
	});

	it("volatile should receive (no ACK needed) then send", function(done){

		let messageId = null;

		request(shuttle)
		.get('/v1/gamer/event/private')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			should(res.body.id).eql(undefined);
			res.body.volatile.should.eql(true);
			res.body.from.should.eql(`${gamer_id}`);
			res.body.hello.should.eql('world');
			res.status.should.eql(200);
			if (err != null) { return done(err); }
			return done();
		});

		setTimeout(() => request(shuttle)
        .post('/v1/gamer/event/volatile/private/'+gamer_id)
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send({hello: 'world'})
        .expect('content-type', /json/)
        .expect(200)
        .end(function(err, res){
            messageId = res.body.id;
            if (err != null) { return done(err); }
        })
		, 100);
		return null;
	});


	it("should receive twice if not acked", function(done){

		let messageId = null;

		request(shuttle)
		.post('/v1/gamer/event/private/'+gamer_id)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({hello: 'world'})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			messageId = res.body.id;
			if (err != null) { return done(err); }

			return request(shuttle)
			.get('/v1/gamer/event/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				//console.log res.body
				res.body.id.should.eql(messageId);
				res.body.hello.should.eql('world');
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				return request(shuttle)
				.get("/v1/gamer/event/private?ack=auto")
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function(err, res){
					res.body.id.should.eql(messageId);
					res.body.hello.should.eql('world');
					res.status.should.eql(200);
					if (err != null) { return done(err); }
					return done();
				});
			});
		});
		return null;
	});

	it("should receive long sent message", function(done){

		let messageId = null;

		request(shuttle)
		.post('/v1/gamer/event/private/'+gamer_id)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({hello: 'world'})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			messageId = res.body.id;
			if (err != null) { return done(err); }
		});


		setTimeout(() => request(shuttle)
        .get('/v1/gamer/event/private?ack=auto')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .expect('content-type', /json/)
        .expect(200)
        .end(function(err, res){
            res.body.id.should.eql(messageId);
            res.body.hello.should.eql('world');
            res.status.should.eql(200);
            if (err != null) { return done(err); }
            return done();
        })
		, 500);
		return null;
	});

	it("should wait for a message", function(done){

		let messageId = null;

		request(shuttle)
		.get('/v1/gamer/event/private?timeout=500')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect(204)
		.end(function(err, res){
			res.status.should.eql(204);

			return request(shuttle)
			.get('/v1/gamer/event/private?timeout=500&ack=auto')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				res.body.id.should.eql(messageId);
				res.body.hello.should.eql('world');
				res.status.should.eql(200);
				if (err != null) { return done(err); }
				return done();
			});
		});

		setTimeout(() => request(shuttle)
        .post('/v1/gamer/event/private/'+gamer_id)
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send({hello: 'world'})
        .expect('content-type', /json/)
        .expect(200)
        .end(function(err, res){
            messageId = res.body.id;
            if (err != null) { return done(err); }
        })
		, 600);
		return null;
	});

	it('should allow acking message', function(done){
		let messageId = null;

		// send message
		request(shuttle)
		.post('/v1/gamer/event/private/'+gamer_id)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({hello: 'ack me'})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			messageId = res.body.id;
			if (err != null) { return done(err); }

			// get message without acking
			return request(shuttle)
			.get('/v1/gamer/event/private')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				res.body.id.should.eql(messageId);
				res.body.hello.should.eql('ack me');
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				// get again, but with acking : should block and return with 204
				return request(shuttle)
				.get(`/v1/gamer/event/private?timeout=500&ack=${messageId}`)
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect(204)
				.end(function(err, res){
					if (err != null) { return done(err); }
					return done();
				});
			});
		});
		return null;
	});

	it('should work even when sending / receiving / acking 2 messages (double receive bug)', function(done){
		let messageId = null;

		//console.log 'POST first message'
		// send message
		request(shuttle)
		.post('/v1/gamer/event/private/'+gamer_id)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({hello: 'ack me'})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			messageId = res.body.id;

			//console.log "GET first message"
			// get message without acking
			return request(shuttle)
			.get('/v1/gamer/event/private?timeout=500')
			.set(dataset.validAppCredentials)
			.auth(gamer_id, gamer_token)
			.expect('content-type', /json/)
			.expect(200)
			.end(function(err, res){
				res.body.id.should.eql(messageId);
				res.body.hello.should.eql('ack me');
				res.status.should.eql(200);
				if (err != null) { return done(err); }

				//console.log "GET first message again"
				return request(shuttle)
				.get('/v1/gamer/event/private?timeout=500')
				.set(dataset.validAppCredentials)
				.auth(gamer_id, gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function(err, res){
					if (err != null) { return done(err); }
					res.body.id.should.eql(messageId);
					res.body.hello.should.eql('ack me');
					res.status.should.eql(200);

					// send second message
					//console.log 'POST second message'
					// send message
					return request(shuttle)
					.post('/v1/gamer/event/private/'+gamer_id)
					.set(dataset.validAppCredentials)
					.auth(gamer_id, gamer_token)
					.send({hello: 'ack me'})
					.expect('content-type', /json/)
					.expect(200)
					.end(function(err, res){
						if (err != null) { return done(err); }
						const second_messageId = res.body.id;

						//console.log 'GET second message, ack first one'
						// ack & get again, for second message
						return request(shuttle)
						.get(`/v1/gamer/event/private?timeout=500&ack=${messageId}`)
						.set(dataset.validAppCredentials)
						.auth(gamer_id, gamer_token)
						.expect('content-type', /json/)
						.expect(200)
						.end(function(err, res){
							if (err != null) { return done(err); }

							//console.log 'GET next message, ack second one'
							// ack & get again : should block and return with 204
							return request(shuttle)
							.get(`/v1/gamer/event/private?timeout=500&ack=${second_messageId}`)
							.set(dataset.validAppCredentials)
							.auth(gamer_id, gamer_token)
							.expect(204)
							.end(function(err, res){
								if (err != null) { return done(err); }
								should(res.body).be.eql({});
								//console.log 'should have timedout after 500ms with a 204 status code'
								return done();
							});
						});
					});
				});
			});
		});
		return null;
	});

	it("should not receive on private messages sent to another domain", function(done){

		let count = 0;
		const ok = function() {
			if (++count === 3) { return done(); }
		};

		request(shuttle)
		.get("/v1/gamer/event/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3?timeout=500&ack=auto")
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			//console.log res.body
			if (err != null) { return done(err); }
			return ok();
		});

		request(shuttle)
		.get("/v1/gamer/event/private?timeout=100")
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect(204)
		.end(function(err, res){
			if (err != null) { return done(err); }
			res.statusCode.should.eql(204);
			return ok();
		});

		request(shuttle)
		.post('/v1/gamer/event/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/'+gamer_id)
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.send({hello: 'ack me'})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			if (err) { return done(err); }
			//console.log res.body
			return ok();
		});
		return null;
	});

	return it("should allow sending message in batch, receive in REST api", function(done){
		request(shuttle)
		.get("/v1/gamer/event/private?timeout=500&ack=auto")
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.expect('content-type', /json/) // @chris: have a look?
		.expect(200)
		.end(function(err, res){
			if (err != null) { return done(err); }
			return done();
		});

		request(shuttle)
		.post('/v1/gamer/batch/private/sendEventTest')
		.set(dataset.validAppCredentials)
		.auth(gamer_id, gamer_token)
		.type('json')
		.send({})
		.expect('content-type', /json/)
		.expect(200)
		.end(function(err, res){
			//console.log res.body
			if (err != null) { return done(err); }
		});
		return null;
	});
});

