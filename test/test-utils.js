/**
 * Promise based utilities to avoid nested callbacks in tests
 */
const crypto = require('crypto')
const Node = require('../lib/node')
const { newEntry, newSubscribeContent, newUnsubscribeContent } = require('../lib/entries')

function newScratchDir () {
  const unique = crypto.randomBytes(16).toString('hex')
  return `./test/scratch/${unique}`
}

function initNode (path) {
  return new Promise((resolve, reject) => {
    const n = new Node(path)
    n.on('ready', (err) => {
      if (err) reject(err)
      resolve(n)
    })
    n.on('error', (err) => {
      reject(err)
    })
  })
}

function subscribe (node, feedKey, details, options) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence: 0,
      timestamp: 0,
      content: newSubscribeContent({ feedKey, details, options })
    }))
    node.on(`subscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function unsubscribe (node, feedKey) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence: 0,
      timestamp: 0,
      content: newUnsubscribeContent({ feedKey })
    }))
    node.on(`unsubscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function head (node) {
  return new Promise((resolve, reject) => {
    node.feed.head({}, (err, data) => {
      if (err) throw err
      resolve(data)
    })
  })
}

module.exports = {
  newScratchDir,
  initNode,
  head,
  subscribe,
  unsubscribe
}
