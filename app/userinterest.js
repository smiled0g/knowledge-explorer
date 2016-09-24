/*
  Interface for getting user interest profile from tianjian's code
 */
var d3 = require('d3');
var $ = require('jquery'),
    Config = require('./config'),
    Console = require('./console'),
    HttpServer = require('./http-server');
	
var toggled = false;
var interestProfile = {};

/*
retrieves data of format:
data = {
		"filename":<local path to the XML file >,
		"total_max_score":<max possible value>,
		"node_id": <value>,
		... ,
		"node_id": <value>,
       }
*/

function float2color( percentage ) {
    var color_part_dec = 255 * percentage;
    var red_part_hex = Number(parseInt( color_part_dec , 10)).toString(16);
	var blue_part_hex = Number(parseInt( 255-color_part_dec , 10)).toString(16);
    return "#" + ("0" + red_part_hex).slice(-2) + '00' + ("0" + blue_part_hex).slice(-2);
}

var setInterestProfile = function(data){
	interestProfile = data;
	console.log("updated profile");
	console.log(interestProfile);
	drawUserInterestProfile();
}

var drawUserInterestProfile = function(){
	//get maximum interest value for normalization purposes
	var maxinterest = 0;
	graph.graph.node.each(function (d) {
		var interest = interestProfile[d.ref.toString()];
		if(interest > maxinterest){
			maxinterest = interest;
		}
	});
	
	//maxinterest = interestProfile["total_max_score"];
	
	graph.graph.node.each(function (d) {
		var interest = interestProfile[d.ref.toString()];
		if(interest === undefined){
			//set to no interest
			d3.select(this).select('rect').attr("fill", '#0000ff');
		}else{
			console.log(interest + " " + interest/maxinterest);
			//get color from interest profile
			d3.select(this).select('rect').attr("fill", float2color(interest/maxinterest));
		}
	});
}
	   
var showUserInterestProfile = (ref) => {
	if(toggled){
		Console.showResponse("Interest mode: OFF");
		toggled = false;
		graph.draw();
	}
	else{
		Console.showResponse("Interest mode: ON");
		drawUserInterestProfile();
		toggled = true;
	}
}

module.exports = { showUserInterestProfile, setInterestProfile }