const test = require('ava')
const { newScratchDir, initNode } = require('./test-utils')

test('Can construct a node and wait for it to initialize', async t => {
  const n = await initNode(newScratchDir())
  t.is(n.feed.key.toString('hex').length, 64)
})

test('Can construct a node, destroy it and reinitialize from same directory', async t => {
  const dir = newScratchDir()
  const n = await initNode(dir)
  n.close()
  await initNode(dir)
  t.pass()
})

test('Node will reject an invalid entry', async t => {
  const n = await initNode(newScratchDir())
  t.throws(() => {
    try {
      n.feed.append({
        sequence: 0
      })
    } catch (e) {
      throw new Error(e) // need to rethrow as an error (rather than an exception) for ava
    }
  }, { message: 'instance requires property "author"' })
  t.is(n.feed.length, 0) // nothing was added
})
