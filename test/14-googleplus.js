/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
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
const {
    ObjectId
} = require('mongodb');

let gamer_id = null;
let gamer_token = null;
let gplus_gamer_id = null;
let gplus_gamer_token = null;
const gplusfriends = {};

const print = function (obj) { };
//console.log require("util").inspect(obj, { showHidden: false, depth: 8, colors: true })

describe.skip('GooglePlus', function () {

    before('should wait for initialisation', () => shuttlePromise.then(_shuttle => shuttle = _shuttle));

    it("should create an anonymous user", done => request(shuttle)
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
        }));


    it('should login with googleplus', done => request(shuttle)
        .post('/v1/login')
        .set(dataset.validAppCredentials)
        .send({ network: 'googleplus', id: dataset.googleId, secret: dataset.googleToken })
        .expect('content-type', /json/)
        .end(function (err, res) {
            if (res.status === 401) {
                return done(new Error(("Check your Google token!")));
            } else {
                if (err != null) { return done(err); }
                res.body.gamer_id.should.not.be.undefined;
                res.body.gamer_secret.should.not.be.undefined;
                res.body.network.should.be.eql("googleplus");
                res.body.networkid.should.not.be.undefined;
                gplus_gamer_id = res.body.gamer_id;
                gplus_gamer_token = res.body.gamer_secret;
                // request google friends
                return request("https://www.googleapis.com")
                    .get('/plus/v1/people/me/people/visible')
                    .set({ Authorization: `Bearer ${dataset.googleToken}` })
                    .expect('content-type', /json/)
                    .end(function (err, res) {
                        if (err != null) { return done(err); }
                        res.body.items.should.not.be.undefined;
                        for (let each of Array.from(res.body.items)) {
                            gplusfriends[each.id] = each;
                        }
                        //console.log gplusfriends
                        return done();
                    });
            }
        }));

    it("should delete google user", function (done) {
        this.timeout(4000);
        return xtralife.api.onDeleteUser(new ObjectId(gplus_gamer_id), done, 'com.clanofthecloud.cloudbuilder');
    });


    it("should convert anonymous to googleplus", done => request(shuttle)
        .post('/v1/gamer/convert')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send({ network: 'googleplus', id: dataset.googleId, secret: dataset.googleToken })
        .expect('content-type', /json/)
        .end(function (err, res) {
            if (err != null) { return done(err); }
            return done();
        }));

    it('should list gamer friends', done => request(shuttle)
        .get('/v1/gamer/friends')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .expect('content-type', /json/)
        .expect(200)
        .end(function (err, res) {
            if (err != null) { return done(err); }
            //console.log res.body
            return done();
        }));

    it('should list gamer friends for googleplus (v1)', done => request(shuttle)
        .post('/v1/gamer/friends?network=googleplus')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send(gplusfriends)
        .expect('content-type', /json/)
        .expect(200)
        .end(function (err, res) {
            if (err != null) { return done(err); }
            print(res.body);
            return done();
        }));

    it('should list gamer friends for googleplus (v2.12)', done => request(shuttle)
        .post('/v2.12/gamer/friends/private?network=googleplus')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .send({ friends: gplusfriends, automatching: true })
        .expect('content-type', /json/)
        .expect(200)
        .end(function (err, res) {
            if (err != null) { return done(err); }
            print(res.body);
            return done();
        }));


    it('should list gamer friends', done => request(shuttle)
        .get('/v1/gamer/friends')
        .set(dataset.validAppCredentials)
        .auth(gamer_id, gamer_token)
        .expect('content-type', /json/)
        .expect(200)
        .end(function (err, res) {
            if (err != null) { return done(err); }
            //console.log res.body
            return done();
        }));

    return it("should delete anonymous user", function (done) {
        this.timeout(4000);
        return xtralife.api.onDeleteUser(new ObjectId(gamer_id), done, 'com.clanofthecloud.cloudbuilder');
    });
});

