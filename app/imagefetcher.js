var $ = require('jquery');
  
module.exports = {
  fetch: function(features, onFinish, onProgress) {
    var images = {};
    var _collecting = Object.keys(features).length;
    
    var collect = function(index, imageURL) {
      images[index] = imageURL;
      _collecting--;
      if(_collecting == 0) {
        onFinish(images);
      } else {
        if(onProgress) onProgress( (features.length-_length)*100.0/features.length );
      }
    }
    
    var fetchImages = function(loadList) {
      var index = loadList[0];
      $.getJSON("http://ajax.googleapis.com/ajax/services/search/images?v=1.0&q=" + encodeURIComponent(features[index]))
        .done(function(data){
          if(data.responseStatus == 200) {
            collect(index, data.responseData.results[0].url);
            loadList.shift();
            fetchImages(loadList);
          } else {
            // fail => wait for a while and fetch again
            console.log('failed');
            setTimeout(fetchImages.bind(this, loadList), 2000);
          }
        }) 
    };
    
    fetchImages(Object.keys(features));
  }
}