
const { validate } = require('jsonschema')
const entrySchema = require('./schema/entry.schema.json')

const SYS_ENTRIES = Object.freeze({
  SUBSCRIBE: '%subscribe',
  UNSUBSCRIBE: '%unsubscribe',
  DELEGATE: '%delegate',
  UNDELEGATE: '%undelegate'
})

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

function newDelegateContent ({ author, feedKey, details, options }) {
  return {
    type: SYS_ENTRIES.DELEGATE,
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

function newUndelegateContent ({ feedKey }) {
  return {
    type: SYS_ENTRIES.UNDELEGATE,
    feedKey
  }
}

module.exports = {
  SYS_ENTRIES,
  newEntry,
  newSubscribeContent,
  newUnsubscribeContent,
  validateEntry
}
