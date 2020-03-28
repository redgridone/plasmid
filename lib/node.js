const EventEmitter = require('events')
const fs = require('fs')

const hypercore = require('hypercore')

const {
  validateEntry,
  SYS_ENTRIES
} = require('./entries')

/**
 * Class describing a Plasmid Node. A node is a entity in the network identified by its public key.
 * It is able to subscribe to other feeds or delegate to other nodes to author to its own feed.
 *
 * @class      Node
 */
class Node extends EventEmitter {
  /**
   * Create a new node that writes its feed and following feeds to the filesystem
   *
   * @param      {string}  storagePath  Where this node will store all its feed data
   */
  constructor (storagePath) {
    super()
    this.storagePath = storagePath || '.'
    this.foreignFeeds = {}
    this.feedReadStreams = {}
    this.delegateFeeds = {}
    this.delegateReadStreams = {}

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true })
    }

    this.feed = hypercore(`${this.storagePath}/self`, {
      valueEncoding: 'json',
      onwrite: (index, data, peer, cb) => {
        if (index !== data.sequence) {
          throw new Error(`Sequence number in entry is not correct. Expected ${index} got ${data.sequence}`)
        }
        validateEntry(data)
        this.emit('onappend', index, data, peer)
        cb()
      }
    })

    this.feed.on('ready', () => {
      this.emit('ready')
    })

    // setup an endless stream over the data in the feed to watch for system messages
    // on restart this will begin at the beginning and continue as more is written
    // TODO: This may make initialization slower and we can use caching to speed it up
    this.readStream = this.feed.createReadStream({ live: true, snapshot: false })
    this.readStream
      .on('data', data => {
        switch (data.content.type) {
          case SYS_ENTRIES.SUBSCRIBE:
            this._subscribe(data)
            break
          case SYS_ENTRIES.UNSUBSCRIBE:
            this._unsubscribe(data)
            break
          case SYS_ENTRIES.DELEGATE:
            this._subscribeDelegate(data)
            break
          case SYS_ENTRIES.UNDELEGATE:
            this._unsubscribeDelegate(data)
            break
        }
      })
  }

  /**
   * Close this node including its feeds and streams
   */
  close () {
    this.readStream.destroy()
    this.feed.close()
  }

  /**
   * Creates a write stream to this nodes feed
   * Note that all entries are validated on write to meet the Plasmid entry requirements
   *
   * @return     {WritableStream} - A streamx WritableStream to this nodes feed
   */
  createWriteStream () {
    return this.feed.createWriteStream()
  }

  /**
   * Create a return a read stream for either this nodes feed or a feed it is following
   *
   * @param      {string}  [feedKey] - Key of feed to create stream of. Node must already be subscribed to the feed.
   *   If nothing is provided this returns a read stream of this nodes feed.
   * @return     {ReadableStream} - A streamx ReadableStream for the feed
   */
  createReadStream (feedKey) {
    if (feedKey) {
      return this.foreignFeeds[feedKey].createReadStream()
    } else {
      return this.feed.createReadStream()
    }
  }

  /* ----------  Internal methods  ---------- */

  _subscribe ({ timestamp, content: { feedKey, details, options } }) {
    const feed = hypercore(`${this.storagePath}/${feedKey}`, feedKey, {
      valueEncoding: 'json',
      sparse: true
    })
    feed.on('ready', () => {
      this.foreignFeeds[feedKey] = feed
      this.emit(`subscribed:${feedKey}`, details, options)
    })
    // endless stream to emit events to consuming code
    this.feedReadStreams[feedKey] = feed.createReadStream({ live: true, tail: true, snapshot: false })
      .on('data', (data) => {
        if (data.timestamp > timestamp) { // only emit events on data after the subscribe
          this.emit(`newData:${feedKey}`, data)
        }
      })
  }

  _unsubscribe ({ content: { feedKey } }) {
    this.feedReadStreams[feedKey].destroy()
    this.foreignFeeds[feedKey].destroy(() => {
      delete this.foreignFeeds[feedKey]
      this.emit(`unsubscribed:${feedKey}`)
    })
  }

  _subscribeDelegate ({ timestamp, content: { feedKey, details, options } }) {
    const feed = hypercore(`${this.storagePath}/${feedKey}`, feedKey, {
      valueEncoding: 'json',
      sparse: true
    })
    feed.on('ready', () => {
      this.delegateFeeds[feedKey] = feed
      this.emit(`delegating:${feedKey}`, details, options)
    })
    // stream from the delegate feed into the node feed
    // TODO: Rewrite this to make better use of streams
    this.delegateReadStreams[feedKey] = feed.createReadStream({ live: true, tail: true, snapshot: false })
      .on('data', (data) => {
        if (data.timestamp > timestamp) {
          this.authorEntry({ onBehalfOf: feedKey, ...data })
        }
      })
  }

  _unsubscribeDelegate ({ content: { feedKey } }) {
    this.delegateReadStreams[feedKey].destroy()
    this.delegateFeeds[feedKey].destroy(() => {
      delete this.delegateFeeds[feedKey]
      this.emit(`undelegated:${feedKey}`)
    })
  }
}

module.exports = Node
