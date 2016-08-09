request = require 'supertest'
should = require 'should'
async = require 'async'
util = require "util"
rs = require "randomstring"
ObjectID = require('mongodb').ObjectID

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'

# Testing Gamer routes
gamer_id = null
gamer_token = null
friend_id = null
friend_token = null

gamers_id=[]
gamers_token=[]

print = (obj)->
	#console.log util.inspect(obj, { showHidden: false, depth: 8, colors: true })


describe 'Leaderboards', ->

	before 'should wait for initialisation', (done)->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle

			request(shuttle)
			.post '/v1/login/anonymous'
			.set dataset.validAppCredentials
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				gamer_id = res.body.gamer_id
				gamer_token = res.body.gamer_secret

				request(shuttle)
				.put '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/key1'
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
				.send { value : "value of gamer key1" }
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done err

					request(shuttle)
					.post '/v1/login/anonymous'
					.set dataset.validAppCredentials
					.type 'json'
					.send {}
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err
						friend_id = res.body.gamer_id
						friend_token = res.body.gamer_secret

						request(shuttle)
						.put '/v1/gamer/vfs/com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3/key1'
						.set dataset.validAppCredentials
						.auth(friend_id, friend_token)
						.send { value : "value of friend key1"}
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							done err

		.catch done
		return null

	describe 'Success', ->


		it 'gamer should be able to score in <easy>', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/easyboard'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 500, info: "this is a description"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				if res.body.done == 1
					res.body.should.have.property "rank"
				done(err)

		it 'should allow bestscores in batch', (done)->
			request(shuttle)
			.post '/v1/gamer/batch/private/bestscoresInBatch'
			.set dataset.validAppCredentials
			.auth gamer_id, gamer_token
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.should.have.property 'easyboard'
				res.body.easyboard.score.should.eql 500
				done()

		it 'should allow highscore in batch', (done)->
			request(shuttle)
			.post '/v1/gamer/batch/private/highscoreInBatch'
			.set dataset.validAppCredentials
			.auth gamer_id, gamer_token
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.should.have.property 'easyboard'
				done()

		it 'should allow centered score in batch', (done)->
			request(shuttle)
			.post '/v1/gamer/batch/private/centeredScoreInBatch'
			.set dataset.validAppCredentials
			.auth gamer_id, gamer_token
			.type 'json'
			.send {}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done err
				res.body.should.have.property 'easyboard'
				done()


		it 'gamer should not be able to score a lower score in <easy>', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/easyboard'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 90, info: "this is a description"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				res.body.should.have.property "done"
				res.body.done.should.eql 0
				done(err)

		it 'gamer should be able to score in <medium>', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/mediumboard'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 50, info: "this is a description"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "done"
				if res.body.done == 1
					res.body.should.have.property "rank"
				done(err)

		it 'gamer should retreive his bestscores', (done)->

			request(shuttle)
			.get '/v1/gamer/bestscores'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.should.have.property "easyboard"
				res.body.easyboard.should.have.property "score"
				res.body.should.have.property "mediumboard"
				res.body.mediumboard.should.have.property "score"
				done(err)

		it 'friend should be able to score', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/easyboard'
			.set dataset.validAppCredentials
			.auth(friend_id, friend_token)
			.send { score: 300, info: "this is a description"}
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				#console.log res.body
				res.body.should.have.property "done"
				if res.body.done == 1
					res.body.should.have.property "rank"
				done(err)


		it 'gamer should retreive a Leaderboard hightolow', (done)->
			#console.log {gamer_id}
			#console.log {friend_id}
			request(shuttle)
			.get '/v1/gamer/scores/easyboard'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				#console.log res.body.easyboard.scores[0]
				if err? then return done(err)
				#console.log res.body
				#console.log res.body.easyboard.scores
				print res.body
				res.body.should.have.property "easyboard"
				res.body.easyboard.should.have.property "scores"
				#res.body.easyboard.scores.should.containDeep([{gamer_id:gamer_id }])
				#res.body.easyboard.scores.should.containDeep([{gamer_id:friend_id }])
				res.body.easyboard.scores[0].should.have.property "score"
				res.body.easyboard.scores[0].score.should.have.property "score"
				res.body.easyboard.scores[0].score.score.should.not.be.below res.body.easyboard.scores[1].score.score
				done(err)

		it.skip 'gamer should retreive a Leaderboard', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easyboard'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				#console.log res.body
				#console.log res.body.easyboard.scores
				res.body.should.have.property "easyboard"
				res.body.easyboard.should.have.property "scores"
				#res.body.easyboard.scores.should.containDeep([{gamer_id:gamer_id }])
				#res.body.easyboard.scores.should.containDeep([{gamer_id:friend_id }])
				res.body.easyboard.scores[0].should.have.property "score"
				res.body.easyboard.scores[0].score.should.have.property "score"
				done(err)

	describe 'Failures', ->

		it 'should reject if score is not a Number', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/easy'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: "test" }
			.expect 'content-type', /json/
			.expect 404
			.end (err, res)->
				res.body.name.should.eql('ScoreNotFound')
				done(err)

		it 'should reject score if order is not in hightolow, lowtohigh', (done)->

			request(shuttle)
			.post '/v1/gamer/scores/easy?order=whatever'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('InvalidScoreOrder')
				done(err)

		it 'should reject hisghscores if type is not in hisghscore, friendscore', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easy?type=whatever'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('InvalidScoreType')
				done(err)

		it 'should reject hisghscores if page is not an integer', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easy?page=whatever'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadPageScore')
				done(err)

		it 'should reject hisghscores if page<= 0', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easy?page=0'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadPageScore')
				done(err)

		it 'should reject hisghscores if count is not an integer', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easy?count=whatever'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadCountScore')
				done(err)

		it 'should reject hisghscores if count<= 0', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/easy?count=0'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				res.body.name.should.eql('BadCountScore')
				done(err)

		it 'should reject centered score if gamer never score', (done)->

			request(shuttle)
			.get '/v1/gamer/scores/noboard?page=me'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.send { score: 10 }
			.expect 'content-type', /json/
			.expect 400
			.end (err, res)->
				#console.log res.body
				res.body.name.should.eql('MissingScore')
				done(err)



	board = rs.generate 10

	describe.skip "Many scores", ->

		it 'populate', (done)->
			this.timeout(4000)

			async.forEachSeries [1..20],
				(i, cb)->
					request(shuttle)
					.post '/v1/login/anonymous'
					.set dataset.validAppCredentials
					.type 'json'
					.send {}
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err
						gamers_id[i] = res.body.gamer_id
						gamers_token[i] = res.body.gamer_secret
						score = if i<=10 or i>15 then i*10 else 110
						request(shuttle)
						.post "/v1/gamer/scores/#{board}?order=lowtohigh"
						.set dataset.validAppCredentials
						.auth(gamers_id[i], gamers_token[i])
						.send { score: score, info: "this is a description for gamer #{i}"}
						.expect 'content-type', /json/
						.expect 200
						.end (err, res)->
							if err? then return done(err)
							#print res.body
							res.body.should.have.property "done"
							if res.body.done == 1
								res.body.should.have.property "rank"
								res.body.rank.should.equal i
							
							if i==1 then return cb err

							request(shuttle)
							.post "/v1/gamer/friends/#{gamers_id[i]}?status=add"
							.set dataset.validAppCredentials
							.auth(gamers_id[1], gamers_token[1])
							.expect 'content-type', /json/
							.expect 200
							.end (err, res)->
								if err? then return done(err)
								res.body.should.have.property "done"
								res.body.done.should.equal 1
								cb err

			, (err)->
				#print gamers_id
				request(shuttle)
				.get "/v1/gamer/friends"
				.set dataset.validAppCredentials
				.auth(gamers_id[1], gamers_token[1])
				.expect 'content-type', /json/
				.expect 200
				.end (err, res)->
					if err? then return done(err)
					print res.body
					done(err)

		it 'should retreive easy', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?count=5"
			.set dataset.validAppCredentials
			.auth(gamers_id[1], gamers_token[1])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body[board].scores.length.should.be.eql 5
				res.body[board].rankOfFirst.should.be.eql 1
				res.body[board].page.should.be.eql 1
				res.body[board].maxpage.should.be.eql 4
				res.body[board].scores[0].gamer_id.should.equal gamers_id[1]
				res.body[board].scores[0].score.score.should.equal 10
				res.body[board].scores[1].gamer_id.should.equal gamers_id[2]
				res.body[board].scores[1].score.score.should.equal 20
				res.body[board].scores[2].gamer_id.should.equal gamers_id[3]
				res.body[board].scores[2].score.score.should.equal 30
				res.body[board].scores[3].gamer_id.should.equal gamers_id[4]
				res.body[board].scores[3].score.score.should.equal 40
				res.body[board].scores[4].gamer_id.should.equal gamers_id[5]
				res.body[board].scores[4].score.score.should.equal 50
				done(err)

		it 'should retreive easy page 2', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?page=2&count=5"
			.set dataset.validAppCredentials
			.auth(gamers_id[1], gamers_token[1])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body[board].scores.length.should.be.eql 5
				res.body[board].rankOfFirst.should.be.eql 6
				res.body[board].page.should.be.eql 2
				res.body[board].maxpage.should.be.eql 4
				res.body[board].scores[0].gamer_id.should.equal gamers_id[6]
				res.body[board].scores[0].score.score.should.equal 60
				res.body[board].scores[1].gamer_id.should.equal gamers_id[7]
				res.body[board].scores[1].score.score.should.equal 70
				res.body[board].scores[2].gamer_id.should.equal gamers_id[8]
				res.body[board].scores[2].score.score.should.equal 80
				res.body[board].scores[3].gamer_id.should.equal gamers_id[9]
				res.body[board].scores[3].score.score.should.equal 90
				res.body[board].scores[4].gamer_id.should.equal gamers_id[10]
				res.body[board].scores[4].score.score.should.equal 100
				done(err)

		it 'should retreive centered score', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?page=me&count=5"
			.set dataset.validAppCredentials
			.auth(gamers_id[7], gamers_token[7])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body[board].should.have.property "scores"
				res.body[board].scores.should.containDeep([{gamer_id:gamers_id[7]}])
				done(err)

		it 'should retreive equivalent score', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?page=me&count=5"
			.set dataset.validAppCredentials
			.auth(gamers_id[13], gamers_token[13])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				print res.body
				res.body[board].should.have.property "scores"
				res.body[board].scores.length.should.be.eql 5
				res.body[board].rankOfFirst.should.be.eql 11
				res.body[board].page.should.be.eql 3
				res.body[board].maxpage.should.be.eql 4
				res.body[board].scores[0].gamer_id.should.equal gamers_id[11]
				res.body[board].scores[0].score.score.should.equal 110
				res.body[board].scores[1].gamer_id.should.equal gamers_id[12]
				res.body[board].scores[1].score.score.should.equal 110
				res.body[board].scores[2].gamer_id.should.equal gamers_id[13]
				res.body[board].scores[2].score.score.should.equal 110
				res.body[board].scores[3].gamer_id.should.equal gamers_id[14]
				res.body[board].scores[3].score.score.should.equal 110
				res.body[board].scores[4].gamer_id.should.equal gamers_id[15]
				res.body[board].scores[4].score.score.should.equal 110
				done(err)

		it 'should retreive last score', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?page=me&count=3"
			.set dataset.validAppCredentials
			.auth(gamers_id[20], gamers_token[20])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				print res.body
				res.body[board].should.have.property "scores"
				res.body[board].scores.length.should.be.eql 2
				res.body[board].rankOfFirst.should.be.eql 19
				res.body[board].page.should.be.eql 7
				res.body[board].maxpage.should.be.eql 7
				res.body[board].scores[0].gamer_id.should.equal gamers_id[19]
				res.body[board].scores[0].score.score.should.equal 190
				res.body[board].scores[1].gamer_id.should.equal gamers_id[20]
				res.body[board].scores[1].score.score.should.equal 200
				done(err)

		it 'should retreive best scores', (done)->

			request(shuttle)
			.get "/v1/gamer/bestscores"
			.set dataset.validAppCredentials
			.auth(gamers_id[4], gamers_token[4])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body[board].score.should.equal 40
				res.body[board].order.should.equal "lowtohigh"
				res.body[board].rank.should.equal 4
				print res.body
				done(err)

		it 'should retreive friends scores', (done)->

			request(shuttle)
			.get "/v1/gamer/scores/#{board}?type=friendscore"
			.set dataset.validAppCredentials
			.auth(gamers_id[1], gamers_token[1])
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				print res.body
				res.body[board].length.should.equal 19
				res.body[board][0].rank.should.equal 2
				res.body[board][0].gamer_id.should.equal gamers_id[2]
				res.body[board][0].score.score.should.equal 20
				done(err)


		it "should delete temporary users", (done)->
			xtralife = require 'xtralife-api'
			async = require 'async'
			this.timeout(4000)
			async.forEachSeries gamers_id,
			(userid, cb)->
				xtralife.api.onDeleteUser ObjectID(userid), cb
			, (err)=>
				done(err)


