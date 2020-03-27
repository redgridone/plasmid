const test = require('ava')
const { newScratchDir, initNode } = require('./test-utils')

test('Can construct a node and wait for it to initialize (smoke test)', async t => {
  const n = await initNode(newScratchDir())
  t.is(n.feed.key.toString('hex').length, 64)
})
