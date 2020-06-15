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
const {
	ObjectID
} = require('mongodb');

const print = function (obj) {
};
//console.log require("util").inspect(obj, { showHidden: false, depth: 8, colors: true })

describe('App Authentication', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before("should create a user", function (done) {
		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				dataset.gamer_id = res.body.gamer_id;
				dataset.gamer_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	// Test App credentials

	it('should reject missing app creds', function (done) {

		request(shuttle)
			.post('/v1/login')
			.expect('content-type', /json/)
			.expect(401)
			.end(function (err, res) {
				//console.log res.body
				res.body.name.should.eql('InvalidAppAuthenticationError');
				return done(err);
			});
		return null;
	});

	it('should reject invalid app creds', function (done) {

		const wrongAppCredentials = { 'x-apikey': 'hello', 'x-apisecret': 'world' };

		request(shuttle)
			.post('/v1/login')
			.set(wrongAppCredentials)
			.expect('content-type', /json/)
			.expect(401)
			.end(function (err, res) {
				res.body.name.should.eql('InvalidAppAuthenticationError');
				return done(err);
			});
		return null;
	});

	// Test Anonymous login
	describe("Anonymous login", function () {

		it('should reject missing network', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({})
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					res.body.name.should.eql('LoginError');
					res.body.message.should.eql('Invalid Gamer Credentials (unknown network)');
					return done(err);
				});
			return null;
		});

		it('should reject missing id', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'facebook' })
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					res.body.name.should.eql('LoginError');
					res.body.message.should.eql('Invalid user credentials');
					return done(err);
				});
			return null;
		});

		it('should reject missing secret', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'facebook', id: 'any' })
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					res.body.name.should.eql('LoginError');
					res.body.message.should.eql('Invalid user credentials');
					return done(err);
				});
			return null;
		});

		it('should register anonymous gamer', function (done) {

			request(shuttle)
				.post('/v1/login/anonymous')
				.set(dataset.validAppCredentials)
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					print(res.body);
					res.body.should.have.property('gamer_id');
					res.body.should.have.property('gamer_secret');
					return done(err);
				});
			return null;
		});

		it('should accept anonymous gamer creds', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'anonymous', id: dataset.gamer_id, secret: dataset.gamer_token })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					print(res.body);
					res.body.should.have.property('gamer_id');
					res.body.should.have.property('gamer_secret');
					res.body.gamer_id.should.eql(dataset.gamer_id);
					res.body.gamer_secret.should.eql(dataset.gamer_token);
					return done(err);
				});
			return null;
		});

		it('should accept anonymous gamer creds then batch', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'anonymous', id: dataset.gamer_id, secret: dataset.gamer_token, thenBatch: { name: "login", domain: "com.clanofthecloud.cloudbuilder.azerty", params: { contest: "Silver" } } })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					print(res.body);
					res.body.should.have.property('gamer_id');
					res.body.should.have.property('gamer_secret');
					res.body.gamer_id.should.eql(dataset.gamer_id);
					res.body.gamer_secret.should.eql(dataset.gamer_token);
					return done(err);
				});
			return null;
		});


		it('should reject wrong anonymous gamer creds', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'anonymous', id: dataset.gamer_id, secret: 'this is wrong' })
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.name.should.eql("LoginError");
					res.body.message.should.eql('Invalid user credentials');
					return done(err);
				});
			return null;
		});

		return it('should convert anonymous account to e-mail', function (done) {
			// Create anonymous account
			request(shuttle)
				.post('/v1/login/anonymous')
				.set(dataset.validAppCredentials)
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					const id = res.body.gamer_id;
					const secret = res.body.gamer_secret;

					// Convert to e-mail
					const creds = { network: "email", id: "dummy" + new ObjectID() + "@localhost.localdomain", secret: "passwd" };
					return request(shuttle)
						.post('/v1/gamer/convert')
						.set(dataset.validAppCredentials)
						.auth(id, secret)
						.send(creds)
						.expect('content-type', /json/)
						.expect(200)
						.end(function (err, res) {
							if (err != null) { return done(err); }
							res.body.done.should.eql(1);

							// Then we should be able to log by e-mail
							return request(shuttle)
								.post('/v1/login')
								.set(dataset.validAppCredentials)
								.send(creds)
								.expect('content-type', /json/)
								.expect(200)
								.end((err, res) => done(err));
						});
				});
			return null;
		});
	});

	// Testing Facebook Login (will work only with valid token)
	describe('Facebook login', function () {

		it('should reject wrong facebook gamer creds', function (done) {
			this.timeout(5000);

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'facebook', id: 'wrong', secret: 'wrong' })
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					//console.log err
					if (err != null) { return done(err); }
					res.body.name.should.eql('InvalidLoginTokenError');
					return done(err);
				});
			return null;
		});

		it.skip('should accept valid facebook token regardless of id, and unlink from facebook', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'facebook', id: 'any will do', secret: dataset.facebookToken })
				.expect('content-type', /json/)
				.end(function (err, res) {
					if (res.status === 401) {
						return done(new Error(("Check your Facebook token!")));
					} else {
						//console.log res.body
						res.body.gamer_id.should.not.be.undefined;
						res.body.gamer_secret.should.not.be.undefined;
						res.body.network.should.be.eql("facebook");
						res.body.networkid.should.not.be.undefined;
						return done(err);
					}
				});
			return null;
		});

		it.skip('user should link to facebook, then unlink', function (done) {

			request(shuttle)
				.post('/v1/gamer/link')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.send({ network: 'facebook', id: 'any will do', secret: dataset.facebookToken })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					return request(shuttle)
						.post('/v1/gamer/unlink')
						.set(dataset.validAppCredentials)
						.auth(dataset.gamer_id, dataset.gamer_token)
						.send({ network: 'facebook' })
						.expect('content-type', /json/)
						.expect(200)
						.end((err, res) => done(err));
				});
			return null;
		});

		return it.skip('should convert anonymous account to facebook', function (done) {
			// Create anonymous account
			request(shuttle)
				.post('/v1/login/anonymous')
				.set(dataset.validAppCredentials)
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					const id = res.body.gamer_id;
					const secret = res.body.gamer_secret;

					// Convert to e-mail
					const creds = { network: "facebook", id: "dummy" + new ObjectID(), secret: dataset.facebookToken };
					return request(shuttle)
						.post('/v1/gamer/convert')
						.set(dataset.validAppCredentials)
						.auth(id, secret)
						.send(creds)
						.expect('content-type', /json/)
						.expect(200)
						.end(function (err, res) {
							if (err != null) { return done(err); }
							res.body.done.should.eql(1);

							// Then we should be able to log by e-mail
							return request(shuttle)
								.post('/v1/login')
								.set(dataset.validAppCredentials)
								.send(creds)
								.expect('content-type', /json/)
								.expect(200)
								.end((err, res) => done(err));
						});
				});
			return null;
		});
	});

	// Testing Google Login (will work only with valid token)
	describe('Google login', function () {

		it.skip('should reject wrong google gamer creds', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'googleplus', id: 'wrong', secret: 'wrong' })
				.expect('content-type', /json/)
				.expect(401)
				.end(function (err, res) {
					if (err != null) { return done(err); }

					res.body.name.should.eql('InvalidLoginTokenError');
					return done(err);
				});
			return null;
		});

		it.skip('should accept valid google token regardless of id', function (done) {

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'googleplus', id: 'any will do', secret: dataset.googleToken })
				.expect('content-type', /json/)
				.end(function (err, res) {
					if (res.status === 401) {
						return done(new Error(("Check your Google token!")));
					} else {
						//console.log res.body
						if (err != null) { return done(err); }
						res.body.gamer_id.should.not.be.undefined;
						res.body.gamer_secret.should.not.be.undefined;
						res.body.network.should.be.eql("googleplus");
						res.body.networkid.should.not.be.undefined;
						return done(err);
					}
				});
			return null;
		});


		it.skip('user should link to google, then unlink', function (done) {

			request(shuttle)
				.post('/v1/gamer/link')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.send({ network: 'googleplus', id: 'any will do', secret: dataset.googleToken })
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					//console.log res.body
					return request(shuttle)
						.post('/v1/gamer/unlink')
						.set(dataset.validAppCredentials)
						.auth(res.body.gamer_id, res.body.gamer_secret)
						.send({ network: 'googleplus' })
						.expect('content-type', /json/)
						.end((err, res) => done(err));
				});
			return null;
		});

		return it.skip('should convert anonymous account to googleplus', function (done) {
			// Create anonymous account
			request(shuttle)
				.post('/v1/login/anonymous')
				.set(dataset.validAppCredentials)
				.send({})
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					const id = res.body.gamer_id;
					const secret = res.body.gamer_secret;

					// Convert to e-mail
					const creds = { network: "googleplus", id: "dummy" + new ObjectID(), secret: dataset.googleToken };
					return request(shuttle)
						.post('/v1/gamer/convert')
						.set(dataset.validAppCredentials)
						.auth(id, secret)
						.send(creds)
						.expect('content-type', /json/)
						.expect(200)
						.end(function (err, res) {
							if (err != null) { return done(err); }
							res.body.done.should.eql(1);

							// Then we should be able to log by e-mail
							return request(shuttle)
								.post('/v1/login')
								.set(dataset.validAppCredentials)
								.send(creds)
								.expect('content-type', /json/)
								.expect(200)
								.end((err, res) => done(err));
						});
				});
			return null;
		});
	});

	describe("Game Center login", () => {
		it('should connect with good creds', done => {
			const auth = {
				bundleId: "cloud.xtralife.gamecenterauth",
				playerId: "G:1965586982",
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer",
				salt: "NRRF0g==",
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g==",
				timestamp: 1565253768519
			};

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth) })
				.expect('content-type', /json/)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.gamer_id.should.not.be.undefined;
					res.body.gamer_secret.should.not.be.undefined;
					res.body.network.should.be.eql("gamecenter");
					res.body.networkid.should.be.eql(auth.playerId);
					return done(err);
				});
			return null;
		});

		it('should fail for bad bundleId', done => {
			const auth = {
				bundleId: "cloud.xtralife.badBundleId",
				playerId: "G:1965586982",
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer",
				salt: "NRRF0g==",
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g==",
				timestamp: 1565253768519
			};

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth) })
				.expect('content-type', /json/)
				.end(function (err, res) {
					res.body.name.should.eql("GameCenterLoginError");
					res.body.message.should.eql("Invalid bundleId");
					return done();
				});
			return null;
		});

		return it('should fail for bad signature', done => {
			const auth = {
				bundleId: "cloud.xtralife.gamecenterauth",
				playerId: "G:1965586982 modified",
				publicKeyUrl: "https://static.gc.apple.com/public-key/gc-prod-4.cer",
				salt: "NRRF0g==",
				signature: "cf6d+TOnCFABj1+CT5dS4H7zU+xgCgos9gI3TsqcHyl7Q73UZHkdeAEM+Lq4zXtMOz14ieK5AhxorjkrxCnotH7JLMQhdGwyM11PIsA4Yugu+Vm9RqvY6HuAsNKpdIn1XvyIKwff7vXpCWwfbk6r8Idy8kHnAAOgCUxwE9vLXYGVov6KTDjrjM1LggvYjCY7cvPB8AjhPsA28GkIMZD04JSZEpZAAwTJCiDCwPoyZxBUciIe5NUOSboWZP8CjmNUB5WFl4Fwean4Vi0a8+tr1/UZdfUsB4eTqXoQOv6zgmvFjIU+XQ7gGGEUDbtJrc+LInXouN4nLNAY0cD4ItgA3g==",
				timestamp: 1565253768519
			};

			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'gamecenter', id: auth.playerId, secret: JSON.stringify(auth) })
				.expect('content-type', /json/)
				.end(function (err, res) {
					res.body.name.should.eql("GameCenterLoginError");
					res.body.message.should.eql("Invalid Signature");
					return done();
				});
			return null;
		});
	});

	// Testing Custom Network Login
	describe.skip('Custom Network login', function () {

		it('should connect with good creds', function (done) {
			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'external:customNetwork', id: 'good', secret: 'good' })
				.expect('content-type', /json/)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.gamer_id.should.not.be.undefined;
					res.body.gamer_secret.should.not.be.undefined;
					res.body.network.should.be.eql("customNetwork");
					res.body.networkid.should.not.be.undefined;
					return done(err);
				});
			return null;
		});

		it('should not connect with bad creds', function (done) {
			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'external:customNetwork', id: 'good', secret: 'bad' })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('BadUserCredentials');
					return done(err);
				});
			return null;
		});

		return it('should not connect with bad custom Name', function (done) {
			request(shuttle)
				.post('/v1/login')
				.set(dataset.validAppCredentials)
				.send({ network: 'external:Unknown', id: 'good', secret: 'good' })
				.expect('content-type', /json/)
				.expect(400)
				.end(function (err, res) {
					res.body.name.should.eql('HookError');
					return done(err);
				});
			return null;
		});
	});


	// Testing Gamer authentication
	describe('Gamer authentication', function () {

		it('should not allow wrong gamer_id in basic auth', function (done) {

			request(shuttle)
				.post('/v1/gamer/logout')
				.set(dataset.validAppCredentials)
				.auth('wrowsdfqsdf<wxvcwsdgsergdfhwdvqsdf sqfcqsfcZERS H QERCDze sdd vqdt vqegqe gng', 'wrong')
				.expect('content-type', /json/)
				.expect(401)
				.end((err, res) => done(err));
			return null;
		});


		it('should not allow wrong gamer_secret in basic auth', function (done) {

			request(shuttle)
				.post('/v1/gamer/logout')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, 'wrong')
				.expect('content-type', /json/)
				.expect(401)
				.end(done);
			return null;
		});

		return it('should not allow wrong basic auth', function (done) {

			request(shuttle)
				.post('/v1/gamer/logout')
				.set(dataset.validAppCredentials)
				.auth('536cf67b2a4d430000a6b9aa', dataset.gamer_token) // 536cf67b2a4d430000a6b9aa is wrong
				.expect('content-type', /json/)
				.expect(401)
				.end(done);
			return null;
		});
	});

	// Testing Logout
	return describe('Logout', function () {

		it('should allow logout', function (done) {

			request(shuttle)
				.post('/v1/gamer/logout')
				.set(dataset.validAppCredentials)
				.auth(dataset.gamer_id, dataset.gamer_token)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					res.body.should.eql({});
					return done();
				});
			return null;
		});

		return it('should allow check user while logged out', function (done) {

			request(shuttle)
				.get(`/v1/users/gamer_id/${dataset.gamer_id}`)
				.set(dataset.validAppCredentials)
				.expect('content-type', /json/)
				.expect(200)
				.end(function (err, res) {
					if (err != null) { return done(err); }
					print(res.body);
					return done();
				});
			return null;
		});
	});
});
