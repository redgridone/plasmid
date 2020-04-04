const test = require('ava')
const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe, authorEntry } = require('../lib/promise')

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

test('Networking works with multiple nodes', async t => {
  const alice = await initNode(newScratchDir())
  const bob = await initNode(newScratchDir())

  const aliceReplicator = new Replicator(alice)
  const bobReplicator = new Replicator(bob)

  await subscribe(alice, 0, bob.feedKey(), {}, {})

  // wait and check that a connection between alice and bob is made
  const aliceInfo = await new Promise((resolve, reject) => {
    aliceReplicator.on('connection', info => {
      resolve(info)
    })
  })
  const bobInfo = await new Promise((resolve, reject) => {
    bobReplicator.on('connection', info => {
      resolve(info)
    })
  })

  // bob authors an entry to their feed
  const bobEntry = await authorEntry(bob, 0, 'HELLO', {}, 100)

  // wait for alice to receive it
  const aliceEntry = await new Promise((resolve, reject) => {
    alice.on(`newData:${bob.feedKey()}`, (data) => {
      resolve(data)
    })
  })

  // ensure it is was propagated correctly
  t.deepEqual(aliceEntry, bobEntry)
})
