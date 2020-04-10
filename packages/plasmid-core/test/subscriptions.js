const test = require('ava')
const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe, head } = require('../lib').promise

const testKey = '0'.repeat(64)
const testKey2 = '1'.repeat(64)

const expectedSubscribeContent = {
  type: '%subscribe',
  feedKey: testKey,
  details: {},
  options: {}
}

test('Can subscribe to a feed', async t => {
  const n = await initNode(newScratchDir())
  await subscribe(n, testKey, { timestamp: 0 })
  // a %subscribe entry was added
  t.is(n.feed.length, 1)
  const entry = await head(n)
  t.deepEqual(entry.content, expectedSubscribeContent)
  // this caused a new feed to be instantiated
  t.assert(n.foreignFeeds[testKey])
})

test('Can subscribe then unsubscribe', async t => {
  const n = await initNode(newScratchDir())

  await subscribe(n, testKey, { timestamp: 0 })
  t.assert(n.foreignFeeds[testKey])

  await unsubscribe(n, testKey, { timestamp: 0 })
  t.is(n.feed.length, 2)
  const entry = await head(n)
  t.deepEqual(entry.content.type, '%unsubscribe')
  // this removed the foreign feed
  t.is(n.foreignFeeds[testKey], undefined)
})

test('Can subscribe, unsubscribe, resubsubscribe many times...', async t => {
  const n = await initNode(newScratchDir())
  const nIter = 5
  for (let i = 0; i < nIter; i++) {
    await subscribe(n, testKey, { timestamp: 0 })
    t.truthy(n.foreignFeeds[testKey])
    await unsubscribe(n, testKey, { timestamp: 0 })
    t.is(n.foreignFeeds[testKey], undefined)
  }
  t.is(n.feed.length, 2 * nIter)
})

test('Can subscribe to multiple feeds', async t => {
  const n = await initNode(newScratchDir())
  await subscribe(n, testKey, { timestamp: 0 })
  t.is(n.feed.length, 1)
  await subscribe(n, testKey2, { timestamp: 0 })
  t.is(n.feed.length, 2)
  t.assert(n.foreignFeeds[testKey])
  t.assert(n.foreignFeeds[testKey2])
})

test('Can subscribe to the same feed multiple times', async t => {
  const n = await initNode(newScratchDir())
  await subscribe(n, testKey, { timestamp: 0 })
  t.is(n.feed.length, 1)
  await subscribe(n, testKey, { timestamp: 0 })
  t.is(n.feed.length, 2)
  t.assert(n.foreignFeeds[testKey])
})
