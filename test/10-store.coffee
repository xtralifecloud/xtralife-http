request = require 'supertest'
should = require 'should'

shuttle = null
shuttlePromise = require '../src/http.coffee'

dataset = require './dataset.coffee'
ObjectID = require('mongodb').ObjectID

Q = require 'bluebird'
xtralife = require 'xtralife-api'

appid = null
gamer_id = null
gamer_token = null
transactionId = null
validTransactions = 0
inappMock = null

class InAppVerifierMock
	constructor: (@originalIapObject)->
		@appStoreMockConfig = {firstCode: 0, syntaxError: false}
		@googleMockConfig = {validateSuccessfully: true}
		null

	# Call this before validating an appstore purchase
	configureNextAppleRequest: (firstServerReturn, wantSyntaxError)->
		@appStoreMockConfig.firstCode = firstServerReturn or 0
		@appStoreMockConfig.syntaxError = wantSyntaxError or false

	# Call this before validating a google play purchase
	configureNextGoogleRequest: (validateSuccessfully)->
		@googleMockConfig.validateSuccessfully = validateSuccessfully

	verifyPayment: (platform, payment, callback)->
		if platform is 'google'
			if @googleMockConfig.validateSuccessfully
				response =
					transactionId: new ObjectID()
				callback null, response
			else
				response =
					error:
						errors: [
							domain: "global"
							reason: "configureNextGoogleRequest"
							message: "The purchase token was not found."
							locationType: "parameter"
							location: "token"
						]
				callback response, null
		else
			receipt = JSON.parse payment.receipt
			if not @appStoreMockConfig.syntaxError
				response =
					status: @appStoreMockConfig.firstCode
				if @appStoreMockConfig.firstCode is 0
					response.receipt =
						in_app: [
							product_id: receipt.productId
							transaction_id: receipt.transaction_id
						]
					callback null, response
				else
					callback response, null
			else
				response = "invalid"
				callback response, null


