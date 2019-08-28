express = require 'express'
util = require 'util'
http = require 'http'
fs = require 'fs'
crypto = require 'crypto'
xtralife = require "xtralife-api"
bodyParser = require('body-parser')
middleware = require './middleware.coffee'
Q = require 'bluebird'
cors = require 'cors'
_ = require "underscore"

env = if process.env.NODE_ENV? then process.env.NODE_ENV else "dev"


app = express()

app.use bodyParser.json({strict : false, limit: (xlenv.http.bodySizeLimit or '500kb')})

app.use middleware.requestLogger

app.use middleware.sanityChecks

# Allow for mocking in dev/tests
if env is 'dev'
	mockRouter = require('express').Router caseSensitive: true
	app.mock = mockRouter
	app.use '/mock', mockRouter


# options does not use auth I think...
app.options '/*', cors(xlenv.http.cors)

app.get "/v1/ping" , cors(xlenv.http.cors), (req, res)->
	response = { version : xlenv.version, utc : new Date() }
	if xlenv.options.tag?
		response.tag = xlenv.options.tag
	res
	.set 'content-type', 'application/json'
	.status 200
	.json response
	.end()

# All routes require App authentication with x-apikey and x-apisecret
app.all "/v*/*", middleware.authenticateApp, middleware.apiCallCounter, cors(xlenv.http.cors), middleware.waterline

# now setup routes
require('./routes.coffee')(app)

# missing entry point handler
app.use middleware.missingEntryPoint

# error handler
app.use middleware.errorHandler

def = Q.defer()

xtralife.configure (err)->
	if err? then def.reject(err)
	return logger.error err.message, {stack: err.stack} if err?

	xlenv.inject ['=redisClient'], (err, redis)->
		if err? then return def.reject err
		xlenv.redis.client = redis

	# listen backlog set to a higher limit of 16384-1
	server = http.createServer(app).listen xlenv.http.port, 16383, (err)->
		if err? then return def.reject err
		logger.info 'HTTP REST API server listening on port '+ xlenv.http.port
		def.resolve(app)

	server.timeout = xlenv.http.timeout or 600000

module.exports = def.promise