const test = require('ava')
const Node = require('../lib/node')

test('Can construct a node and wait for it to initialize (smoke test)', async t => {
  t.plan(1)
  const n = new Node('./test/scratch')
  await new Promise((resolve, reject) => {
    n.on('ready', () => {
      t.is(n.feed.key.toString('hex').length, 64)
      resolve()
    })
  })
})
