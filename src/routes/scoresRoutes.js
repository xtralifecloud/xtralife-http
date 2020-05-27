/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');

const domainHandler = require('./domainHandler.js');

module.exports = function(app){

	let getBestscores, getScores, postScore;
	app.route('/v2.6/gamer/scores/:domain/:leaderboard')
	.all(domainHandler)
	.post(postScore = function(req, res, next){
		const board = req.params.leaderboard;
		const {
            info
        } = req.body;
		const order = req.query.order || "hightolow";
		const score = Number(req.body.score);
		if (isNaN(score)) { return next(new errors.ScoreNotFound); }
		if (["hightolow", "lowtohigh"].indexOf(order)===-1) { return next(new errors.InvalidScoreOrder); }

		const {
            domain
        } = req.params;

		const mayvary = (req.query.mayvary != null) && ( req.query.mayvary.toLowerCase() !== "false" );
		const force = (req.query.force != null) && ( req.query.force.toLowerCase() !== "false" );

		return xtralife.api.leaderboard.score(domain, req.gamer._id, board, order, score, info, (mayvary || force), function(err, rank){
			if (err != null) { return next(err); }
			return res
			.status(200)
			.json(rank)
			.end();
		});
	}).get(getScores = function(req, res, next){
		let count;
		const board = req.params.leaderboard;
		const order = req.query.order || 'hightolow';

		let page = req.query.page || 1;
		if (page === "me") { 
			page = -1; 
		} else {
			page = parseInt(page, 10);
			if (isNaN(page) || (page<=0)) { return next(new errors.BadPageScore); }
		}

		if (req.query.count != null) {
			count = parseInt(req.query.count, 10);
			if (isNaN(count) || (count<=0)) { return next(new errors.BadCountScore); }
		} else {
			count = 10;
		}

		const type = req.query.type || "highscore";

		if (["hightolow", "lowtohigh"].indexOf(order)===-1) { return next(new errors.InvalidScoreOrder); }
		if (["highscore", "friendscore"].indexOf(type)===-1) { return next(new errors.InvalidScoreType); }

		const {
            domain
        } = req.params;
		
		if (type === "highscore") {
			return xtralife.api.leaderboard.gethighscore(req.context, domain, req.gamer._id, board, page, count, function(err, leaderboard){
				if (err != null) { return next(err); }
				if (req.context.customData != null) { leaderboard.customData = req.context.customData; }
				return res
				.status(200)
				.json(leaderboard)
				.end();
			});
		} else {
			return xtralife.api.leaderboard.getfriendscore(req.context, domain, req.gamer._id, board, order, page, count, function(err, leaderboard){
				if (err != null) { return next(err); }
				if (req.context.customData != null) { leaderboard.customData = req.context.customData; }
				return res
				.status(200)
				.json(leaderboard)
				.end();
			});
		}
	}).put(function(req, res, next){
		const {
            domain
        } = req.params;
		const board = req.params.leaderboard;
		const score = Number(req.body.score);
		return xtralife.api.leaderboard.getrank(domain, board, score, function(err, rank){
			if (err != null) { return next(err); }
			return res
			.status(200)
			.json({rank})
			.end();
		});}).all((req, res, next) => next(new errors.InvalidMethodError()));

	app.route('/v1/gamer/scores/:leaderboard')
	.all(function(req, res, next){
		req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
		res.header('X-Obsolete', 'true');
		return next();}).post(postScore)
	.get(getScores)
	.all((req, res, next) => next(new errors.InvalidMethodError()));


	app.get("/v2.6/gamer/bestscores/:domain", domainHandler, (getBestscores = (req, res, next) => xtralife.api.leaderboard.bestscores(req.params.domain, req.gamer._id, function(err, scores){
        if (err != null) { return next(err); }
        return res
        .status(200)
        .json(scores)
        .end();
    }))
	);

	return app.route("/v1/gamer/bestscores")
	.all(function(req, res, next){
		req.params.domain = xtralife.api.game.getPrivateDomain(req.game.appid);
		res.header('X-Obsolete', 'true');
		return next();}).get(getBestscores);
};
