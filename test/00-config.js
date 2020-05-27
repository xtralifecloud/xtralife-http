/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Q = require('bluebird');
Q.promisifyAll(require('redis'));
const os = require('os');
global.xlenv = require("xtralife-env");

const winston = require('winston');
global.logger = winston.createLogger({ 
	transports: [new winston.transports.Console()],
	level: 'error',
	format: winston.format.simple()
});

xlenv.override(null, {
	nbworkers: 1,

	privateKey: "CONFIGURE : This is a private key and you should customize it",

	redis: {
		host: "localhost",
		port: 6378
	},

	redisClient(cb){
		const client = require('redis').createClient(xlenv.redis.port, xlenv.redis.host);
		return client.info(err => cb(err, client));
	},

	redisChannel(cb){
		const client = require('redis').createClient(xlenv.redis.port, xlenv.redis.host);
		return client.info(err => cb(err, client));
	},

	redisStats(cb){
		const client = require('redis').createClient(xlenv.redis.port, xlenv.redis.host);
		return client.info(function(err){
			client.select(10);
			return cb(err, client);
		});
	},

	mongodb: {
		dbname: 'xtralife',

		url: "mongodb://localhost:27018/xtralife",
		options: { // see http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html
			w: 1,
			readPreference: "primaryPreferred",
			auto_reconnect: true,
			promiseLibrary: require('bluebird'),
			useNewUrlParser: true,
			useUnifiedTopology: true
		}
	},
			
	mongoCx(cb){
		return require("mongodb").MongoClient.connect(xlenv.mongodb.url, xlenv.mongodb.options, (err, mongodb) => cb(err, mongodb));
	},

	elastic(cb){
		const elastic = require("elasticsearch");
		const client = new elastic.Client();
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
		port : 1999
	}, // allows running tests when a full server is running

	xtralife: {
		games: {
			"com.clanofthecloud.testgame": { 
				apikey:"testgame-key",
				apisecret:"testgame-secret",
				config: {
					enable:true,
					domains:[],
					eventedDomains:[],
					certs: {
						android: {
							enable: false,
							senderID: '',
							apikey: ''
						},
						ios: {
							enable: false,
							cert: '',
							key: ''
						},
						macos: {
							enable: false,
							cert: '',
							key: ''
						}
					},
					socialSettings: {
						facebookAppToken : ''
					}
				}
			},

			"com.clanofthecloud.cloudbuilder": { 
				apikey:"cloudbuilder-key",
				apisecret:"azerty",
				config: {
					enable:true,
					domains:["com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3","com.clanofthecloud.cloudbuilder.test"],
					eventedDomains:["com.clanofthecloud.cloudbuilder.m3Nsd85GNQd3"],
					certs: {
						android: {
							enable: false,
							senderID: '',
							apikey: ''
						},
						ios: {
							enable: false,
							cert: '',
							key: ''
						},
						macos: {
							enable: false,
							cert: '',
							key: ''
						}
					},
					socialSettings: {
						facebookAppToken : '',
						gameCenterBundleIdRE: /^cloud.xtralife.gamecenterauth$/
					}
				}
			}
		}
	},

	AWS: { // to run the xtralife-http tests, you MUST configure access to an S3 bucket
		S3: {
			bucket: 'CONFIGURE',
			credentials: {
				region: 'CONFIGURE',
				accessKeyId: 'CONFIGURE',
				secretAccessKey: 'CONFIGURE'
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
