const test = require('ava')

const { subscribe, authorEntry } = require('../lib/promise')
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

test('Bidirectional subscription', async t => {
  const [alice, bob] = await bootstrapNodes(2)
  await subscribe(alice, 0, bob.feedKey(), {}, {})
  await subscribe(bob, 0, alice.feedKey(), {}, {})

  const aliceAuthoredEntry = await authorEntry(alice, 1, 'HELLO', { msg: 'hi from alice' }, 100)
  const bobAuthoredEntry = await authorEntry(bob, 1, 'HELLO', { msg: 'hi from bob' }, 100)
  
  const aliceReceivedEntry = await new Promise((resolve, reject) => {
    alice.on(`newData:${bob.feedKey()}`, (data) => {
      resolve(data)
    })
  })
  const bobReceivedEntry = await new Promise((resolve, reject) => {
    bob.on(`newData:${alice.feedKey()}`, (data) => {
      resolve(data)
    })
  })

  t.deepEqual(aliceAuthoredEntry, bobReceivedEntry)
  t.deepEqual(bobAuthoredEntry, aliceReceivedEntry)
})

test('Can subscribe to a feed with an alias, details are passed to event', async t => {
  const [alice, bob] = await bootstrapNodes(2)
  await subscribe(alice, 0, bob.feedKey(), { someField: 'passed-to-every-event' }, { alias: 'some-alias' })
  const bobAuthoredEntry = await authorEntry(bob, 0, 'HELLO', {}, 100)
  const aliceReceivedEntry = await new Promise((resolve, reject) => {
    alice.on(`newData:some-alias`, (data, details) => {
      t.is(details.someField, 'passed-to-every-event')
      resolve(data)
    })
  })
  t.deepEqual(aliceReceivedEntry, bobAuthoredEntry)
})

test.todo('Subscribing different feeds to the same alias, only the later one gives events')
