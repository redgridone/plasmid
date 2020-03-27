/**
 * Promise based utilities to avoid nested callbacks in tests
 */
const crypto = require('crypto')
const Node = require('../lib/node')

function newScratchDir () {
  const unique = crypto.randomBytes(16).toString('hex')
  return `./test/scratch/${unique}`
}

function initNode (path) {
  return new Promise((resolve, reject) => {
    const n = new Node(path)
    n.on('ready', () => {
      resolve(n)
    })
  })
}

function subscribe (node, feedKey, details, options) {
  return new Promise((resolve, reject) => {
    node.subscribe(feedKey, details, options)
    node.on(`subscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function unsubscribe (node, feedKey) {
  return new Promise((resolve, reject) => {
    node.unsubscribe(feedKey)
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
