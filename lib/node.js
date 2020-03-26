const EventEmitter = require('events')
const fs = require('fs')

const hypercore = require('hypercore')

const { validateEntry, newEntry, newSubscribeContent, newUnsubscribeContent } = require('./entries')

class Node extends EventEmitter {
  constructor (storagePath) {
    super()
    this.storagePath = storagePath || '.'
    this.foreignFeeds = {}

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true })
    }

    this.feed = hypercore(`${this.storagePath}/self`, {
      valueEncoding: 'json',
      onwrite: (index, data, peer, cb) => {
        data = { sequence: index, ...data }
        validateEntry(data)
        this.emit('onappend', index, data, peer)
        cb()
      }
    })

    this.foreignFeeds = {}

    // setup an endless stream over the data in the feed to watch for system messages
    // on restart this will begin at the beginning and continue as more is written
    // TODO: This may make initialization slower and we can use caching to speed it up
    this.feed.createReadStream({ live: true, snapshot: false })
      .on('data', data => {
        switch (data.content.type) {
          case '%subscribe':
            this._subscribe(data.content.feedKey, data.timestamp, data.content.details, data.content.options)
            break
          case '%unsubscribe':
            this._unsubscribe(data.content.feedKey, data.content.details, data.content.options)
            break
        }
      })

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
  _subscribe (feedKey, timestamp, details, options) {
    const feed = hypercore(`${this.storagePath}/${feedKey}`, feedKey, {
      valueEncoding: 'json',
      sparse: true
    })
    // endless stream to emit events to consuming code
    feed.createReadStream({ live: true, tail: true, snapshot: false })
      .on('data', (data) => {
        if (data.timestamp > timestamp) { // only emit events on data after the subscribe
          this.emit(`${feedKey}:newData`, data)
        }
      })
    this.foreignFeeds[feedKey] = feed
  }

  _unsubscribe (feedKey) {
    this.foreignFeeds[feedKey].destroy(() => {
      console.log(`feed ${feedKey} has been destroyed`)
    })
    delete this.foreignFeeds[feedKey]
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
