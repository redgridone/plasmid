/**
 * A promise based API to make working with plasmid node objects a breeze
 * @module promise
 */

const Node = require('./node')
const { newEntry, newSubscribeContent, newUnsubscribeContent, newGrantContent, newRevokeContent } = require('./entries')

/**
 * Initialize a new node and wait for it to be ready
 *
 * @param      {string}   path    The path to use for the node persistent storage
 * @return     {Promise<Node>}  Promise that resolves with the newly initialized node
 */
module.exports.initNode = function (path) {
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

/**
 * Wait for a node to author a subscribe message and initialize the foreign feed
 *
 * @param      {Node}   node           The node
 * @param      {string}   feedKey        The feed key
 * @param      {object}   [opts={}]  Optional parameters
 * @param      {number}   opts.sequence    The sequence number of the entry that is created. Defaults to node.feed.length
 * @param      {number}   opts.timestamp  Timestamp of created entry. Defaults to current timestamp
 * @param      {object}   [details={}]       The details
 * @param      {object}   [options={}]       The options
 * @return     {Promise}
 */
module.exports.subscribe = function (node, feedKey, { sequence, timestamp, details, options } = {}) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry(
      node.feedKey(),
      getOrUseSequence(node, sequence),
      getOrUseTimestamp(timestamp),
      newSubscribeContent(feedKey, details, options)
    ))
    node.on(`subscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

/**
 * Wait for a node to author an unsubscribe message and destroy feed
 *
 * @param      {Node}   node       The node
 * @param      {string}   feedKey    The feed key
 * @param      {object}   [opts={}]  Optional parameters
 * @param      {number}   opts.sequence    The sequence number of the entry that is created. Defaults to node.feed.length
 * @param      {number}   opts.timestamp  Timestamp of created entry. Defaults to current timestamp
 * @return     {Promise}
 */
module.exports.unsubscribe = function (node, feedKey, { sequence, timestamp } = {}) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry(
      node.feedKey(),
      getOrUseSequence(node, sequence),
      getOrUseTimestamp(timestamp),
      newUnsubscribeContent(feedKey)
    ))
    node.on(`unsubscribed:${feedKey}`, () => {
      resolve()
    })
  })
}

/**
 * Wait for a node to author a grant entry
 *
 * @param      {Node}   node                      The node
 * @param      {string}   feedKey                   The feed key
 * @param      {object}   [opts={}]  Optional parameters
 * @param      {number}   opts.sequence    The sequence number of the entry that is created. Defaults to node.feed.length
 * @param      {number}   opts.timestamp  Timestamp of created entry. Defaults to current timestamp
 * @param      {JsonSchema}   [opts.remoteContentSchema={}]  The remote content schema
 * @return     {Promise}
 */
module.exports.grant = function (node, feedKey, { sequence, timestamp, remoteContentSchema } = {}) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry(
      node.feedKey(),
      getOrUseSequence(node, sequence),
      getOrUseTimestamp(timestamp),
      newGrantContent(feedKey, remoteContentSchema)
    ))
    node.on(`grant:${feedKey}`, () => {
      resolve()
    })
  })
}

/**
 * Wait for a node to author a revoke entry
 *
 * @param      {Node}     node                      The node
 * @param      {string}   feedKey                   The feed key
 * @param      {object}   [opts={}]  Optional parameters
 * @param      {number}   opts.sequence    The sequence number of the entry that is created. Defaults to node.feed.length
 * @param      {number}   opts.timestamp  Timestamp of created entry. Defaults to current timestamp
 * @return     {Promise}
 */
module.exports.revoke = function (node, feedKey, { sequence, timestamp } = {}) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry(
      node.feedKey(),
      getOrUseSequence(node, sequence),
      getOrUseTimestamp(timestamp),
      newRevokeContent(feedKey)
    ))
    node.on(`revoke:${feedKey}`, () => {
      resolve()
    })
  })
}

/**
 * Wait for a node to author an entry to its feed
 *
 * @param      {Node}   node           The node
 * @param      {string}   type           The type
 * @param      {object}   otherContent   The other content
 * @param      {object}   [opts={}]  Optional parameters
 * @param      {number}   opts.sequence    The sequence number of the entry that is created. Defaults to node.feed.length
 * @param      {number}   opts.timestamp  Timestamp of created entry. Defaults to current timestamp
 * @return     {Promise<Object>}  The entry that was actually authored
 */
module.exports.authorEntry = function (node, type, otherContent, { sequence, timestamp } = {}) {
  return new Promise((resolve, reject) => {
    node.createWriteStream().write(newEntry(
      node.feedKey(),
      getOrUseSequence(node, sequence),
      getOrUseTimestamp(timestamp),
      {
        type,
        ...otherContent
      }
    ))
    node.on('authoredEntry', entry => {
      resolve(entry)
    })
  })
}

/**
 * Get the entry at the top of this nodes feed
 *
 * @param      {Node}   node    The node
 * @return     {Promise<Object>}  Entry at the top of the nodes feed
 */
module.exports.head = function (node) {
  return new Promise((resolve, reject) => {
    node.feed.head({}, (err, data) => {
      if (err) throw err
      resolve(data)
    })
  })
}

function getOrUseTimestamp (timestamp) {
  if (typeof timestamp === 'number') {
    return timestamp
  } else {
    return new Date().getTime()
  }
}

function getOrUseSequence (node, sequence) {
  if (typeof sequence === 'number') {
    return sequence
  } else {
    return node.feed.length
  }
}
