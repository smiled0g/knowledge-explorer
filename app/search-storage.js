var SearchStorage = {
  latest: undefined,

  init: function() {
    window.search_storage = {};
  },

  getStorage: function() {
    if(!window.search_storage) this.init();

    return window.search_storage;
  },

  add: function(searchResult) {
    var storage = this.getStorage();
    storage[searchResult.uri] = searchResult;
    this.latest = searchResult.uri;
  },

  get: function(uri) {
    var storage = this.getStorage();
    return storage[uri];
  },

  getLatest: function() {
    if(this.latest) {
      var storage = this.getStorage();
      return storage[this.latest];
    }
    return null;
  },

  getUriFromName: function(name) {
    var storage = this.getStorage();
    for(var uri in storage) {
      if(storage[uri].label.toLowerCase().indexOf(name.toLowerCase()) >= 0) return uri;
    }
  }
}

module.exports = SearchStorage
