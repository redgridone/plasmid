
const { validate } = require('jsonschema')
const entrySchema = require('./schema/entry.schema.json')

function validateEntry (entry) {
  validate(entry, entrySchema, { throwError: true })
}

function newEntry ({ author, sequence, timestamp, type, content }) {
  const entry = {
    author,
    sequence,
    timestamp,
    content
  }
  validateEntry(entry) // throws an error if entry not valid
  return entry
}

function newSubscribeContent ({ author, sequence, timestamp, feedKey, details, options }) {
  return {
    type: '%subscribe',
    feedKey,
    details,
    options
  }
}

function newUnsubscribeContent ({ feedKey }) {
  return {
    type: '%unsubscribe',
    feedKey
  }
}

module.exports = {
  newEntry,
  newSubscribeContent,
  validateEntry
}
