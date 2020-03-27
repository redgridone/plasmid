const EventEmitter = require('events')
const fs = require('fs')

const _ = require('highland')
const hypercore = require('hypercore')

const { validateEntry, newEntry, newSubscribeContent, newUnsubscribeContent, filters: { onlySubscribe, onlyUnsubscribe } } = require('./entries')

class Node extends EventEmitter {
  constructor (storagePath) {
    super()
    this.storagePath = storagePath || '.'
    this.foreignFeeds = {}
    this.feedReadStreams = {}

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

    // setup an endless stream over the data in the feed to watch for system messages
    // on restart this will begin at the beginning and continue as more is written
    // TODO: This may make initialization slower and we can use caching to speed it up
    const stream = _(this.feed.createReadStream({ live: true, snapshot: false }))

    stream
      .fork()
      .filter(onlySubscribe)
      .each(data => this._subscribe(data))

    stream
      .fork()
      .filter(onlyUnsubscribe)
      .each(data => this._unsubscribe(data))

    this.feed.on('ready', () => {
      this.emit('ready')
    })
  }

  subscribe (feedKey, details, options, callback) {
    this.authorEntry(newSubscribeContent({ feedKey, details, options }), callback)
  }

  unsubscribe (feedKey, callback) {
    this.authorEntry(newUnsubscribeContent({ feedKey }), callback)
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
