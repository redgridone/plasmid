const test = require('ava')

const { initNode, subscribe, unsubscribe, authorEntry } = require('../../lib').promise
const { bootstrapNodes } = require('./multi-node-bootstrapper')

test('A node can subscribe to another using replication streams', async t => {
  const [alice, bob] = await bootstrapNodes(2)

  // alice subscribes to bob
  await subscribe(alice, bob.feedKey(), { timestamp: 0 })

  // bob authors an entry to their feed
  const bobEntry = await authorEntry(bob, 'HELLO', {}, { timestamp: 100 })

  // wait for alice to receive it
  const aliceEntry = await new Promise((resolve, reject) => {
    alice.on(`newData:${bob.feedKey()}`, (data) => {
      resolve(data)
    })
  })

  // ensure it is was propagated correctly
  t.deepEqual(aliceEntry, bobEntry)
})

test('Can subscribe to a feed with an alias, details are passed to event', async t => {
  const [alice, bob] = await bootstrapNodes(2)
  await subscribe(alice, bob.feedKey(), { details: { someField: 'passed-to-every-event' }, options: { alias: 'some-alias' }, timestamp: 0 })
  const bobAuthoredEntry = await authorEntry(bob, 'HELLO', {}, { timestamp: 100 })
  const aliceReceivedEntry = await new Promise((resolve, reject) => {
    alice.on('newData:some-alias', (data, details) => {
      t.is(details.someField, 'passed-to-every-event')
      resolve(data)
    })
  })
  t.deepEqual(aliceReceivedEntry, bobAuthoredEntry)
})

test('Subscribing different feeds to the same alias, only the later one gives events', async t => {
  const [alice, bob, carol] = await bootstrapNodes(3)

  await subscribe(alice, bob.feedKey(), { options: { alias: 'some-alias' }, timestamp: 0 })
  await subscribe(alice, carol.feedKey(), { options: { alias: 'some-alias' }, timestamp: 0 })

  await authorEntry(bob, 'HELLO', { msg: 'hi from bob' }, { timestamp: 100 })
  await authorEntry(carol, 'HELLO', { msg: 'hi from carol' }, { timestamp: 100 })

  // should only receive alias event from Carol
  await new Promise((resolve, reject) => {
    alice.on('newData:some-alias', (data, details) => {
      t.is(data.author, carol.feedKey())
      resolve(data)
    })
  })
})

test('Unsubscribing removes registered alias', async t => {
  const [alice, bob] = await bootstrapNodes(2)

  await subscribe(alice, bob.feedKey(), { }, { alias: 'some-alias' }, { timestamp: 0 })
  await unsubscribe(alice, bob.feedKey(), { timestamp: 1 })

  t.is(alice.feedAliases['some-alias'], undefined)
})

test('A node subscribing can be closed and reinitialized', async t => {
  const [alice, bob] = await bootstrapNodes(2)
  const alicePath = alice.storagePath
  await subscribe(alice, bob.feedKey(), { timestamp: 0 })
  alice.close()
  const aliceReborn = await initNode(alicePath)
  t.is(aliceReborn.foreignFeeds[bob.feedKey])
})
