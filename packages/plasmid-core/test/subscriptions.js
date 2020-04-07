const test = require('ava')
const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe, head } = require('../lib').promise

const testKey = '0'.repeat(64)
const expectedSubscribeContent = {
  type: '%subscribe',
  feedKey: testKey,
  details: {},
  options: {}
}

test('Can subscribe to a feed', async t => {
  const n = await initNode(newScratchDir())
  await subscribe(n, 0, testKey, {}, {}, 0)
  // a %subscribe entry was added
  t.is(n.feed.length, 1)
  const entry = await head(n)
  t.deepEqual(entry.content, expectedSubscribeContent)
  // this caused a new feed to be instantiated
  t.assert(n.foreignFeeds[testKey])
})

test('Can subscribe then unsubscribe', async t => {
  const n = await initNode(newScratchDir())
  let sequence = 0

  await subscribe(n, sequence++, testKey, {}, {}, 0)
  t.assert(n.foreignFeeds[testKey])

  await unsubscribe(n, sequence++, testKey, 0)
  t.is(n.feed.length, 2)
  const entry = await head(n)
  t.deepEqual(entry.content.type, '%unsubscribe')
  // this removed the foreign feed
  t.is(n.foreignFeeds[testKey], undefined)
})

test('Can subscribe, unsubscribe, resubsubscribe many times...', async t => {
  const n = await initNode(newScratchDir())
  const nIter = 10
  let sequence = 0
  for (let i = 0; i < nIter; i++) {
    await subscribe(n, sequence++, testKey, {}, {}, 0)
    t.truthy(n.foreignFeeds[testKey])
    await unsubscribe(n, sequence++, testKey, 0)
    t.is(n.foreignFeeds[testKey], undefined)
  }
  t.is(n.feed.length, 2 * nIter)
})
