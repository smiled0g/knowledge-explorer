/*
 **  Helper that holds past results of user's queries
 **    in form of dict => { resource_uri: resource_info }
 */

var SearchStorage = {
  latest: undefined,

  // Initialize a dictionary to hold query results
  init: function() {
    window.search_storage = {};
  },

  // Helper function that returns results dictionary
  getStorage: function() {
    if(!window.search_storage) this.init();

    return window.search_storage;
  },

  // Add a query result to dict
  add: function(searchResult) {
    var storage = this.getStorage();
    storage[searchResult.uri] = searchResult;
    this.latest = searchResult.uri;
  },

  // Get a query result from dict
  get: function(uri) {
    var storage = this.getStorage();
    return storage[uri];
  },

  // Get latest query result from dict
  getLatest: function() {
    if(this.latest) {
      var storage = this.getStorage();
      return storage[this.latest];
    }
    return null;
  },

  // Search for resource_uri that corresponds to a resource name
  getUriFromName: function(name) {
    var storage = this.getStorage();
    for(var uri in storage) {
      if(storage[uri].label.toLowerCase().indexOf(name.toLowerCase()) >= 0) return uri;
    }
  }
}

module.exports = SearchStorage
