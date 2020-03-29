/**
 * Add a promise interface to a plasmid node
 * @module promise
 */

const Node = require('./node')
const { newEntry, newSubscribeContent, newUnsubscribeContent } = require('./entries')

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

function subscribe (node, sequence, feedKey, details, options) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence,
      timestamp: 0,
      content: newSubscribeContent({ feedKey, details, options })
    }))
    node.on(`subscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function unsubscribe (node, sequence, feedKey) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence,
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
  initNode,
  head,
  subscribe,
  unsubscribe
}