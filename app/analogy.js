/*
  Interface for making a request for analogy
  See Craig's code at https://github.com/carlsc2/analogy
 */
var $ = require('jquery'),
    Config = require('./config'),
    Console = require('./console'),
    HttpServer = require('./http-server');

var makeAnalogyForNode = (ref) => {
  $.ajax( Config.analogyEndpoint, {
    data: { id: ref, port: HttpServer.getPort() },
    success: () => {
		
    },
    error: () => {
      Console.showResponse('I\'m sorry, I couldn\'t connect to analogy server. Please make sure it\'s running on '+Config.analogyEndpoint);
    }
  });
}

module.exports = { makeAnalogyForNode }
