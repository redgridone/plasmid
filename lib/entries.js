
const { validate } = require('jsonschema')
const entrySchema = require('./schema/entry.schema.json')

const SYS_ENTRIES = Object.freeze({
  SUBSCRIBE: '%subscribe',
  UNSUBSCRIBE: '%unsubscribe'
})

const filters = {
  onlySubscribe: (entry) => {
    return entry.content.type === SYS_ENTRIES.SUBSCRIBE
  },
  onlyUnsubscribe: (entry) => {
    return entry.content.type === SYS_ENTRIES.UNSUBSCRIBE
  }
}

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

function newSubscribeContent ({ author, feedKey, details, options }) {
  return {
    type: SYS_ENTRIES.SUBSCRIBE,
    feedKey,
    details,
    options
  }
}

function newUnsubscribeContent ({ feedKey }) {
  return {
    type: SYS_ENTRIES.UNSUBSCRIBE,
    feedKey
  }
}

module.exports = {
  SYS_ENTRIES,
  filters,
  newEntry,
  newSubscribeContent,
  newUnsubscribeContent,
  validateEntry
}
