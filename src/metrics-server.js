const http = require('http')
const express = require('express')
const xtralife = require("xtralife-api");
const Promise = require('bluebird')

const app = express()

const metrics = xtralife.api.game.getMetrics()
const collectDefaultMetrics = metrics.collectDefaultMetrics;
const prefix = 'xl_backend_';
collectDefaultMetrics({ prefix });

app.get('/metrics', async (req, res) => {
	res.set("Content-type", metrics.register.contentType)
	const content = await metrics.register.metrics()
	res.send(content)
})

module.exports = new Promise((resolve, reject) => {
	const port = process.env.METRICS_PORT || 10254
	const server = http.createServer(app).listen(port, 256, () => {
		console.log(`Metrics server running on port ${port}`)
		resolve(app)
	})
})