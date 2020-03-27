const test = require('ava')
const { initNode, subscribe, unsubscribe, head } = require('./test-utils')

const testKey = '0'.repeat(64)
const expectedSubscribeContent = {
  type: '%subscribe',
  feedKey: testKey,
  details: {},
  options: {}
}

test('Can subscribe to a feed', async t => {
  const n = await initNode('./test/scratch/0')
  await subscribe(n, testKey, {}, {})
  // a %subscribe entry was added
  t.is(n.feed.length, 1)
  const entry = await head(n)
  t.deepEqual(entry.content, expectedSubscribeContent)
  // this caused a new feed to be instantiated
  t.assert(n.foreignFeeds[testKey])
})

test('Can subscribe then unsubscribe', async t => {
  const n = await initNode('./test/scratch/1')

  await subscribe(n, testKey, {}, {})
  t.assert(n.foreignFeeds[testKey])

  await unsubscribe(n, testKey)
  t.is(n.feed.length, 2)
  const entry = await head(n)
  t.deepEqual(entry.content.type, '%unsubscribe')

  t.is(n.foreignFeeds[testKey], undefined)
})
