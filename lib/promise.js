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

function subscribe (node, sequence, feedKey, details, options, timestamp=0) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence,
      timestamp,
      content: newSubscribeContent({ feedKey, details, options })
    }))
    node.on(`subscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function unsubscribe (node, sequence, feedKey, timestamp=0) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence,
      timestamp,
      content: newUnsubscribeContent({ feedKey })
    }))
    node.on(`unsubscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

function authorEntry(node, sequence, type, otherContent, timestamp=0) {
  return new Promise((resolve, reject) => {
    const entry = 
    node.createWriteStream().write(newEntry({
      author: node.feed.key.toString('hex'),
      sequence,
      timestamp,
      content: {
        type,
        ...otherContent
      }
    }))
    node.on(`authoredEntry`, entry => {
      resolve(entry)
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
  unsubscribe,
  authorEntry
}