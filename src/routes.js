/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');

const middleware = require('./middleware.js');
const errors = require('./errors.js');

module.exports = function(app){

	app.param("version", function(req, res, next, version){
		req.version = version;
		return next();
	});

	// these routes come before requiring gamer auth
	app.use('/:version/batch', (require('./routes/batchRoutes.js')).unauthenticatedBatch);
	app.use('/:version/vfs/', require('./routes/gameVFSRoutes.js'));

	// Gamer authorisation not required yet (because of login)
	require('./routes/userRoutes.js')(app);
	app.use('/:version/index', require('./routes/indexRoutes.js'));

	// Gamer authorisation is required from now on
	app.all("/:version/gamer/*", middleware.authenticateGamer);

	app.use('/:version/gamer/batch', (require('./routes/batchRoutes.js')).authenticatedBatch);

	require('./routes/gamerRoutes.js')(app);
	require('./routes/friendsRoutes.js')(app);
	require('./routes/profileRoutes.js')(app);
	require('./routes/propertiesRoutes.js')(app);
	require('./routes/godfatherRoutes.js')(app);
	require('./routes/scoresRoutes.js')(app);
	
	app.use('/:version/gamer/vfs', require('./routes/vfsRoutes.js'));
	app.use('/:version/gamer/tx', require('./routes/txRoutes.js'));
	app.use('/:version/gamer/matches', require('./routes/matchRoutes.js'));
	app.use('/:version/gamer/event', require('./routes/eventsRoutes.js'));
	app.use('/:version/gamer/store', require('./routes/storeRoutes.js'));
	app.use('/:version/gamer/kv', require('./routes/kvRoutes.js'));

	//WARNING : should be the last one, as it handles generic /v1/gamer routes...
	//Not so happy with that !
	return require('./routes/gamerCatchAllRoutes.js')(app);
};
