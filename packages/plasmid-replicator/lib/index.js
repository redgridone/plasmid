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
    this.node = node
    this.peers = {} // maps from feedKeys to a list of peers

    this.deviceFeedSwarm
      .on('connection', (connection, info) => this._handleConnection(null, connection, info))
    this.deviceFeedSwarm.join(feedKeyToTopic(node.feedKey()), { lookup: true, announce: true })

    node.on('subscribed', feedKey => {
      this.foreignFeedSwarms[feedKey] = hyperswarm(options)
      this.foreignFeedSwarms[feedKey]
        .on('connection', (connection, info) => this._handleConnection(feedKey, connection, info))
      this.foreignFeedSwarms[feedKey].join(feedKeyToTopic(feedKey), { lookup: true, announce: true })
      /**
       * New swarm created event
       * @event Replicator#newSwarm
       * @type string
       */
      this.emit('newSwarm', feedKey)
    })

    node.on('unsubscribed', feedKey => {
      this.foreignFeedSwarms[feedKey].leave(feedKeyToTopic(feedKey))
      delete this.foreignFeedSwarms[feedKey]
      /**
       * Swarm removed event
       * @event Replicator#removedSwarm
       * @type string
       */
      this.emit('removedSwarm', feedKey)
    })
  }

  deviceSwarm () {
    return this.deviceSwarm
  }

  _handleConnection (feedKey, connection, info) {
    const stream = this.node.createReplicationStream(feedKey, info.client, { live: true })
    pump(connection, stream, connection)
    /**
     * New connection event
     * @event Replicator#connection
     * @type object
     */
    this.emit('connection', info)
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
