const EventEmitter = require('events')
const fs = require('fs')

const hypercore = require('hypercore')

const {
  validateEntry,
  newEntry,
  newSubscribeContent,
  newUnsubscribeContent,
  newDelegateContent,
  newUndelegateContent,
  SYS_ENTRIES
} = require('./entries')

class Node extends EventEmitter {
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

  close () {
    this.readStream.destroy()
    this.feed.close()
  }

  subscribe (feedKey, details, options, callback) {
    this.authorEntry(newSubscribeContent({ feedKey, details, options }), callback)
  }

  unsubscribe (feedKey, callback) {
    this.authorEntry(newUnsubscribeContent({ feedKey }), callback)
  }

  delegate (feedKey, details, options, callback) {
    this.authorEntry(newDelegateContent({ feedKey, details, options }), callback)
  }

  undelegate (feedKey, callback) {
    this.authorEntry(newUndelegateContent({ feedKey }), callback)
  }

  // internal methods, bypasses the feed
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

  authorEntry (content, callback) {
    const entry = newEntry({
      author: this.feed.key.toString('hex'),
      timestamp: new Date().getTime(),
      sequence: this.feed.length,
      content
    })
    this.feed.append(entry, callback)
  }
}

module.exports = Node
