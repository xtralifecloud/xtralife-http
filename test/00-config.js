/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
global.xlenv = require("xtralife-env");

const winston = require('winston');
global.logger = winston.createLogger({
	transports: [new winston.transports.Console()],
	level: 'error',
	format: winston.format.simple()
});

const Redis = require('ioredis');

xlenv.override(null, {
	nbworkers: 1,

	privateKey: "CONFIGURE : This is a private key and you should customize it",

	redis: {
		config: { // refer to https://github.com/luin/ioredis/blob/v4/API.md#new-redisport-host-options
			host: "localhost",
			port: 6378
		}
	},

	redisClient(cb){
		const redis = new Redis(xlenv.redis.config);
		redis.info((err) => {
			return cb(err, redis);
		})
	},

	redisChannel(cb){
		const redis = new Redis(xlenv.redis.config);
		redis.info((err) => {
			return cb(err, redis);
		})
	},

	redisStats(cb) {
		const redis = new Redis(xlenv.redis.config);
		redis.info((err) => {
			return cb(err, redis);
		})
	},

	mongodb: {
		dbname: 'xtralife',

		url: "mongodb://localhost:27018/xtralife",
		options: { // see http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html
			w: 1,
			readPreference: "primaryPreferred",
			promiseLibrary: require('bluebird'),

		}
	},

	mongoCx(cb) {
		return require("mongodb").MongoClient.connect(xlenv.mongodb.url, xlenv.mongodb.options, (err, mongodb) => cb(err, mongodb));
	},

	elastic(cb) {
		const { Client } = require('@elastic/elasticsearch');
		const client = new Client({
			node: 'http://localhost:9200'
		});
		return cb(null, client);
	},

	options: {
		notifyUserOnBrokerTimeout: true,

		removeUser: true,

		hookLog: {
			enable: true,
			limit: 5
		},
		timers: {
			enable: true,
			listen: true
		},

		hostnameBlacklist: ['localhost', '127.0.0.1'],
		//profileFields: ['displayName'] # show nothing but displayName in profile
		//cleanLogin: true
		//GameCenterTokenMaxage: 86400
		tag: 'custom test tag',

		feature: {
			forceGamerVFS_V1: false
		}
	},

	mailer: null, // not used for xtralife-http tests

	http: {
		waterline: 600, // warn if we serve more than 10 req/sec
		port: 1999
	}, // allows running tests when a full server is running

	xtralife: {
		games: {
			"com.clanofthecloud.testgame": {
				apikey: "testgame-key",
				apisecret: "testgame-secret",
				config: {
					enable: true,
					domains: [],
					eventedDomains: [],

					google: { // see google cloud platform
						clientID: '', // login
						inApp: { // in-app purchase android
							packageID: '',
							serviceAccount: {
								private_key_id: '',
								client_email: '',
								client_id: '',
								type: 'service_account'
							}
						}
					},

				}
			},

			"com.clanofthecloud.cloudbuilder": {
				apikey: "cloudbuilder-key",
				apisecret: "azerty",
				config: {
					enable: true,
					domains: ["com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3", "com.clanofthecloud.cloudbuilder.test"],
					eventedDomains: ["com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3"],

					google: { // see google cloud platform
						clientID: '', // login
						inApp: { // in-app purchase android
							packageID: 'any',
							serviceAccount: {
								private_key_id: '',
								client_email: '',
								client_id: '',
								type: 'service_account'
							}
						}
					},
				}
			}
		}
	},

	AWS: {
		S3: {
			bucket: "",
			region: "",
			credentials: {
				accessKeyId: "",
				secretAccessKey: ""
			}
		}
	},

	hooks: {
		recursionLimit: 5,
		definitions: {
			"com.clanofthecloud.cloudbuilder.azerty": { // needed for unit tests
				'__doesntcompile': "return bigbadbug["
			}
		},
		functions: require('./batches.js')
	}
}
);
