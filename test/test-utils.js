/**
 * Promise based utilities to avoid nested callbacks in tests
 */
const Node = require('../lib/node')

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
    node.subscribe(feedKey, details, options, () => {
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
  subscribe
}
