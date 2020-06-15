/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class APIError extends Error {
	static initClass() {
		this.prototype.fields = ['name', 'message', 'status', 'details'];
	}

	constructor() { super(); }
}
APIError.initClass();

// superclass for request specific errors
class HttpRequestError extends APIError {
	constructor(request) {
		super();
		this.request = request;
	}
}

class InvalidMethodError extends HttpRequestError {
	static initClass() {
		this.prototype.status = 400;
		this.prototype.name = 'InvalidMethodError';
		this.prototype.message = 'This method is not supported for this path';
	}
}
InvalidMethodError.initClass();

// error when calling an unknown route
class InvalidRoute extends HttpRequestError {
	static initClass() {
		this.prototype.name = "InvalidRoute";
		this.prototype.message = "This route is invalid";
		this.prototype.status = 404;
	}
}
InvalidRoute.initClass();

// x-apikey and x-apisecret is not in headers
class AppAuthenticationError extends HttpRequestError {
	static initClass() {

		this.prototype.name = "AuthenticationError";
		this.prototype.status = 400;
	}
	constructor(req) {
		super(req);
		const headers = ((() => {
			const result = [];
			for (let header in req.headers) {
				const value = req.headers[header];
				result.push(header);
			}
			return result;
		})()).join(", ");
		this.message = `App credentials x-apikey and x-apisecret not found in request headers (received ${headers})`;
	}
}
AppAuthenticationError.initClass();

// the x-apikey and x-apisecret cannot be authenticated
class InvalidAppAuthenticationError extends HttpRequestError {
	static initClass() {

		this.prototype.name = "InvalidAppAuthenticationError";
		this.prototype.status = 401;
	}
	constructor(req) {
		super(req);
		this.message = `Invalid App Credentials in request headers (x-apikey: ${req.headers['x-apikey']}, x-apisecret: ${req.headers['x-apisecret']})`;
	}
}
InvalidAppAuthenticationError.initClass();

class forbiddenAccess extends HttpRequestError {
	static initClass() {
		this.prototype.name = "forbiddenAccess";
		this.prototype.message = "Access to this game has been removed";
		this.prototype.status = 401;
	}
}
forbiddenAccess.initClass();

// error when trying to login with incorrect credentials
class LoginError extends HttpRequestError {
	static initClass() {
		this.prototype.name = "LoginError";
		this.prototype.message = "Invalid user credentials";
		this.prototype.status = 401;
	}
}
LoginError.initClass();

class InvalidLoginNetwork extends LoginError {
	static initClass() {
		this.prototype.message = "Invalid Gamer Credentials (unknown network)";
	}
}
InvalidLoginNetwork.initClass();

// error when sending invalid login token
class InvalidLoginTokenError extends HttpRequestError {
	static initClass() {
		this.prototype.name = "InvalidLoginTokenError";
		this.prototype.message = "The received login token is invalid";
		this.prototype.status = 401;
	}
}
InvalidLoginTokenError.initClass();

class InvalidOption extends APIError {
	static initClass() {

		this.prototype.name = "InvalidOption";
		this.prototype.status = 400;
	}
	constructor(badoption, options) {
		super();
		this.message = `Invalid option (${badoption}) for this route, you should use: ${options}`;
	}
}
InvalidOption.initClass();

class MissingData extends APIError {
	static initClass() {

		this.prototype.name = "MissingData";
		this.prototype.status = 404;
	}
	constructor(field) {
		super();
		this.message = `The body doesn't contain the required field: ${field}`;
	}
}
MissingData.initClass();

var InvalidJSONBody = (function () {
	let message = undefined;
	InvalidJSONBody = class InvalidJSONBody extends APIError {
		static initClass() {
			message = "The JSON body of the request doesn't have the expected format";
			this.prototype.name = "InvalidJSONBody";
			this.prototype.status = 400;
		}
	};
	InvalidJSONBody.initClass();
	return InvalidJSONBody;
})();

class MissingParameter extends APIError {
	static initClass() {

		this.prototype.name = "MissingParameter";
		this.prototype.status = 400;
	}
	constructor(field) {
		super();
		this.message = `The parameter is invalid or absent: ${field}`;
	}
}
MissingParameter.initClass();

class KeyNotFound extends APIError {
	static initClass() {
		this.prototype.name = "KeyNotFound";
		this.prototype.message = "The specified key couldn't be found";
		this.prototype.status = 404;
	}
}
KeyNotFound.initClass();

class NotFound extends APIError {
	static initClass() {
		this.prototype.name = "NotFound";
		this.prototype.message = "Not found";
		this.prototype.status = 404;
	}
}
NotFound.initClass();

class StatusNotFound extends APIError {
	static initClass() {
		this.prototype.name = "StatusNotFound";
		this.prototype.message = "The status is not specified";
		this.prototype.status = 404;
	}
}
StatusNotFound.initClass();

