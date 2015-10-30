var simplifyName = function(str) {
  // Remove words in parenthesis, trim, and remove non-alphanumeric characters
  return str.replace(/ *\([^)]*\) */g, " ").trim().replace(/\W/g, '');
}

var DummyObject = function($data) {
  return {
    getFeatureById: function(id) {
      var feature = {
        id: id
      }
      
      var get$Feature = function() {
        return $data.find('Feature[id="' + id + '"]');
      }
      
      Object.defineProperty(feature, 'name', {
        get: function() { 
          var names = get$Feature().attr('data').split('##');
          return { 
            eng: names[0], 
            eng_simplified: simplifyName(names[0]),
            chi: names.length > 1 ? names[1] : undefined 
          };
        },
        set: function(newValue) { 
          get$Feature().attr(
            'data', 
            (newValue.eng || '')+'##'+(newValue.chi || '')
          ); 
        },
        enumerable: true,
        configurable: true
      });
      
      Object.defineProperty(feature, 'speak', {
        get: function() { 
          var speaks = get$Feature().find('speak').attr('value').split('##');
          return { 
            eng: speaks[0], 
            chi: speaks.length > 1 ? speaks[1] : undefined 
          };
        },
        set: function(newValue) { 
          get$Feature().find('speak').attr(
            'value', 
            (newValue.eng || '')+'##'+(newValue.chi || '')
          ); 
        },
        enumerable: true,
        configurable: true
      });

      Object.defineProperty(feature, 'neighbors', {
        get: function() { 
          if (feature.__neighbors === undefined) {
            var DO = DummyObject($data);
            var neighbors = get$Feature().find('neighbor');
            feature.__neighbors = neighbors.toArray().reduce(function(result, neighbor){
              var $neighbor = $(neighbor);
              var relationship = $neighbor.attr('relationship').split('##');
              var neighbor_object = DO.getFeatureById($neighbor.attr('dest')); 
              neighbor_object.relationship = {
                eng: relationship[0], 
                chi: relationship.length > 1 ? relationship[1] : undefined,
                weight: $neighbor.attr('weight'),
                type: 'neighbor'
              };
              result.push(neighbor_object);
              return result;
            }, []);
          }
          return feature.__neighbors;
        }.bind(this),
        set: function(newValue) { 
          feature.__neighbors = newValue;
        },
        enumerable: true,
        configurable: true
      });
      

      Object.defineProperty(feature, 'parents', {
        get: function() { 
          if(feature.__parents === undefined) { 
            var DO = DummyObject($data);
            var parents = get$Feature().find('parent');
            feature.__parents = parents.toArray().reduce(function(result, parent){
              var $parent = $(parent);
              var relationship = $parent.attr('relationship').split('##');
              var parent_object = DO.getFeatureById($parent.attr('dest')); 
              parent_object.relationship = {
                eng: relationship[0], 
                chi: relationship.length > 1 ? relationship[1] : undefined,
                weight: $parent.attr('weight'),
                type: 'parent'
              };
              result.push(parent_object);
              return result;
            }, []);
          }
          return feature.__parents;
        }.bind(this),
        set: function(newValue) { 
          feature.__parents = newValue;
        },
        enumerable: true,
        configurable: true
      });
      
      // Alias to neighbors, used in graph-plotting
      Object.defineProperty(feature, 'children', {
        get: function() { 
          if(feature.__children === undefined) {
            feature.__children = feature.parents.concat(feature.neighbors);
          }
          return feature.__children;
        }.bind(this),
        set: function(newValue) { 
          feature.__children = newValue;
        },
        enumerable: true,
        configurable: true
      });

      return feature;
    }
  
  }
};

module.exports = DummyObject;