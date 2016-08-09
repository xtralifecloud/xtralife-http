xtralife = require 'xtralife-api'
errors = require '../errors.coffee'
ObjectID = require('mongodb').ObjectID
checkSchema = require('../middleware.coffee').checkSchema
route = require('express').Router caseSensitive: true

_restrictProductsFields = (product)->
	standardAllowedFields = ['productId', 'appStoreId', 'googlePlayId', 'macStoreId']
	delete product[prop] for prop of product when prop not in standardAllowedFields
	product

######################## Routes ########################
route.route '/products'
.get (req, res, next)->
	# Limit to 30 products by default
	limit = parseInt(req.query.limit, 10) or 30
	skip = parseInt(req.query.skip, 10) or 0
	xtralife.api.store.listProducts req.game, skip, limit, (err, count, products)->
		if err? then return next err

		_restrictProductsFields product for product in products
		res
		.status 200
		.json {products: products, count: count}
		.end()

route.route '/purchaseHistory'
.get (req, res, next)->
	xtralife.api.store.getPurchaseHistory req.game, req.gamer._id, (err, purchases)->
		if err? then return next err
		res
		.status 200
		.json {purchases: purchases}
		.end()

route.route '/validateReceipt'
.post (req, res, next)->
	xtralife.api.store.validateReceipt req.context, req.game, req.gamer._id, req.body.store, req.body.productId, req.body.price, req.body.currency, req.body.receipt, req.body.signature, (err, products)->
		if err? then return next err
		res
		.status 200
		.json {validation: products}
		.end()

# validateReceipt: (domain, storeType, productId, receiptString, cb)->

module.exports = route
