class APIError extends Error

	constructor: () -> super()

	fields: ['name', 'message', 'status', 'details']

# superclass for request specific errors
class HttpRequestError extends APIError
	constructor: (@request)-> super()

class InvalidMethodError extends HttpRequestError
	status: 400
	name: 'InvalidMethodError'
	message: 'This method is not supported for this path'

# error when calling an unknown route
class InvalidRoute extends HttpRequestError
	name: "InvalidRoute"
	message: "This route is invalid"
	status: 404

# x-apikey and x-apisecret is not in headers
class AppAuthenticationError extends HttpRequestError
	constructor: (req)->
		super(req)
		headers = (header for header, value of req.headers).join(", ")
		@message = "App credentials x-apikey and x-apisecret not found in request headers (received #{headers})"

	name: "AuthenticationError"
	status: 400

# the x-apikey and x-apisecret cannot be authenticated
class InvalidAppAuthenticationError extends HttpRequestError
	constructor: (req)->
		super(req)
		@message = "Invalid App Credentials in request headers (x-apikey: #{req.headers['x-apikey']}, x-apisecret: #{req.headers['x-apisecret']})"

	name: "InvalidAppAuthenticationError"
	status: 401

class forbiddenAccess extends HttpRequestError
	name: "forbiddenAccess"
	message: "Access to this game has been removed"
	status: 401

# error when trying to login with incorrect credentials
class LoginError extends HttpRequestError
	name: "LoginError"
	message: "Invalid user credentials"
	status: 401

class InvalidLoginNetwork extends LoginError
	message: "Invalid Gamer Credentials (unknown network)"

# error when sending invalid login token
class InvalidLoginTokenError extends HttpRequestError
	name: "InvalidLoginTokenError"
	message: "The received login token is invalid"
	status: 401

class InvalidOption extends APIError
	constructor: (badoption, options)->
		super()
		@message = "Invalid option (#{badoption}) for this route, you should use: #{options}"

	name: "InvalidOption"
	status: 400

class MissingData extends APIError
	constructor: (field)->
		super()
		@message = "The body doesn't contain the required field: #{field}"

	name: "MissingData"
	status: 404

class InvalidJSONBody extends APIError
	message = "The JSON body of the request doesn't have the expected format"
	name: "InvalidJSONBody"
	status: 400

class MissingParameter extends APIError
	constructor: (field)->
		super()
		@message = "The parameter is invalid or absent: #{field}"

	name: "MissingParameter"
	status: 400

class KeyNotFound extends APIError
	name: "KeyNotFound"
	message: "The specified key couldn't be found"
	status: 404

class NotFound extends APIError
	name: "NotFound"
	message: "Not found"
	status: 404

class StatusNotFound extends APIError
	name: "StatusNotFound"
	message: "The status is not specified"
	status: 404

class StatusNotSupported extends APIError
	name: "StatusNotSupported"
	message: "The status  specified is not supported"
	status: 400

class GamerIdNotFound extends APIError
	name: "GamerIdNotFound"
	message: "The gamer id specified is not found"
	status: 404

class LeaderboardNotFound extends APIError
	name: "LeaderboardNotFound"
	message: "The leaderboard specified doesn't exist"
	status: 404

class InvalidScoreOrder extends APIError
	name: "InvalidScoreOrder"
	message: "order not supported"
	status: 400

class InvalidScoreType extends APIError
	name: "InvalidScoreType"
	message: "type not supported"
	status: 400

class ScoreNotFound extends APIError
	name: "ScoreNotFound"
	message: "score is not provided"
	status: 404

class BadPageScore extends  APIError
	name: "BadPageScore"
	message: "Page must be a positive integer"
	status: 400

class BadCountScore extends  APIError
	name: "BadCountScore"
	message: "Count must be a positive integer"
	status: 400

class InvalidDomain extends  APIError
	name: "InvalidDomain"
	message: "Try to access to  an invalid domain"
	status: 404

class InvalidAchievement extends APIError
	name: "InvalidAchievement"
	message: "achievement name does not exist"
	status: 404

class InvalidMatch extends APIError
	name: "InvalidMatch"
	message: "The match does not exist"
	status: 404

class MissingEmailTitle extends APIError
	name: "MissingEmailTitle"
	message: "The title of the email is not provided"
	status: 400

class MissingEmailBody extends APIError
	name: "MissingEmailBody"
	message: "The body of the email is not provided"
	status: 400

class BadEmailTemplate extends APIError
	name: "BadEmailTemplate"
	message: "The body provided doesn't constain the tag [[SHORTCODE]]"
	status: 400

class MissingSenderEmail extends APIError
	name: "MissingSenderEmail"
	message: "the issuer email not found (from key)"
	status: 400

class InvalidAPIVersion extends APIError
	name: "InvalidAPIVersion"
	message: "invalid version of the API"
	status: 400


class NoListenerOnDomain extends APIError
	constructor: (domain)->
		super()
		@message = "The domain #{domain} has no listener declared in Backoffice"
	name: "NoListenerOnDomain"
	status: 400


module.exports = {APIError, HttpRequestError, InvalidMethodError
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
, InvalidAPIVersion, NoListenerOnDomain}


