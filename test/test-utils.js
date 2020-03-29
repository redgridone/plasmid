/**
 * Promise based utilities to avoid nested callbacks in tests
 */
const crypto = require('crypto')

function newScratchDir () {
  const unique = crypto.randomBytes(16).toString('hex')
  return `./test/scratch/${unique}`
}

module.exports = {
  newScratchDir,
}
