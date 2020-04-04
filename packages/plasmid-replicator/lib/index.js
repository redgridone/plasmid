const EventEmitter = require('events')
const hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const pump = require('pump')

/**
 * Set up a node to replicate its own feed and any feeds it subscribes to
 * Makes use of Hyperswarm to locate other peers who have or are interested in the feeds this node has
 * Currently this creates a swarm instance per foreign feed and does not reuse connections.
 * This can probably be improved upon in the future using multiplexing
 *
 * @param      {Node}  node     The node to replicate
 * @param      {Object}  options  The options object passed directly to the hyperswarm constructor
 */
class Replicator extends EventEmitter {
  constructor (node, options) {
    super()
    this.deviceFeedSwarm = hyperswarm(options)
    this.foreignFeedSwarms = {}

    this.deviceFeedSwarm.on('connection', function (connection, info) {
      const stream = node.createReplicationStream(null, info.client, {})
      pump(connection, stream, connection)
      this.emit('connection', info)
    })
    this.deviceFeedSwarm.join(feedKeyToTopic(node.feedKey()))

    node.on('subscribed', feedKey => {
      this.foreignFeedSwarms[feedKey] = hyperswarm(options)
      this.foreignFeedSwarms[feedKey].on('connection', function (connection, info) {
        const stream = node.createReplicationStream(feedKey, info.client, {})
        pump(connection, stream, connection)
        this.emit('connection', info)
      })
      this.foreignFeedSwarms[feedKey].join(feedKeyToTopic(feedKey))
      this.emit('newSwarm', feedKey)
    })

    node.on('unsubscribed', feedKey => {
      this.foreignFeedSwarms[feedKey].leave(feedKeyToTopic(feedKey))
      delete this.foreignFeedSwarms[feedKey]
      this.emit('removedSwarm', feedKey)
    })
  }

  deviceSwarm () {
    return this.deviceSwarm
  }
}

module.exports = Replicator

/**
 * Hashes the feed key to create the topic
 *
 * @param      {string}  feedKey  The feed key
 * @return     {Buffer}  Buffer containing the hash of the key
 */
function feedKeyToTopic (feedKey) {
  return crypto.createHash('sha256')
    .update(feedKey)
    .digest()
}
