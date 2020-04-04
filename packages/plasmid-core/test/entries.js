const test = require('ava')
const { newEntry } = require('../lib').entries

test('Can create a valid entry', t => {
  const author = '736dd64fecc160e61a861b277aa1004fca014205ee09c4aebef9158cca305760'
  const entry = newEntry(
    author,
    0,
    0,
    {
      type: 'test'
    })
  t.is(entry.author, author)
})

test('Fails if hex author key too short', t => {
  t.throws(() => {
    try {
      newEntry(
        'xxx',
        0,
        0,
        'test'
      )
    } catch (e) {
      throw new Error(e) // need to rethrow as an error (rather than an exception) for ava
    }
  }, { message: 'instance.author does not meet minimum length of 64' })
})
