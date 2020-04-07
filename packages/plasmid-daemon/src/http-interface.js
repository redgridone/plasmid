const { subscribe } = require('plasmid-core').promise

// takes an express app instance and a device and sets up this device daemons HTTP endpoints
module.exports = (app, node) => {
  app.use(require('body-parser').text())

  /**
   * @swagger
   *
   * /:
   *   get:
   *     description: Return some basic information about this device
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: device info
   *         schema:
   *           type: object
   *           properties:
   *             feedKey:
   *               type: string
   *             subscriptions:
   *               type: array
   *             capabilities:
   *               type: object
   */
  app.get('/', (req, res) => {
    res.json({
      feedKey: node.feedKey(),
      subscriptions: Object.keys(node.foreignFeeds),
      capabilities: node.capabilities
    })
  })

  /**
   * @swagger
   *
   * /feed/{feedKey}:
   *   get:
   *     description: Get information about a particular feed
   *     produces:
   *       - application/json
   *     parameters:
   *       - in: path
   *         name: feedKey
   *         schema:
   *           type: string
   *           default: self
   *         required: true
   *         description: Either 'self' to query this devices feed or the hex encoded public key of a feed this device follows
   *     responses:
   *       200:
   *         description: feed info
   *         schema:
   *           type: object
   *           properties:
   *             length:
   *               type: integer
   */
  app.get('/feed/:feed_key([0-91-f]{64}|self)', (req, res) => {
    const feedKey = req.params.feed_key
    const feed = feedKey === 'self' ? node.feed : node.foreignFeeds[feedKey]
    if (feed) {
      res.json({ length: feed.length })
    } else {
      throw new Error(`No subscribed feed matching key ${feedKey}`)
    }
  })

  /**
   * @swagger
   *
   * /feed/{feedKey}/get_batch:
   *   get:
   *     description: Return data from a particular feed
   *     produces:
   *       - application/json
   *     parameters:
   *       - in: path
   *         name: feedKey
   *         schema:
   *           type: string
   *           default: self
   *         required: true
   *         description: Either 'self' to query this devices feed or the hex encoded public key of a feed this device follows
   *
   *       - in: query
   *         name: start
   *         schema:
   *           type: integer
   *           default: 0
   *           minimum: 0
   *         required: false
   *         description: Return blocks starting at this sequence number (inclusive)
   *
   *       - in: query
   *         name: end
   *         schema:
   *           type: integer
   *           minimum: 0
   *         required: false
   *         description: Return blocks ending at this sequence number (non-inclusive)
   *     responses:
   *       200:
   *         description: Array of blocks in the given feed
   *         schema:
   *           type: array
   */
  app.get('/feed/:feed_key([0-91-f]{64}|self)/get_batch', (req, res) => {
    const feedKey = req.params.feed_key
    const feed = feedKey === 'self' ? node.feed : node.foreignFeeds[feedKey]
    const start = req.query.start || 0
    const end = req.query.end || feed.length

    if (feed.length <= 0) {
      res.json([])
      return
    }

    if (feed) {
      feed.getBatch(start, end, { wait: false, valueEncoding: 'json' }, (err, data) => {
        if (err) throw new Error(`Could not retrieve data from feed: ${err}`)
        res.json(data)
      })
    } else {
      throw new Error(`No subscribed feed matching key ${feedKey}`)
    }
  })

  /**
   * @swagger
   *
   * /subscribe/{feedKey}:
   *   post:
   *     description: Subscribe to the feed with the key given
   *     produces:
   *       - text/plain
   *     parameters:
   *       - in: path
   *         name: feedKey
   *         schema:
   *           type: string
   *         required: true
   *         description: Hex encoded public key of the feed this device should subscribe to
   *     responses:
   *       200:
   *         description: Returned if the feed was subscribed to successfully
   */
  app.post('/subscribe/:feed_key([0-91-f]{64})', async (req, res) => {
    const feedKey = req.params.feed_key
    await subscribe(node, node.feed.length, feedKey, {}, {})
    res.sendStatus(200)
  })
}
