/*
 *  News GDELT API
 *  see http://blog.gdeltproject.org/announcing-our-first-api-gkg-geojson/ for more info
 */

var $ = require('jquery');

function search(query, limit, onSuccess) {
  console.log('search with',query);
  // query = comma-separate keywords
  $.get('http://api.gdeltproject.org/api/v1/gkg_geojson',
    {
      QUERY: query,
      MAXROWS: limit || 50
    },
    function(data) {
      // Build mentioned themes and names
      var themes = {},
          names = {};

      data.features.map(f => {
        // Transform uri to location-specific
        f.properties.url += '#'+f.properties.name.replace(/[^a-zA-Z0-9]+/g, '_');

        f.themes = getMentionedThemes(f);
        f.themes.forEach(i => {
          if(!themes[i]) themes[i] = [];
          themes[i].push(f.properties.url)
        });
        f.names = getMentionedNames(f);
        f.names.forEach(i => {
          if(!names[i]) names[i] = [];
          names[i].push(f.properties.url)
        });

      });

      data.themes = themes;
      data.names = names;

      onSuccess(data);
    },
    'json'
  )
}

function getMentionedThemes(feature) {
  return feature.properties.mentionedthemes.split(';').filter(w => !!w);
}

function getMentionedNames(feature) {
  return feature.properties.mentionednames.split(';').filter(w => !!w);
}

module.exports = {
  search: search,
  themePrefix: 'http://data.gdeltproject.org/documentation/GKG-MASTER-THEMELIST.TXT#',
  nameProfix: 'http://api.gdeltproject.org/api/v1/gkg_geojson?QUERY=geoname:'
}
