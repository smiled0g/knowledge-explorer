var $ = require('jquery')

var update = function(status) {
  console.log(status);
}

var updateWikiProgress = function(success, fail) {
  $('#WIKI_PROGRESS > .progress-bar-warning').width(Math.round(fail)+"%")
  $('#WIKI_PROGRESS > .progress-bar-success').width(Math.round(success)+"%")
}

module.exports = { 
  update: update,
  updateWikiProgress: updateWikiProgress
};