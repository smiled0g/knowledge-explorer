var $ = require('jquery');

module.exports = {
  loadScene: function(scene) {
    $('.scene').addClass('hide');
    $(scene.el).removeClass('hide');
    if(scene.init) scene.init();
  }
}