var request = require('request');
var qs = require('querystring');

var oauth = {
  consumer_key: 'dj0yJmk9RUJzSWJrT0NaQ3R1JmQ9WVdrOVRHbEVjWEV5TnpRbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD0zYw--',
  consumer_secret: '01db5371db209b9383824719bcf5e75ad8528f85'
};

module.exports = {
  image: function(keyword, onSuccess) {
    var url = 'https://yboss.yahooapis.com/ysearch/images';

    var params = qs.stringify({
      q: keyword,
      format: 'json',
      count: '10',
    });

    request.get({ url: url + '?' + params, oauth: oauth, json: true }, function(e, r, body) {
      onSuccess(body.bossresponse.images);
    });
  }
}