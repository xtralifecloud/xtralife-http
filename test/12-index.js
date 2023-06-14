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
const xtralife = require('xtralife-api');

const isElasticDriverBelow8 = parseInt(xlenv.elastic.driver.version.split('.')[0]) < 8;
let gamer_id = null;
let gamer_token = null;

describe('Index', function () {

	before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

	before("should create an anonymous user", function (done) {

		request(shuttle)
			.post('/v1/login/anonymous')
			.set(dataset.validAppCredentials)
			.type('json')
			.send({})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				({
					gamer_id
				} = res.body);
				gamer_token = res.body.gamer_secret;
				return done();
			});
		return null;
	});

	it("should index a document", function (done) {

		request(shuttle)
			.post('/v1/index/private/test')
			.set(dataset.validAppCredentials)
			.send({
				id: gamer_id,
				properties: {
					a: 1,
					b: 2,
					token: gamer_token
				}, // used to have a singleton
				payload: { string: "this is from our unit tests" }
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				(isElasticDriverBelow8 ? res.body.body : res.body).result.should.eql("created");
				return done(err);
			});
		return null;
	});

	it('should get the indexed document', function (done) {
		request(shuttle)
			.get(`/v1/index/private/test/${gamer_id}`)
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.found.should.eql(true);
				res.body._id.should.eql(gamer_id);
				res.body._source.a.should.eql(1);
				res.body._source.b.should.eql(2);
				return done(err);
			});
		return null;
	});

	it("should index a document with / in the id", function (done) {

		request(shuttle)
			.post('/v1/index/private/test')
			.set(dataset.validAppCredentials)
			.send({
				id: `${gamer_id}/with_a_slash`,
				properties: {},
				payload: { string: "this is from our unit tests" }
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				(isElasticDriverBelow8 ? res.body.body : res.body).result.should.eql("created");
				return done(err);
			});
		return null;
	});

	it('should get and delete the indexed document with / in the id', function (done) {
		request(shuttle)
			.get(`/v1/index/private/test/${gamer_id}/with_a_slash`)
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.found.should.eql(true);
				res.body._id.should.eql(`${gamer_id}/with_a_slash`);
				return request(shuttle)
					.delete(`/v1/index/private/test/${gamer_id}/with_a_slash`)
					.set(dataset.validAppCredentials)
					.send({
						id: gamer_id
					})
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						(isElasticDriverBelow8 ? res.body.body : res.body).result.should.eql("deleted");
						return done();
					});
			});

		return null;
	});


	it('should report missing document', function (done) {
		request(shuttle)
			.get("/v1/index/private/test/missing_document_id")
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(404)
			.end((err, res) => done(err));
		return null;
	});

	it('should allow searching all entries and get max limit entries', function (done) {

		request(shuttle)
			.post('/v1/index/private/test/search?max=5&q=*')
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				should((res.body.hits.length > 0) && (res.body.hits.length <= 5));
				return done(err);
			});
		return null;
	});

	it('should allow searching entries by value', function (done) {

		request(shuttle)
			.post(`/v1/index/private/test/search?max=50&q=token:${gamer_token}`)
			.set(dataset.validAppCredentials)
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.hits.length.should.eql(1);
				res.body.hits[0]._id.should.eql(gamer_id);
				res.body.hits[0]._source.payload.should.eql({ string: 'this is from our unit tests' });
				return done(err);
			});
		return null;
	});

	it('should allow querying by body', function (done) {

		request(shuttle)
			.post("/v1/index/private/test/search?max=50")
			.set(dataset.validAppCredentials)
			.send({
				query: {
					term: {
						token: gamer_token
					}
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.hits.length.should.eql(1);
				res.body.hits[0]._id.should.eql(gamer_id);
				res.body.hits[0]._source.payload.should.eql({ string: 'this is from our unit tests' });
				return done(err);
			});
		return null;
	});

	it('should allow querying inexistant document', function (done) {

		request(shuttle)
			.post("/v1/index/private/test/search?max=50")
			.set(dataset.validAppCredentials)
			.send({
				query: {
					term: {
						token: 'doesnt exist'
					}
				}
			}).expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				res.body.hits.length.should.eql(0);
				return done(err);
			});
		return null;
	});


	it("should overwrite a document", function (done) {

		request(shuttle)
			.post('/v1/index/private/test')
			.set(dataset.validAppCredentials)
			.send({
				id: gamer_id,
				properties: {
					a: 2,
					b: 1,
					token: gamer_token
				}, // used to have a singleton
				payload: { string: "this is still from our unit tests" }
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				(isElasticDriverBelow8 ? res.body.body : res.body).result.should.eql("updated");

				return request(shuttle)
					.post(`/v1/index/private/test/search?max=50&q=token:${gamer_token}`)
					.set(dataset.validAppCredentials)
					.expect('content-type', /json/)
					.expect(200)
					.end(function (err, res) {
						if (err != null) { return done(err); }
						res.body.hits.length.should.eql(1);
						res.body.hits[0]._id.should.eql(gamer_id);
						res.body.hits[0]._source.payload.should.eql({ string: 'this is still from our unit tests' });
						return done(err);
					});
			});
		return null;
	});


	// skip it, to let the db grow...
	return it("should delete a document", function (done) {

		request(shuttle)
			.delete(`/v1/index/private/test/${gamer_id}`)
			.set(dataset.validAppCredentials)
			.send({
				id: gamer_id
			})
			.expect('content-type', /json/)
			.expect(200)
			.end(function (err, res) {
				if (err != null) { return done(err); }
				(isElasticDriverBelow8 ? res.body.body : res.body).result.should.eql("deleted");
				return done();
			});
		return null;
	});
});
