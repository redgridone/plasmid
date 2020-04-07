const EventEmitter = require('events')
const hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const pump = require('pump')

/**
 * Set up a node to replicate its own feed and any feeds it subscribes to.
 * This makes use of Hyperswarm to locate other peers who have or are interested in the feeds this node has
 * Currently this creates a swarm instance per foreign feed and does not reuse connections.
 * This can probably be improved upon in the future using multiplexing.
 * @example
 *   const { initNode } = require('plasmid-core').promise
 * const node = await initNode('./node-storage')
 * const replicator = new Replicator(node)
 * // The feeds of this node are now replicated peer-to-peer!
 */
class Replicator extends EventEmitter {
  /**
   * Construct a new replicator instance.
   *
   * @param      {plasmid-core}  node     A plasmid core node instance to replicate
   * @param      {Object}  options  Options passed directly to hyperswarm constructors. Use with caution
   */
  constructor (node, options) {
    super()
    this.deviceFeedSwarm = hyperswarm(options)
    this.foreignFeedSwarms = {}
    this.node = node
    this.peers = {} // maps from feedKeys to a list of peers

    this.deviceFeedSwarm
      .on('connection', (connection, info) => this._handleConnection(null, connection, info))
    this.deviceFeedSwarm
      .on('disconnection', (connection, info) => this._handleDisconnection(null, info))
    this.deviceFeedSwarm.join(feedKeyToTopic(node.feedKey()), { lookup: true, announce: true })

    node.on('subscribed', feedKey => {
      this.foreignFeedSwarms[feedKey] = hyperswarm(options)
      this.foreignFeedSwarms[feedKey]
        .on('connection', (connection, info) => this._handleConnection(feedKey, connection, info))
      this.deviceFeedSwarm
        .on('disconnection', (connection, info) => this._handleDisconnection(feedKey, info))
      this.foreignFeedSwarms[feedKey].join(feedKeyToTopic(feedKey), { lookup: true, announce: true })
      /**
       * New swarm created event
       * This event is emitted whenever a node is first set up to replicate or when it adds a new subscription
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
       * This event is emitted when a node removes a subscription
       * @event Replicator#removedSwarm
       * @type string
       */
      this.emit('removedSwarm', feedKey)
    })
  }

  /**
   * Return the swarm for this devices own feed
   *
   * @return     {Hyperswarm}  The swarm instance for this nodes own feed
   */
  deviceSwarm () {
    return this.deviceSwarm
  }

  _handleConnection (feedKey, connection, info) {
    const stream = this.node.createReplicationStream(feedKey, info.client, { live: true })
    pump(connection, stream, connection)
    if (info.peer) {
      const { topic, ...peer } = info.peer
      this.peers[feedKey || 'self'] = [peer, ...(this.peers[feedKey || 'self'] || [])]
    }
    /**
     * Connect to peer event.
     * Emitted when a new peer is discovered for a feed of interest and a connection is established
     * @event Replicator#connection
     * @type object
     */
    this.emit('connection', info)
  }

  _handleDisconnection (feedKey, info) {
    if (info.peer) {
      const { topic, ...peer } = info.peer
      // remove peer entries identical to this one.
      // This may not be perfect...
      this.peers[feedKey || 'self'] = (this.peers[feedKey || 'self'] || []).filter(p => {
        return JSON.stringify(p) !== JSON.stringify(peer)
      })
    }
    /**
     * Disconnect from peer event.
     * Emitted when a peer is disconnected
     * @event Replicator#disconnection
     * @type object
     */
    this.emit('disconnection', info)
  }
}

module.exports = Replicator

function feedKeyToTopic (feedKey) {
  return crypto.createHash('sha256')
    .update(feedKey)
    .digest()
}
