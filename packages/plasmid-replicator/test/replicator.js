const test = require('ava')

const { newScratchDir } = require('./test-utils')
const { initNode, subscribe, unsubscribe } = require('plasmid-core').promise

const Replicator = require('../lib')
const testKey = '0'.repeat(64)

test('Adds and removes swarms with subscribe/unsubscribe', async t => {
  const n = await initNode(newScratchDir())
  const r = new Replicator(n)

  const newSwarm = new Promise((resolve, reject) => {
    r.on('newSwarm', () => {
      resolve()
    })
  })

  const removedSwarm = new Promise((resolve, reject) => {
    r.on('removedSwarm', () => {
      resolve()
    })
  })

  t.is(Object.keys(r.foreignFeedSwarms).length, 0)

  await subscribe(n, 0, testKey, {}, {})
  await newSwarm
  t.is(Object.keys(r.foreignFeedSwarms).length, 1)

  await unsubscribe(n, 1, testKey)
  await removedSwarm
  t.is(Object.keys(r.foreignFeedSwarms).length, 0)
})