class StatusNotSupported extends APIError {
	static initClass() {
		this.prototype.name = "StatusNotSupported";
		this.prototype.message = "The status  specified is not supported";
		this.prototype.status = 400;
	}
}
StatusNotSupported.initClass();

class GamerIdNotFound extends APIError {
	static initClass() {
		this.prototype.name = "GamerIdNotFound";
		this.prototype.message = "The gamer id specified is not found";
		this.prototype.status = 404;
	}
}
GamerIdNotFound.initClass();

class LeaderboardNotFound extends APIError {
	static initClass() {
		this.prototype.name = "LeaderboardNotFound";
		this.prototype.message = "The leaderboard specified doesn't exist";
		this.prototype.status = 404;
	}
}
LeaderboardNotFound.initClass();

class InvalidScoreOrder extends APIError {
	static initClass() {
		this.prototype.name = "InvalidScoreOrder";
		this.prototype.message = "order not supported";
		this.prototype.status = 400;
	}
}
InvalidScoreOrder.initClass();

class InvalidScoreType extends APIError {
	static initClass() {
		this.prototype.name = "InvalidScoreType";
		this.prototype.message = "type not supported";
		this.prototype.status = 400;
	}
}
InvalidScoreType.initClass();

class ScoreNotFound extends APIError {
	static initClass() {
		this.prototype.name = "ScoreNotFound";
		this.prototype.message = "score is not provided";
		this.prototype.status = 404;
	}
}
ScoreNotFound.initClass();

class BadPageScore extends APIError {
	static initClass() {
		this.prototype.name = "BadPageScore";
		this.prototype.message = "Page must be a positive integer";
		this.prototype.status = 400;
	}
}
BadPageScore.initClass();

class BadCountScore extends APIError {
	static initClass() {
		this.prototype.name = "BadCountScore";
		this.prototype.message = "Count must be a positive integer";
		this.prototype.status = 400;
	}
}
BadCountScore.initClass();

class InvalidDomain extends APIError {
	static initClass() {
		this.prototype.name = "InvalidDomain";
		this.prototype.message = "Try to access to  an invalid domain";
		this.prototype.status = 404;
	}
}
InvalidDomain.initClass();

class InvalidAchievement extends APIError {
	static initClass() {
		this.prototype.name = "InvalidAchievement";
		this.prototype.message = "achievement name does not exist";
		this.prototype.status = 404;
	}
}
InvalidAchievement.initClass();

class InvalidMatch extends APIError {
	static initClass() {
		this.prototype.name = "InvalidMatch";
		this.prototype.message = "The match does not exist";
		this.prototype.status = 404;
	}
}
InvalidMatch.initClass();

class MissingEmailTitle extends APIError {
	static initClass() {
		this.prototype.name = "MissingEmailTitle";
		this.prototype.message = "The title of the email is not provided";
		this.prototype.status = 400;
	}
}
MissingEmailTitle.initClass();

class MissingEmailBody extends APIError {
	static initClass() {
		this.prototype.name = "MissingEmailBody";
		this.prototype.message = "The body of the email is not provided";
		this.prototype.status = 400;
	}
}
MissingEmailBody.initClass();

class BadEmailTemplate extends APIError {
	static initClass() {
		this.prototype.name = "BadEmailTemplate";
		this.prototype.message = "The body provided doesn't constain the tag [[SHORTCODE]]";
		this.prototype.status = 400;
	}
}
BadEmailTemplate.initClass();

class MissingSenderEmail extends APIError {
	static initClass() {
		this.prototype.name = "MissingSenderEmail";
		this.prototype.message = "the issuer email not found (from key)";
		this.prototype.status = 400;
	}
}
MissingSenderEmail.initClass();

class InvalidAPIVersion extends APIError {
	static initClass() {
		this.prototype.name = "InvalidAPIVersion";
		this.prototype.message = "invalid version of the API";
		this.prototype.status = 400;
	}
}
InvalidAPIVersion.initClass();


class NoListenerOnDomain extends APIError {
	static initClass() {
		this.prototype.name = "NoListenerOnDomain";
		this.prototype.status = 400;
	}
	constructor(domain) {
		super();
		this.message = `The domain ${domain} has no listener declared in Backoffice`;
	}
}
NoListenerOnDomain.initClass();


module.exports = {
	APIError, HttpRequestError, InvalidMethodError
	, InvalidRoute
	, InvalidAppAuthenticationError
	, LoginError, InvalidLoginNetwork, InvalidLoginTokenError, forbiddenAccess
	, InvalidOption, MissingData, MissingParameter, InvalidJSONBody
	, KeyNotFound, NotFound
	, StatusNotFound, StatusNotSupported, GamerIdNotFound
	, InvalidDomain, InvalidAchievement
	, LeaderboardNotFound, InvalidScoreOrder, InvalidScoreType, ScoreNotFound, BadPageScore, BadCountScore
	, InvalidMatch
	, MissingEmailTitle, MissingEmailBody, BadEmailTemplate, MissingSenderEmail
	, InvalidAPIVersion, NoListenerOnDomain
};


