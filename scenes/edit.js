var SceneManager = require('./manager'),
    FeatureGraph = require('../app/featuregraph'),
    WikiGraph = require('../app/wikigraph'),
    XMLUtil = require('../app/xmlutil'),
    DummyObject = require('../app/dummyobject'),
    OnlineSearch = require('../app/yahoosearch'),
    select2 = require('select2-browserify');

var getSelectedFeature = function(select) {
  var selected = $(select).find(':selected').attr('value'),
      DO = DummyObject(app.$data);
  return DO.getFeatureById(selected);
};

var openWikiGraph = function() {
  $(this.el+' .wiki-graph-container').show();
  var feature = getSelectedFeature(this.el+' [name="feature-select"]');
  WikiGraph.draw(this.el+' .wiki-graph-container');
};

module.exports = {
  el: '#SCENE_EDIT',
  init: function() {
    var el = this.el; 
    
    $(el+' [name="feature-select"]').empty()
    
    var FeaturesMap = XMLUtil.getFeaturesMap(app.$data);
    var DO = DummyObject(app.$data);
    
    Object.keys(FeaturesMap).map(function(k) {
      var $option = $('<option></option>');
      var feature = DO.getFeatureById(k);
      $option.text(feature.name.eng);
      $option.attr('value', k);
      $(el+' [name="feature-select"]').append($option);
    });
    
    var saveEditForm = function() {
        
    }
    
    // Called when feature is selected
    var populateEditForm = function(feature) {
      // Populate form
      $(el+' [name="name_eng"]').empty().val(feature.name.eng);
      $(el+' [name="name_chi"]').empty().val(feature.name.chi);
      $(el+' [name="speak_eng"]').empty().val(feature.speak.eng);
      $(el+' [name="speak_chi"]').empty().val(feature.speak.chi);
      
      // Populate images
      $(el+' [name="images"] .loading').show();
      $(el+' [name="images"] .result').empty();
      OnlineSearch.image(feature.name.eng_simplified, function(data) {
        data.results.map(function(r){
          var $imageThumbnail = $('<div class="image-thumbnail" style="background-image: url(\''+r.thumbnailurl+'\')"></div>');
          $(el+' [name="images"] .result').append($imageThumbnail);
        });
        $(el+' [name="images"] .loading').hide();
      }); 
    };
    
    $(this.el+' [name="feature-select"]')
      .select2({})
      .on('change', function(e) {
        var feature = getSelectedFeature(this);
        FeatureGraph.draw(el+' .feature-graph-container', feature);
        populateEditForm(feature);
      })
      .trigger('change');
    
    $(this.el+' [name="wikis"]').click(openWikiGraph.bind(this));
    $(this.el+' .wiki-graph-container > i.close-wiki-graph-container').click(function(){
      $(this).parent().hide();
      $(this).parent().children('svg').remove();
    })
  }
};