describe 'Store', ->

	before 'should wait for initialisation', (done)->
		shuttlePromise.then (_shuttle)->
			shuttle = _shuttle
			# Inject the mock verifier in our store API
			inappMock = new InAppVerifierMock(xtralife.api.store.IAP)
			xtralife.api.store.IAP = inappMock

			# Inject proper certificates
			xtralife.api.game.dynGames["com.clanofthecloud.cloudbuilder"].config.certs = { "android" : { "enable" : true, "senderID" : "", "apikey" : "", "packageid" : "com.clanofthecloud.sampleunityproject", "keyobject" : "{\n  \"private_key_id\": \"48cb237649d2b681d51fca0ac044cc4afeb7be04\",\n  \"client_email\": \"164319190716-i20d6e4jgcb9idu29aqmud7fgo7lqcmt@developer.gserviceaccount.com\",\n  \"client_id\": \"164319190716-i20d6e4jgcb9idu29aqmud7fgo7lqcmt.apps.googleusercontent.com\",\n  \"type\": \"service_account\"\n}" }, "ios" : { "enable" : true, "cert" : "", "key" : "", "keyData" : "Bag Attributes\n    friendlyName: Apple Development IOS Push Services: ch.mobile-dev.testsdkunity\n    localKeyID: 0D 89 53 BA 80 41 D2 76 26 AB D5 96 66 18 54 C5 FE F8 EF 8C \nsubject=/UID=ch.mobile-dev.testsdkunity/CN=Apple Development IOS Push Services: ch.mobile-dev.testsdkunity/OU=9L3K22ZKZZ/C=US\nissuer=/C=US/O=Apple Inc./OU=Apple Worldwide Developer Relations/CN=Apple Worldwide Developer Relations Certification Authority\n-----BEGIN CERTIFICATE-----\nMIIFmTCCBIGgAwIBAgIIQPy+RwTB1UYwDQYJKoZIhvcNAQEFBQAwgZYxCzAJBgNV\nBAYTAlVTMRMwEQYDVQQKDApBcHBsZSBJbmMuMSwwKgYDVQQLDCNBcHBsZSBXb3Js\nZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9uczFEMEIGA1UEAww7QXBwbGUgV29ybGR3\naWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkw\nHhcNMTUwODA0MDk0MTM2WhcNMTYwODAzMDk0MTM2WjCBmDEqMCgGCgmSJomT8ixk\nAQEMGmNoLm1vYmlsZS1kZXYudGVzdHNka3VuaXR5MUgwRgYDVQQDDD9BcHBsZSBE\nZXZlbG9wbWVudCBJT1MgUHVzaCBTZXJ2aWNlczogY2gubW9iaWxlLWRldi50ZXN0\nc2RrdW5pdHkxEzARBgNVBAsMCjlMM0syMlpLWloxCzAJBgNVBAYTAlVTMIIBIjAN\nBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArehVEyPiHQKXylsMpdgHrHWfmj9n\nN3/7D0t26wLvqyMMu82TnUT/YUVH/TBnjFF0rjI7xiX3AkngYGxk2mJc4y+5uh8V\nFrLqjpABUqAmxicJycWtEKcvwxSACwCpMxqjmF0eBu6I7R4H/dpdmJUfYpv2zm9w\nOTWg9ruDrF4i7jVPcDzovbFdXVxXtdaJ/SKI7fImqh4rmxpUUjyTyj8K3efUTcnk\n3pMZ6vsTr1pcFegydXOEFhI4Q7W7acp1snUMhuQqn+9fb4gqR0QquA/ooEj1jswv\nvg495VhCh93ewrLCaeHMjNjcHGEPNNXWr0e0ZfpYSjH0NEDYtpizny/HvQIDAQAB\no4IB5TCCAeEwHQYDVR0OBBYEFA2JU7qAQdJ2JqvVlmYYVMX++O+MMAkGA1UdEwQC\nMAAwHwYDVR0jBBgwFoAUiCcXCam2GGCL7Ou69kdZxVJUo7cwggEPBgNVHSAEggEG\nMIIBAjCB/wYJKoZIhvdjZAUBMIHxMIHDBggrBgEFBQcCAjCBtgyBs1JlbGlhbmNl\nIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0\nYW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBj\nb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZp\nY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMCkGCCsGAQUFBwIBFh1odHRwOi8v\nd3d3LmFwcGxlLmNvbS9hcHBsZWNhLzBNBgNVHR8ERjBEMEKgQKA+hjxodHRwOi8v\nZGV2ZWxvcGVyLmFwcGxlLmNvbS9jZXJ0aWZpY2F0aW9uYXV0aG9yaXR5L3d3ZHJj\nYS5jcmwwCwYDVR0PBAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMCMBAGCiqGSIb3\nY2QGAwEEAgUAMA0GCSqGSIb3DQEBBQUAA4IBAQAC9clofTGZ9KwAxivNhIYURs5t\ntPTRMUJ9kjmmQ3UatqXGIbKBRbOjjNifobxIW9eZMJeBQ+DGxNeHCaBZqn1Aeny/\nL/Z0o1NmqDfF3GSugg9yZqAAcllusj63d+pWAlh29RNNj0hZAxzatFx1V7YuWQOx\n6DpwroS2soyH8jPdcrLQW51rFWQzkhm0t+A//937H4mnv6jCcemcNEeDH6MFpCt2\nUfMZifpoWUH5ibXn1M7oYpjOXt82LwZFjQAw2jYJ7eemMU+coDsMASS2o9Ga/cnH\nOJVKBpla8VbyjZDoC39e7kkF+ZiGCoohbselliW9ZTOxcuUaj7uabjzR+1cx\n-----END CERTIFICATE-----\nBag Attributes\n    friendlyName: Florian B\n    localKeyID: 0D 89 53 BA 80 41 D2 76 26 AB D5 96 66 18 54 C5 FE F8 EF 8C \nKey Attributes: <No Attributes>\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEArehVEyPiHQKXylsMpdgHrHWfmj9nN3/7D0t26wLvqyMMu82T\nnUT/YUVH/TBnjFF0rjI7xiX3AkngYGxk2mJc4y+5uh8VFrLqjpABUqAmxicJycWt\nEKcvwxSACwCpMxqjmF0eBu6I7R4H/dpdmJUfYpv2zm9wOTWg9ruDrF4i7jVPcDzo\nvbFdXVxXtdaJ/SKI7fImqh4rmxpUUjyTyj8K3efUTcnk3pMZ6vsTr1pcFegydXOE\nFhI4Q7W7acp1snUMhuQqn+9fb4gqR0QquA/ooEj1jswvvg495VhCh93ewrLCaeHM\njNjcHGEPNNXWr0e0ZfpYSjH0NEDYtpizny/HvQIDAQABAoIBAE3M3ZqFeBewXEXL\n+9mJzs0JhhBUgxGiMKgEA7xZgO0X7g9qhbpa7sEOZIlRiVGN81wm3vTjcSDV+gpJ\nE8lbLeD5LealFyMjgamrpNvZB9+oAUoCJE2J7eUhG7NQZWGWbk+wgMlrF1i1EbAw\na6TiObs8uOpbkmIVquAWvW50Yr4b4IUm91qCx9eYUxmp2si32pHMXJOui4tsrDh4\nSKIn+GsRnc/AnlgConkStLICuI+JZcS4Mh9KelsgWB7MbFNTUGjbHLTX7uQzd537\nYrowIvQhlaLS+/V13JToUtYalvoHzZepcoqQSP7f9NB7MnCudBMZgjpSHU8jSObS\nyQG2ZqECgYEA2Mf3ASMfk1W6RBBKpJcIoo4Kzy9CfF2cptXrmop9mNdJg5+SWiXw\nEgG9pCdbxLdKDg22/V+7RpJMjs4lG2hEZNKue0rvSb6ejtdE6ugl2jNZeCrxLAlb\nL4qNdEhzk1BCFvQsUo+/AIA+mUZWemHXyPz8NGZl5jBcVPrI0EgmhpkCgYEAzV62\n3nLvlI35oWu3xuLF886IavogxDjsJLsipKdv+aKSd65clInqIKrlLeYSvRrlczTS\nuSH1ly01j1oKhiIQJCK4YeR0NTF7N0YqC4pIDNWEZkYr7nnBH0mBLMEQ7TyulGVP\nivH6gbndrSMoRdrRtwZY8gIOv92gN1TsHlxgVMUCgYBrMCzFJi3VtxzbzMZrrbZ6\nUgusOC0Cu3La14mgp3vE2Caka4F9C6cx8CRqB4ALu6llW4iwreY21d3++pVEgQDY\nbYgStJGvAA78iBquoE0fICbMEUegw5uP3U1mQvDK1XNoUCGeTS9fOwo41Zuq9bgx\nzE2UR1F5SU5OQpaKzjImeQKBgQC1VCBwrtjcuLKllR9x6r7Pcxc+JVWTC5NtJxIC\ngZg7uRBLvdcei9r+NwYdjZwT/lCDdSttrQ9UCOXWibDrF95amZFlVbpJUUQy3K+4\n+sJ9GnVJfEHD0Rr0TglRA7K3VTHr8rvVuavuqLaS7YzciMVMLb2RCMIPJFcXI9NL\nR1MC5QKBgExWIoiFAqTa9VDJf5fdAKMdZ7UHq0uI2jaWddCXtzp6UPFQ2dXZglj7\ngmrM14tWKA/kOVaqQZ40tX26VwnU9lF8cDaz9iL6mEDEF9V6yAWfViNnnHnAKvNf\nc6p0ersjCin313fvu9J3VLRtafyEkhj+VDlFPUN6DMRuJPSn8u8M\n-----END RSA PRIVATE KEY-----", "certData" : "-----BEGIN CERTIFICATE-----\nMIIFmTCCBIGgAwIBAgIIQPy+RwTB1UYwDQYJKoZIhvcNAQEFBQAwgZYxCzAJBgNV\nBAYTAlVTMRMwEQYDVQQKDApBcHBsZSBJbmMuMSwwKgYDVQQLDCNBcHBsZSBXb3Js\nZHdpZGUgRGV2ZWxvcGVyIFJlbGF0aW9uczFEMEIGA1UEAww7QXBwbGUgV29ybGR3\naWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkw\nHhcNMTUwODA0MDk0MTM2WhcNMTYwODAzMDk0MTM2WjCBmDEqMCgGCgmSJomT8ixk\nAQEMGmNoLm1vYmlsZS1kZXYudGVzdHNka3VuaXR5MUgwRgYDVQQDDD9BcHBsZSBE\nZXZlbG9wbWVudCBJT1MgUHVzaCBTZXJ2aWNlczogY2gubW9iaWxlLWRldi50ZXN0\nc2RrdW5pdHkxEzARBgNVBAsMCjlMM0syMlpLWloxCzAJBgNVBAYTAlVTMIIBIjAN\nBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArehVEyPiHQKXylsMpdgHrHWfmj9n\nN3/7D0t26wLvqyMMu82TnUT/YUVH/TBnjFF0rjI7xiX3AkngYGxk2mJc4y+5uh8V\nFrLqjpABUqAmxicJycWtEKcvwxSACwCpMxqjmF0eBu6I7R4H/dpdmJUfYpv2zm9w\nOTWg9ruDrF4i7jVPcDzovbFdXVxXtdaJ/SKI7fImqh4rmxpUUjyTyj8K3efUTcnk\n3pMZ6vsTr1pcFegydXOEFhI4Q7W7acp1snUMhuQqn+9fb4gqR0QquA/ooEj1jswv\nvg495VhCh93ewrLCaeHMjNjcHGEPNNXWr0e0ZfpYSjH0NEDYtpizny/HvQIDAQAB\no4IB5TCCAeEwHQYDVR0OBBYEFA2JU7qAQdJ2JqvVlmYYVMX++O+MMAkGA1UdEwQC\nMAAwHwYDVR0jBBgwFoAUiCcXCam2GGCL7Ou69kdZxVJUo7cwggEPBgNVHSAEggEG\nMIIBAjCB/wYJKoZIhvdjZAUBMIHxMIHDBggrBgEFBQcCAjCBtgyBs1JlbGlhbmNl\nIG9uIHRoaXMgY2VydGlmaWNhdGUgYnkgYW55IHBhcnR5IGFzc3VtZXMgYWNjZXB0\nYW5jZSBvZiB0aGUgdGhlbiBhcHBsaWNhYmxlIHN0YW5kYXJkIHRlcm1zIGFuZCBj\nb25kaXRpb25zIG9mIHVzZSwgY2VydGlmaWNhdGUgcG9saWN5IGFuZCBjZXJ0aWZp\nY2F0aW9uIHByYWN0aWNlIHN0YXRlbWVudHMuMCkGCCsGAQUFBwIBFh1odHRwOi8v\nd3d3LmFwcGxlLmNvbS9hcHBsZWNhLzBNBgNVHR8ERjBEMEKgQKA+hjxodHRwOi8v\nZGV2ZWxvcGVyLmFwcGxlLmNvbS9jZXJ0aWZpY2F0aW9uYXV0aG9yaXR5L3d3ZHJj\nYS5jcmwwCwYDVR0PBAQDAgeAMBMGA1UdJQQMMAoGCCsGAQUFBwMCMBAGCiqGSIb3\nY2QGAwEEAgUAMA0GCSqGSIb3DQEBBQUAA4IBAQAC9clofTGZ9KwAxivNhIYURs5t\ntPTRMUJ9kjmmQ3UatqXGIbKBRbOjjNifobxIW9eZMJeBQ+DGxNeHCaBZqn1Aeny/\nL/Z0o1NmqDfF3GSugg9yZqAAcllusj63d+pWAlh29RNNj0hZAxzatFx1V7YuWQOx\n6DpwroS2soyH8jPdcrLQW51rFWQzkhm0t+A//937H4mnv6jCcemcNEeDH6MFpCt2\nUfMZifpoWUH5ibXn1M7oYpjOXt82LwZFjQAw2jYJ7eemMU+coDsMASS2o9Ga/cnH\nOJVKBpla8VbyjZDoC39e7kkF+ZiGCoohbselliW9ZTOxcuUaj7uabjzR+1cx\n-----END CERTIFICATE-----" }, "macos" : { "enable" : false, "cert" : "", "key" : "" }}
			done()
			
		.catch done
		return null

	before "should create an anonymous user", (done)->

		request(shuttle)
		.post '/v1/login/anonymous'
		.set dataset.validAppCredentials
		.type 'json'
		.send {}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			gamer_id = res.body.gamer_id
			gamer_token = res.body.gamer_secret

			# Insert a few products for testing
			definitions = [
				{ "productId" : "cotc_product1", "appStoreId" : "product1", "googlePlayId" : "product1", "macStoreId": "macproduct1", "reward" : { "domain" : "private", "tx" : { "money" : 800 }, description: "My TX" } },
				{ "productId" : "cotc_product2", "googlePlayId" : "android.test.purchased"}
			]
			xtralife.api.store.TEST_clearStoreTransaction 'googleplay.12999763169054705758.1368240874747405', (err)->
				return done err if err?
				xtralife.api.store.TEST_setProductDefinitions res.body.games[0].appid, definitions, (err)->
					done err

	it "should list products", (done)->
		request(shuttle)
		.get '/v1/gamer/store/products'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			if err? then return done err
			res.body.count.should.eql(2)
			done()

	it "should validate AppStore receipt for an existing product", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.validation.repeated.should.eql(0)
			res.body.validation.purchase.productId.should.eql 'cotc_product1'
			res.body.validation.purchase.storeTransactionId.should.eql transactionId
			validTransactions += 1

			# Should have affected the balance
			request(shuttle)
			.get '/v1/gamer/tx/private/balance'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				if err? then return done(err)
				res.body.money.should.eql(800)

				request(shuttle)
				.get '/v1/gamer/tx/private?limit=9999'
				.set dataset.validAppCredentials
				.auth(gamer_id, gamer_token)
					.type 'json'
					.expect 'content-type', /json/
					.expect 200
					.end (err, res)->
						if err? then return done err
						res.body.history[0].desc.should.eql("My TX")
						done()

	it "should not validate the same receipt twice", (done)->
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.validation.repeated.should.eql(1)
			# Transaction info should always be there except if the purchase was made by another user
			res.body.validation.purchase.storeTransactionId.should.eql transactionId

			# Should not have executed the transaction and thus not affect the balance
			request(shuttle)
			.get '/v1/gamer/tx/private/balance'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				res.body.money.should.eql(800)
				done()

	it "should be able to buy the same item twice", (done)->
		# Should be ok this time since we have another transaction ID
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.validation.repeated.should.eql(0)
			validTransactions += 1

			# Should have affected the balance
			request(shuttle)
			.get '/v1/gamer/tx/private/balance'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				res.body.money.should.eql(1600)
				done()

	it "should not validate receipt for a non-existing product", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_productx","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should not validate receipt for a non-existing AppStore product", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product20","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product20\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 400 # purchase not confirmed
		.end (err, res)->
			done err

	it "should not validate receipt from wrong environment", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(21007)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 400 # purchase not confirmed
		.end (err, res)->
			done err

	it "should return a retryable HTTP code when Apple server is unavailable", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(21005)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 500 # Temp error, retry
		.end (err, res)->
			res.body.name.should.eql "ExternalServerTempError"
			done err

	it "should return a retryable HTTP code for bad responses from Apple", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0, true)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 500 # Temp error, retry
		.end (err, res)->
			res.body.name.should.eql "ExternalServerTempError"
			done err

	it "should return a definitve no for any negative answer from AppStore", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(21002)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"appstore","productId":"cotc_product1","internalProductId":"product1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"product1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 400 # purchase not confirmed
		.end (err, res)->
			res.body.name.should.eql "PurchaseNotConfirmed"
			done err

	it "should not validate cryptographically incorrect receipt for Google product", (done)->
		inappMock.configureNextGoogleRequest(false)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"googleplay","productId":"cotc_product1","receipt":"{\"orderId\":\"12999763169054705758.1389193438727612\",\"packageName\":\"com.clanofthecloud.cli\",\"productId\":\"product2\",\"purchaseTime\":1422881210949,\"purchaseState\":0,\"purchaseToken\":\"aamppgohpklhajmfmjcgeaaa.AO-J1OzMGUw9EBaWiC-dbr3siwh0drKo0C9G9XlIK5zZDHocHfCEW5-VAtFymNIegIJG898v3KV1URsdJF8E_0rSWcE9qAJSJFJwiWrB4y20C3VvlSQ4e6B3oMYMbCm-5IQSYls-nbKC\"}","signature":"DUdQM5nbNXzo08dHKuu2dmUsUDWhk3pUHdNhTm2fMkfjpM3eWkkpeYl20aUpF4CyaPCaxCLP+0dvH+yKmACntqlVEem5s6hYLkkNmLw5LAjO39hTL\/hiv9gg4xNvV7VT80QBZDIv2SN3chV\/IfUB86qPMSztnSP9fTdoaonDAxJCqwheMJeYeV9v+8\/9p20JrvuXz+eOEVYL\/0OItDZcP6Z9hACKjvXEQFcJog4P46toxCTNS8mJfNez6jjX7sjqc+MRwLtUvTV03n7lkO7vie5vj+odhKGwqgotoSPMSFYI2R\/L31NbZHIVleJF8jO+kKVDjDV2nmmJFIYAPbFosw=="}
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should validate receipt for test Google product", (done)->
		inappMock.configureNextGoogleRequest(false)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"googleplay","internalProductId":"android.test.purchased","receipt":"{\"packageName\":\"com.clanofthecloud.cli\",\"orderId\":\"transactionId.android.test.purchased\",\"productId\":\"android.test.purchased\",\"developerPayload\":\"\",\"purchaseTime\":0,\"purchaseState\":0,\"purchaseToken\":\"inapp:com.clanofthecloud.cli:android.test.purchased\"}","signature":"","productId":"cotc_product2","price":0.920763,"currency":"CHF"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			validTransactions += 1
			done err

	it "should not validate receipt for really bought Google product but inexisting in store config", (done)->
		inappMock.configureNextGoogleRequest(true)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send { receipt: '{"orderId":"GPA.1317-4028-5624-55900","packageName":"com.jaddream.rundodorun","productId":"com.jaddream.bt310","purchaseTime":1438590483739,"purchaseState":0,"purchaseToken":"nblgiihjeonlmchmiolgdleo.AO-J1OwDFe_gQG0QsW5Ky_JwxjODS2RtQ2S19AZNdGXQzKiAQmky7wHTOmeszIoPMLDOEarsV7LLQlpf5qrUO97w2OMDezOmozSgKzhtU-rB89UxrSZNOOv2SU3RbPh7Aok3Ys2aclLr"}', price: 1.99, internalProductId: 'com.jaddream.bt310', store: 'googleplay', signature: 'FM4Kkpq2KbbS57svu4mkt0OiuADkTWZCmmG0ytJB4TuOrEMgM35G8NBQXlDAbwYfXYZ9bWJMzeiSU6KbwzfIYtRHx8hIDGg5MTRBZ5oigQ0oYOdDEUoV89Ip/zacxLENSvUm/Fu0pOnexc73E2F0WK26FPDHY5InAyhjzYOshewNfRMybjmd4FaC0gR1QNcmGuUs++yaiolrn1e3bqXnP488JbVpU32WL8UJuA6PYvBlf0iH08HkAMBkqRwJfym7X3BoHsT+qjO2DIY6cJm41nZnf9rgA6pduwhG7gXYwKVJaC9DjPaOg1yQcdUZjxYBtEF2hiGxwQS5emrL3OfunA==', currency: 'EUR', productId: "Product_BT_310" }
		.expect 'content-type', /json/
		.expect 400
		.end (err, res)->
			done err

	it "should validate Mac AppStore receipt for an existing product", (done)->
		transactionId = 'mocked' + new ObjectID()
		inappMock.configureNextAppleRequest(0)

		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"macstore","productId":"cotc_product1","internalProductId":"macproduct1","price":0.990000,"currency":"CHF","receipt":"{\"productId\": \"macproduct1\", \"transaction_id\": \"#{transactionId}\"}"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.validation.repeated.should.eql(0)
			validTransactions += 1

			# Should have affected the balance
			request(shuttle)
			.get '/v1/gamer/tx/private/balance'
			.set dataset.validAppCredentials
			.auth(gamer_id, gamer_token)
			.type 'json'
			.expect 'content-type', /json/
			.expect 200
			.end (err, res)->
				return done err if err?
				res.body.money.should.eql(2400)
				done()

	it "should validate receipt for Google product", (done)->
		request(shuttle)
		.post '/v1/gamer/store/validateReceipt'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.type 'json'
		.send {"store":"googleplay","internalProductId":"product1","receipt":"{\"orderId\":\"12999763169054705758.1368240874747405\",\"packageName\":\"com.clanofthecloud.cli\",\"productId\":\"product1\",\"purchaseTime\":1423671926780,\"purchaseState\":0,\"purchaseToken\":\"emihemjfbajmbgpjdoinolag.AO-J1OyUhRDls9VmNmHKq7qdhgdaiuKMLmEAozGbEugc3cwwkFfIlgL79bcmV_GCX7FWMY_uN84GmCAbO1EKwCxzae_5-bB6eKsQ7RwH_uVWCapMZ0tfaQcBbdIm8KxtGmEfSooi8nqg\"}","signature":"QjScsrT+yPysE9ysuidps6DhTEwuSPNAPEZLRbF+49N8BRR2z7ywq0EtoTi2siXJ25xBuqWtE6OsXOOfYErC/+7yZwnq5IhcL+xX7Y6DHI8ByKkurOn2qA00eEa+Sx51I68vqtn0GFNzk9uB2kFBPEiJINskgOR6e/AgQRdCMtNaGyH8iJglNoNOvRrFCzaFUitTzD1FQpAIWGBK3bH//+Z+CGQwirfsXNicUCproFwokZ8uhI23rsaYnINX4+4dRrE2vMl21VKF4OXWkaa9OE5S4zVe3zcoC/GFT3tTXHIacpNbt+PBqB32jTI0ayz3TxDqhxQVxhGtKLqPwX4xiw==","productId":"cotc_product1","price":0.990000,"currency":"CHF"}
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			res.body.validation.repeated.should.eql 0
			validTransactions += 1
			done err

	it "should retrieve the purchase history", (done)->
		request(shuttle)
		.get '/v1/gamer/store/purchaseHistory'
		.set dataset.validAppCredentials
		.auth(gamer_id, gamer_token)
		.expect 'content-type', /json/
		.expect 200
		.end (err, res)->
			return done err if err?
			# There should be three transactions, one that has been posted twice, one that has been posted once, the mac one and the android.test.purchased one
			res.body.purchases.length.should.eql validTransactions
			res.body.purchases[0].productId.should.eql 'cotc_product1'
			res.body.purchases[1].productId.should.eql 'cotc_product1'
			res.body.purchases[2].productId.should.eql 'cotc_product2'
			done()

	it "should delete the user", (done)->
		xtralife.api.onDeleteUser ObjectID(gamer_id), done, 'com.clanofthecloud.cloudbuilder'
		return null
