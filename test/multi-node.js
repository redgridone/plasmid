const test = require('ava')

const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe, head, authorEntry } = require('../lib/promise')

test('A node can subscribe to another using replication streams', async t => {
	t.timeout(5*1000)

	const alice = await initNode(newScratchDir())
	const bob = await initNode(newScratchDir())

	// alice subscribes to bob
	await subscribe(alice, 0, bob.feedKey(), {}, {})

	// alice replicates bobs feed and will get updates
	let aliceStream = alice.createReplicationStream(bob.feedKey(), true, {})
	let bobStream = bob.createReplicationStream(null, false, {})
	
	bobStream.pipe(aliceStream).pipe(bobStream)

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
