const test = require('ava')

const { newScratchDir } = require('./test-utils')
const { initNode, grant, revoke } = require('../lib/promise')

const testKey = 'XYZ'

test('Can commit a grant entry and this adds to this nodes capabilities', async t => {
  const n = await initNode(newScratchDir())
  await grant(n, 0, testKey)
  t.deepEqual(n.capabilities[testKey], {})
})

test('Can grant and then revoke', async t => {
  const n = await initNode(newScratchDir())
  await grant(n, 0, testKey)
  t.deepEqual(n.capabilities[testKey], {})
  await revoke(n, 1, testKey)
  t.is(n.capabilities[testKey], undefined)
})
