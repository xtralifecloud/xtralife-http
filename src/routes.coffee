xtralife = require 'xtralife-api'

middleware = require './middleware.coffee'
errors = require './errors.coffee'

module.exports = (app)->

	app.param "version", (req, res, next, version)->
		req.version = version
		next()

	# these routes come before requiring gamer auth
	app.use '/:version/batch', (require './routes/batchRoutes.coffee').unauthenticatedBatch
	app.use '/:version/vfs/', require './routes/gameVFSRoutes.coffee'

	# Gamer authorisation not required yet (because of login)
	require('./routes/userRoutes.coffee')(app)
	app.use '/:version/index', require './routes/indexRoutes.coffee'

	# Gamer authorisation is required from now on
	app.all "/:version/gamer/*", middleware.authenticateGamer

	app.use '/:version/gamer/batch', (require './routes/batchRoutes.coffee').authenticatedBatch

	require('./routes/gamerRoutes.coffee')(app)
	require('./routes/friendsRoutes.coffee')(app)
	require('./routes/profileRoutes.coffee')(app)
	require('./routes/propertiesRoutes.coffee')(app)
	require('./routes/godfatherRoutes.coffee')(app)
	require('./routes/scoresRoutes.coffee')(app)
	
	app.use '/:version/gamer/vfs', require './routes/vfsRoutes.coffee'
	app.use '/:version/gamer/tx', require './routes/txRoutes.coffee'
	app.use '/:version/gamer/matches', require './routes/matchRoutes.coffee'
	app.use '/:version/gamer/event', require './routes/eventsRoutes.coffee'
	app.use '/:version/gamer/store', require './routes/storeRoutes.coffee'
	app.use '/:version/gamer/kv', require './routes/kvRoutes.coffee'

	#WARNING : should be the last one, as it handles generic /v1/gamer routes...
	#Not so happy with that !
	require('./routes/gamerCatchAllRoutes.coffee')(app)
