const test = require('ava')

const { subscribe, grant, authorEntry } = require('../../lib/promise')
const { bootstrapNodes } = require('./multi-node-bootstrapper')

test('A node can subscribe to another using replication streams', async t => {
  const [alice, bob] = await bootstrapNodes(2)

  // alice subscribes to bob
  await subscribe(alice, 0, bob.feedKey(), {}, {})
  // alice grants bob capabilitity to publish anything
  await grant(alice, 1, bob.feedKey())

  // bob authors a remote author entry
  await authorEntry(bob, 0, '%remoteauthor', { remoteContent: { type: 'FROM_BOB' } }, 100)

  // wait for this to trigger alice authoring a new entry
  const aliceLastEntry = await new Promise((resolve, reject) => {
    alice.on('authoredEntry', (data) => {
      resolve(data)
    })
  })

  t.is(aliceLastEntry.remoteAuthor, bob.feedKey())
  t.is(aliceLastEntry.content.type, 'FROM_BOB')
})
