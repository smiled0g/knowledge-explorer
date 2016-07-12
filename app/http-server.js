/*
  Internal webserver that allows the app to communicate with other app
 */
var Console = require('./console'),
    Config = require('./config'),
    Graph = require('./graph'),
    AIMind = require('./aimind'),
	Interest = require('./userinterest');

var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    appInstance = null,
    appPort = Config.defaultHttpServerPort;

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.send('Great! Server is running');
});

app.get('/generate/xml', function(req, res) {
  var xml = AIMind.generateXMLString();
  res.set('Content-Type', 'text/xml');
  res.send(xml);
});

app.post('/callback/analogy', function(req, res) {
  console.log(req.body);
  if(JSON.stringify(req.body) !== JSON.stringify({})) {
    // Show response explanation
    var explanation = req.body.explanation.replace(/(?:\r\n|\r|\n)/g, '<br/><br/>');
    Console.showResponse(explanation);
    // Illustrate analogy on graph
    Graph.highlightAnalogy(req.body);
  } else {
    Console.showResponse('I\'m sorry. No analogy can be made.');
  }
  res.status(200).send();
});

/*
	Callback function for updating the user interest profile
*/

app.post('/callback/userinterest', function(req, res) {
	//update the user interest profile
	Interest.setInterestProfile(req.body);	
	res.status(200).send();
});

/*
  Defining functions for controlling the server
 */

var start = (port) => {
  appPort = port || appPort;

  if(appInstance) appInstance.close();
  appInstance = app.listen(appPort);
  Console.showResponse('HTTP server is running on http://localhost:'+appPort);
}

var stop = () => {
  if(appInstance) appInstance.close();
  appInstance = null;
  Console.showResponse('HTTP server has been stopped');
}

var isRunning = () => {
  return appInstance != null;
}

var getPort = () => {
  return appPort;
}

/*
 Run server if Config.startHttpServerOnLoad is true
 */
if(Config.startHttpServerOnLoad && !appInstance) {
  start();
}

module.exports = { start, stop, getPort }
