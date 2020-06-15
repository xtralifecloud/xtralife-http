/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const xtralife = require('xtralife-api');
const errors = require('../errors.js');
const {
	ObjectID
} = require('mongodb');
const {
	checkSchema
} = require('../middleware.js');
const route = require('express').Router({ caseSensitive: true });

const _restrictProductsFields = function (product) {
	const standardAllowedFields = ['productId', 'appStoreId', 'googlePlayId', 'macStoreId'];
	for (let prop in product) { if (!Array.from(standardAllowedFields).includes(prop)) { delete product[prop]; } }
	return product;
};

//####################### Routes ########################
route.route('/products')
	.get(function (req, res, next) {
		// Limit to 30 products by default
		const limit = parseInt(req.query.limit, 10) || 30;
		const skip = parseInt(req.query.skip, 10) || 0;
		return xtralife.api.store.listProducts(req.game, skip, limit, function (err, count, products) {
			if (err != null) { return next(err); }

			for (let product of Array.from(products)) { _restrictProductsFields(product); }
			return res
				.status(200)
				.json({ products, count })
				.end();
		});
	});

route.route('/purchaseHistory')
	.get((req, res, next) => xtralife.api.store.getPurchaseHistory(req.game, req.gamer._id, function (err, purchases) {
		if (err != null) { return next(err); }
		return res
			.status(200)
			.json({ purchases })
			.end();
	}));

route.route('/validateReceipt')
	.post((req, res, next) => xtralife.api.store.validateReceipt(req.context, req.game, req.gamer._id, req.body.store, req.body.productId, req.body.price, req.body.currency, req.body.receipt, req.body.signature, function (err, products) {
		if (err != null) { return next(err); }
		return res
			.status(200)
			.json({ validation: products })
			.end();
	}));

// validateReceipt: (domain, storeType, productId, receiptString, cb)->

module.exports = route;
