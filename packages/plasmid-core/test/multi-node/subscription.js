const test = require('ava')

const { subscribe, unsubscribe, authorEntry } = require('../../lib').promise
const { bootstrapNodes } = require('./multi-node-bootstrapper')

test('A node can subscribe to another using replication streams', async t => {
  const [alice, bob] = await bootstrapNodes(2)

  // alice subscribes to bob
  await subscribe(alice, 0, bob.feedKey(), {}, {})

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

test('Can subscribe to a feed with an alias, details are passed to event', async t => {
  const [alice, bob] = await bootstrapNodes(2)
  await subscribe(alice, 0, bob.feedKey(), { someField: 'passed-to-every-event' }, { alias: 'some-alias' })
  const bobAuthoredEntry = await authorEntry(bob, 0, 'HELLO', {}, 100)
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

  await subscribe(alice, 0, bob.feedKey(), { }, { alias: 'some-alias' })
  await subscribe(alice, 1, carol.feedKey(), { }, { alias: 'some-alias' })

  await authorEntry(bob, 0, 'HELLO', { msg: 'hi from bob' }, 100)
  await authorEntry(carol, 0, 'HELLO', { msg: 'hi from carol' }, 100)

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

  await subscribe(alice, 0, bob.feedKey(), { }, { alias: 'some-alias' })
  await unsubscribe(alice, 1, bob.feedKey())

  t.is(alice.feedAliases['some-alias'], undefined)
})
