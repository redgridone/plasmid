const EventEmitter = require('events')
const fs = require('fs')

const hypercore = require('hypercore')

const { validateEntry, newEntry } = require('./entries')

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
        validateEntry(data)
        this.emit('onappend', index, data, peer)
        cb()
      }
    })
  }

  subscribe (feedKey, details, options) {
    if (!feedKey) {
      throw new Error('No feed key provided in config for a subscription')
    }
    this.authorEntry({ type: '%subscribe', extraContent: { feedKey, details, options } })
  }

  unsubscribe (feedKey) {
    if (!feedKey) {
      throw new Error('No feed key provided in config for a subscription')
    }
    this.authorEntry({ type: '%unsubscribe', extraContent: { feedKey } })
  }

  authorEntry ({ timestamp, type, extraContent }) {
    const entry = newEntry({
      author: this.feed.key.toString('hex'),
      timestamp: new Date().getTime(),
      type,
      extraContent
    })
    this.feed.append(entry)
  }
}

module.exports = Node
