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
