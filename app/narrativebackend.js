/*
Interface for making a request for narration
See Zev's code at https://github.com/Adebis/NarrativeBackendRPI
 */
var $ = require('jquery'),
		Config = require('./config'),
		Console = require('./console'),
		HttpServer = require('./http-server');

var makeNarrationForNode = (ref) => {

	console.log("REF:" + ref);

	$.ajax(Config.narrativeBackendEndpoint + "/chronology", {
		method:'POST',
		contentType: "application/json; charset=utf-8",
		data : JSON.stringify({
			id : ref,
			turns : 10
		}),
		success : (data) => {
			console.log(data);
		},
		error : () => {
			Console.showResponse('I\'m sorry, I couldn\'t connect to analogy server. Please make sure it\'s running on ' + Config.narrativeBackendEndpoint);
		}
	});
}

module.exports = {
	makeNarrationForNode
}
