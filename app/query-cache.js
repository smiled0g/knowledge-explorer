/*
  Persistent storage that caches queries
 */

var storage = require('node-persist'),
    crypto = require('crypto');

// Initialize the storage
storage.init();

// Return hash to use as identifier for query
function getHash(query) {
  return crypto.createHash('md5').update(query).digest('hex');
}

// Return key for storage
function getKey(namespace, query) {
  return [getHash(namespace), ':', getHash(query)].join("");
}

function setCache(namespace, query, value, cb) {
  return storage.setItem(getKey(namespace, query), value, cb);
}

function getCache(namespace, query) {
  return storage.getItem(getKey(namespace, query));
}

module.exports = {
  set: setCache,
  get: getCache
}
