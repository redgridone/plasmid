const EventEmitter = require('events')
const fs = require('fs')
const { validate } = require('jsonschema')

const hypercore = require('hypercore')

const {
  newEntry,
  validateEntry,
  SYS_ENTRIES
} = require('./entries')

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
    this.feedAliases = {} // maps from an alias string to a feed key
    this.feedReadStreams = {}
    this.capabilities = {} // maps from feedKey to list of schemas that content they are granted to author on this nodes feed

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
          case SYS_ENTRIES.GRANT:
            this._grant(data)
            break
          case SYS_ENTRIES.REVOKE:
            this._revoke(data)
            break
          default:
            // a non-system entry was authored
        }
        this.emit('authoredEntry', data)
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
  createWriteStream (options) {
    return this.feed.createWriteStream(options)
  }

  /**
   * Create a return a read stream for either this nodes feed or a feed it is following
   *
   * @param      {string}  [feedKey] - Key of feed to create stream of. Node must already be subscribed to the feed.
   *   If nothing is provided this returns a read stream of this nodes feed.
   * @param      {Object} options={} See hypercore docs for createReadStream
   * @return     {ReadableStream} - A streamx ReadableStream for the feed
   */
  createReadStream (feedKey, options) {
    if (feedKey) {
      return this.foreignFeeds[feedKey].createReadStream(options)
    } else {
      return this.feed.createReadStream(options)
    }
  }

  createReplicationStream (feedKey, isInitiator, options) {
    if (feedKey) {
      return this.foreignFeeds[feedKey].replicate(isInitiator, options)
    } else {
      return this.feed.replicate(isInitiator, options)
    }
  }

  feedKey () {
    return this.feed.key.toString('hex')
  }

  feedKeyBuffer () {
    return this.feed.key
  }

  /* ----------  Internal methods  ---------- */

  _subscribe ({ timestamp, content: { feedKey, details, options } }) {
    const feed = hypercore(`${this.storagePath}/${feedKey}`, feedKey, {
      valueEncoding: 'json',
      sparse: true
    })
    feed.on('ready', () => {
      this.foreignFeeds[feedKey] = feed
      this.emit('subscribed', feedKey)
      this.emit(`subscribed:${feedKey}`, details, options)
    })
    // if provided, also register under the alias
    if (options && options.alias && typeof options.alias === 'string') {
      this.feedAliases[options.alias] = feedKey
      this.emit(`subscribed:${options.alias}`, details, options)
    }
    // endless stream to emit events to consuming code
    this.feedReadStreams[feedKey] = feed.createReadStream({ live: true, tail: true, snapshot: false })
      .on('data', (data) => {
        if (data.timestamp >= timestamp) { // only emit events on data after the subscribe
          this.emit(`newData:${feedKey}`, data, details)
          // check if this feedKey is currently registered to any aliases and also emit events for those
          Object.keys(this.feedAliases)
            .filter(alias => this.feedAliases[alias] === feedKey)
            .forEach(alias => this.emit(`newData:${alias}`, data, details))

          // check of this is a remote author request and we have granted capabilities for this content
          if (data.content.type === SYS_ENTRIES.REMOTE_AUTHOR &&
              this.capabilities[feedKey] &&
              validate(data.content.remoteContent, this.capabilities[feedKey]).valid) {
            this.feed.append(newEntry(
              this.feedKey(),
              this.feed.length,
              new Date().getTime(),
              data.content.remoteContent,
              data.author // the remote author
            ))
          }
        }
      })
  }

  _unsubscribe ({ content: { feedKey } }) {
    this.feedReadStreams[feedKey].destroy()
    this.foreignFeeds[feedKey].destroy(() => {
      delete this.foreignFeeds[feedKey]
      this.emit('unsubscribed', feedKey)
      this.emit(`unsubscribed:${feedKey}`)
      // also unregister any aliases
      Object.keys(this.feedAliases)
        .filter(alias => this.feedAliases[alias] === feedKey)
        .forEach(alias => {
          delete this.feedAliases[alias]
          this.emit(`unsubscribed:${alias}`)
        })
    })
  }

  _grant ({ content: { feedKey, contentValidationSchema } }) {
    this.capabilities[feedKey] = contentValidationSchema
    this.emit(`grant:${feedKey}`)
  }

  _revoke ({ content: { feedKey } }) {
    delete this.capabilities[feedKey]
    this.emit(`revoke:${feedKey}`)
  }
}

module.exports = Node
