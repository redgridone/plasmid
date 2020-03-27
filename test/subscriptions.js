const test = require('ava')
const { initNode, subscribe, head } = require('./test-utils')

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
  t.is(n.feed.length, 1)
  const entry = await head(n)
  t.deepEqual(entry.content, expectedSubscribeContent)
})
