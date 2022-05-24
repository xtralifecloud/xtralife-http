/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const crypto = require('crypto');
const xtralife = require('xtralife-api');

module.exports = {
	aes_cipher(passwd) {
		const cipher = crypto.createCipher('aes-256-cbc', xlenv.privateKey);
		const encoded = cipher.update(passwd, 'utf8', 'base64');
		return encoded + cipher.final('base64');
	},

	aes_decipher(passwd) {
		const decipher = crypto.createDecipher('aes-256-cbc', xlenv.privateKey);
		const decoded = decipher.update(passwd, 'base64', 'utf8');
		return decoded + decipher.final('utf8');
	},

	cleanGamerForReturning(gamer) {
		const result = Object.assign({}, gamer);
		result.gamer_id = gamer._id;
		result.gamer_secret = xtralife.api.user.sha_passwd(gamer._id);
		result.servertime = new Date();
		delete result._id;
		delete result.networksecret;
		return result;
	},

	// Prevents exposing the actual name of the 'private' domain, replacing it with the 'private' string
	sanitizeDomain(game, domain) {
		if (domain === `${game.appid}.${game.apisecret}`) {
			return 'private';
		} else {
			return domain;
		}
	}
};
