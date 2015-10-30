var util = {
  getFeaturesMap: function($data) {
    return $data.find('Feature').toArray().reduce(
      function(result, feature){
        var _data = $(feature).attr('data').split('##');
        result[$(feature).attr('id')] = feature;
        return result;
      }, {}
    );
  },
  getFeatureById: function($data, id) {
    var k = $data.find('Feature[id="'+id+'"]');
  }
}

module.exports = util;