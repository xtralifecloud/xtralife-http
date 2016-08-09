crypto = require 'crypto'
xtralife = require 'xtralife-api'

module.exports =
	aes_cipher : (passwd)->
		cipher = crypto.createCipher 'aes-256-cbc', xlenv.privateKey
		encoded = cipher.update passwd, 'utf8', 'base64'
		encoded + cipher.final 'base64'

	aes_decipher : (passwd)->
		decipher = crypto.createDecipher 'aes-256-cbc', xlenv.privateKey
		decoded = decipher.update passwd, 'base64', 'utf8'
		decoded + decipher.final 'utf8'

	cleanGamerForReturning : (gamer)->
		result = gamer
		result.gamer_id = gamer._id
		result.gamer_secret = xtralife.api.user.sha_passwd(gamer._id)
		result.servertime = new Date()
		delete result._id
		delete result.networksecret
		return result

	# Prevents exposing the actual name of the 'private' domain, replacing it with the 'private' string
	sanitizeDomain: (game, domain)->
		if domain is "#{game.appid}.#{game.apisecret}"
			'private'
		else
			domain
