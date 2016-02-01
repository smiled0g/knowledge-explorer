var isMute = false;

var speak = function(text, voiceId) {
  if(isMute) return;

  // Pause listening to commands (which would be its own voice)
  annyang.abort();

  var msg = new SpeechSynthesisUtterance();
  msg.text = text;
  msg.lang = 'en-US';
  msg.localService = false;

  speechSynthesis.speak(msg);

  // Resume listening
  msg.addEventListener('end', function () {
    annyang.start();
  });
}

var listen = function(commands) {
  if (annyang) {
    annyang.debug();

    // Add our commands to annyang
    annyang.addCommands(commands);

    // Start listening. You can call this here, or attach this call to an event, button, etc.
    annyang.start();
  }
}

module.exports = {
  speak: speak,
  listen: listen,
  mute: function() { isMute = true ;},
  unmute: function() { isMute = false ;}
}
