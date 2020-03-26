
const { validate } = require('jsonschema')
const entrySchema = require('./schema/entry-schema.json')

function validateEntry (entry) {
  validate(entry, entrySchema, { throwError: true })
}

function newEntry ({ author, sequence, timestamp, type, extraContent }) {
  const entry = {
    author,
    sequence,
    timestamp,
    content: {
      type,
      ...extraContent
    }
  }
  validateEntry(entry) // throws an error of entry not valid
  return entry
}

module.exports = {
  newEntry,
  validateEntry
}
