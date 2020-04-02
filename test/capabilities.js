const test = require('ava')

const { newScratchDir } = require('./test-utils')
const { initNode, grant } = require('../lib/promise')

const test_key = 'XYZ'

test('Can commit a grant entry and this adds to this nodes capabilities', async t => {
	const n = await initNode(newScratchDir())
	await grant(n, 0, test_key)
	t.deepEqual(n.capabilities[test_key], {})
})
