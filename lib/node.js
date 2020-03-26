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

    // on startup go over the whole feed to find the subscriptions and add/remove them
    // TODO: Don't just do this at startup it needs to happen as messages are created
    this.foreignFeeds = {}

    // setup an endless stream over the data in the feed
    // on restart this will begin at the beginning and continue as more is written
    // TODO: This may make initialization slower and we can use caching to speed it up
    this.feed.createReadStream({ live: true, snapshot: false })
      .on('data', data => {
        switch (data.content.type) {
          case '%subscribe':
            this._subscribe(data.content.feedKey, data.content.details, data.content.options)
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

  subscribe (feedKey, details, options) {
    this.authorEntry(newSubscribeContent({ feedKey, details, options }))
  }

  // internal subscribe method, bypasses the feed
  _subscribe (feedKey, details, options) {
    const feed = hypercore(`${this.storagePath}/${feedKey}`, feedKey, {
      valueEncoding: 'json',
      sparse: true
    })
    this.foreignFeeds[feedKey] = feed
  }

  unsubscribe (feedKey) {
    this.authorEntry(newUnsubscribeContent({ feedKey }))
  }

  _unsubscribe (feedKey) {
    this.foreignFeeds[feedKey].destroy(() => {
      console.log(`feed ${feedKey} has been destroyed`)
    })
    delete this.foreignFeeds[feedKey]
  }

  authorEntry (content) {
    const entry = newEntry({
      author: this.feed.key.toString('hex'),
      timestamp: new Date().getTime(),
      content
    })
    this.feed.append(entry)
  }
}

module.exports = Node
