const test = require('ava')
const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe } = require('../lib/promise')

const Replicator = require('../lib/replicator')
const testKey = '0'.repeat(64)

test('Adds and removes swarms with subscribe/unsubscribe', async t => {
  const n = await initNode(newScratchDir())
  const r = new Replicator(n)

  t.is(Object.keys(r.foreignFeedSwarms).length, 0)

  await subscribe(n, 0, testKey, {}, {})
  t.is(Object.keys(r.foreignFeedSwarms).length, 1)

  await unsubscribe(n, 1, testKey)
  t.is(Object.keys(r.foreignFeedSwarms).length, 0)
})
