/* global require, module */
// Android keeps AsyncStorage in a SQLite file capped at 6 MB by default; a
// hundred cached match details need more (owner's Android, 2026-10-27:
// "database or disk is full (code 13 SQLITE_FULL)"). Raises the cap through
// the gradle property the library reads. Needs a new Android build to apply.
const { withGradleProperties } = require('@expo/config-plugins')

const KEY = 'AsyncStorage_db_size_in_MB'

module.exports = function withAsyncStorageDbSize(config, { sizeMb = 100 } = {}) {
  return withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((item) => !(item.type === 'property' && item.key === KEY))
    c.modResults.push({ type: 'property', key: KEY, value: String(sizeMb) })
    return c
  })
}
