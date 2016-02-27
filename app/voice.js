/*
 **  Voice engine controller
 */

var isMute = false,
    isListening = false;

// Generate voice response
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

// Start voice recognition engine
var listen = function(commands) {
  if (annyang) {
    annyang.debug();

    // Add our commands to annyang
    annyang.addCommands(commands);

    // Start listening. You can call this here, or attach this call to an event, button, etc.
    annyang.start();
    isListening = true;
  }
}

// Pause listening
var pauseListening = function() {
  if (annyang) {
    annyang.pause();
    isListening = false;
  }
}

// Resume listening
var resumeListening = function() {
  if (annyang) {
    annyang.resume();
    isListening = true;
  }
}

// Return if annyaang is listening
var isListening = function() {
  return isListening;
}

module.exports = {
  speak: speak,
  listen: listen,
  pauseListening: pauseListening,
  resumeListening: resumeListening,
  mute: function() { isMute = true ;},
  unmute: function() { isMute = false ;}
}
