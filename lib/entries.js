/**
 * Entries module
 * Contains helpers for constructing and validating plasmid feed entries
 * @module entries
 */
const { validate } = require('jsonschema')
const entrySchema = require('./schema/entry.schema.json')

/**
 * Enum containing the type fields for plasmid system entries
 * @readonly
 * @enum {string}
 */
const SYS_ENTRIES = Object.freeze({
  SUBSCRIBE: '%subscribe',
  UNSUBSCRIBE: '%unsubscribe',
  GRANT: '%grant',
  REVOKE: '%revoke',
  REMOTE_AUTHOR: '%remoteauthor'
})

/**
 * Validates a Plasmid entry object
 * Ensures that the object has the required fields.
 *
 * @param      {Object}  entry   Entry object to validate
 * @param      {bool}  [throwError=true]   If this function should throw an error or just return the validation result
 * @return     {Object}  Returns a report of the validation. If throwError=false it will also return the errors
 */
function validateEntry (entry, throwError = true) {
  return validate(entry, entrySchema, { throwError })
}

/**
 * Create a new plasmid entry object
 * Will throw an error if the given parameters do not result in a valid entry
 *
 * @param      {string}  author        The author feedKey
 * @param      {number}  sequence      The sequence number in the feed it is to be added to
 * @param      {number}  timestamp     Creation timestamp (ms since unix epoch)
 * @param      {Object}  [content={}]  The content for this entry. Must contain a 'type' field
 * @return     {Object}  Valid entry object
 */
function newEntry (author, sequence, timestamp, content = {}) {
  const entry = {
    author,
    sequence,
    timestamp,
    content
  }
  validateEntry(entry) // throws an error if entry not valid
  return entry
}

function newSubscribeContent (feedKey, details = {}, options = {}) {
  return {
    type: SYS_ENTRIES.SUBSCRIBE,
    feedKey,
    details,
    options
  }
}

function newUnsubscribeContent (feedKey) {
  return {
    type: SYS_ENTRIES.UNSUBSCRIBE,
    feedKey
  }
}

function newGrantContent (feedKey, contentValidationSchema = {}) {
  return {
    type: SYS_ENTRIES.DELEGATE,
    feedKey
  }
}

module.exports = {
  SYS_ENTRIES,
  newEntry,
  newSubscribeContent,
  newUnsubscribeContent,
  newGrantContent,
  validateEntry
}
