const test = require('ava')
const Node = require('../lib/node')

test('Can construct a node and wait for it to initialize (smoke test)', async t => {
  t.plan(1)
  const n = new Node('./test/scratch/0')
  await new Promise((resolve, reject) => {
    n.on('ready', () => {
      t.is(n.feed.key.toString('hex').length, 64)
      resolve()
    })
  })
})

test('Can subscribe to a feed', async t => {
  t.plan(1)
  await new Promise((resolve, reject) => {
    const n = new Node('./test/scratch/1')
    n.on('ready', () => {
      n.subscribe('0'.repeat(64), {}, {}, () => {
        t.is(n.feed.length, 1)
        resolve()
      })
    })
  })
})
