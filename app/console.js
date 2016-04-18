/*
 **  Chatbox controller
 */

var Console = {
  // First function to call, to listen to any command from input box
  initQueryInput: function(commands) {
    this.commandsList = Object.keys(commands).map(function(command) {
      var commandRegExp = commandToRegExp(command);
      return {
        command: commandRegExp,
        callback: commands[command],
        originalPhrase: command
      }
    });

    $("#query").keyup(function (e) {
        if (e.keyCode == 13) {
            // Command received
            var command = $("#query").val();
            $("#query").val('');
            this.showInput(command);
            this.processInput(command, this.commandsList);
        }
    }.bind(this));

    // Receive the command from the menu bar
    $("#search").keyup(function (e) {
        if (e.keyCode == 13) {
            // Command received
            var command = $("#search").val();
            $("#search").val('');
            this.showInput(command);
            this.processInput(command, this.commandsList);
        }
    }.bind(this));
  },

  // Display user's input on chatbox
  showInput: function(command) {
    var item = $('<div class="input"></div>');
    item.text(command);
    $('#chatbox').prepend(item);
  },

  // Display engine's text response on chatbox
  showResponse: function(response, option) {
    var item = $('<div class="response"></div>');
    item.html(response);
    if(option) {
      if(option.add) {
        var addButton = $('<button class="add">Add to graph <i class="ion ion-plus"></i></button>');
        addButton.click(function(){
          this.showInput('Add '+option.add.name+' to graph');
          this.processInput('Add '+option.add.uri+' to graph', this.commandsList);
        }.bind(this));
        item.prepend(addButton);
      }
    }
    $('#chatbox').prepend(item);
  },

  // Display engine's search result on chatbox
  showResultsList: function(results) {
    var item = $('<div class="response"></div>');
    for(var uri in results) {
      var $r = $('<div class="result"></div>');
      $r.text(results[uri]);
      var addButton = $('<button class="search"><i class="ion ion-search"></i></button>');
      addButton.click(function(_uri){
        this.showInput('Find '+results[_uri]);
        this.processInput('Find '+_uri.split('/').pop(), this.commandsList);
      }.bind(this, uri));
      $r.prepend(addButton);
      item.append($r);
    }
    $('#chatbox').prepend(item);
  },


  // Display grow progress on chatbox
  showProgressResponse: function(initialMessage, successMessage, addListener) {
    var item = $('<div class="response"></div>');
    var msg = $('<div></div>').text(initialMessage).appendTo(item);
    var progress = $('<div class="progress"><span class="amount">Please wait ...</span><div class="bar"></div></div>').appendTo(item);
    // function that watch progress, which takes 1 argument: percentage of the progress
    var progressListener = function(percent) {
      if(percent === 100) {
        msg.text(successMessage);
      }
      progress.find('.amount').text(Math.floor(percent)+'%');
      progress.find('.bar').width(Math.floor(percent)+'%');
    }
    $('#chatbox').prepend(item);
    addListener(progressListener);
  },

  // Display Wikipedia widget on chatbox
  showInfoboxResponse: function($response, option) {
    var item = $('<div class="response"></div>');
    item.append($response);
    // Replace wiki link with search command
    item.find('a').each(function(index, a){
      var $a = $(a);
      var href = $a.attr('href');
      $a.attr('href','#');
      if(href.substring(0,6) === '/wiki/') {
        var resource = href.substring(6);
        $a.click(function(){
          this.showInput('Find '+$a.text());
          this.processInput('Find '+resource, this.commandsList);
        }.bind(this));
      } else {

      }
    }.bind(this));

    if(option) {
      if(option.add) {
        var addButton = $('<button class="add">Add to graph <i class="ion ion-plus"></i></button>');
        addButton.click(function(){
          this.showInput('Add '+option.add.name+' to graph');
          this.processInput('Add '+option.add.uri+' to graph', this.commandsList);
        }.bind(this));
        item.prepend(addButton);
      }
    }
    $('#chatbox').prepend(item);
  },

  // Parse user's input and determine appropriate command to use
  processInput: function(command, commandsList) {
    // try and match recognized text to one of the commands on the list
    for (var j = 0, l = commandsList.length; j < l; j++) {
      var result = commandsList[j].command.exec(command);
      if (result) {
        var parameters = result.slice(1);
        if (true) {
         root.console.log('command matched: %c'+commandsList[j].originalPhrase);
         if (parameters.length) {
           root.console.log('with parameters', parameters);
         }
        }
        // execute the matched command
        commandsList[j].callback.apply(this, parameters);
        return true;
      }
    }
    Console.showResponse("I\'m sorry, I couldn\'t match that command")
  }

}

// Helper variables, borrowed from Annyang (voice recognition engine)
var optionalParam = /\s*\((.*?)\)\s*/g;
var optionalRegex = /(\(\?:[^)]+\))\?/g;
var namedParam    = /(\(\?)?:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#]/g;
var commandToRegExp = function(command) {
   command = command.replace(escapeRegExp, '\\$&')
                 .replace(optionalParam, '(?:$1)?')
                 .replace(namedParam, function(match, optional) {
                   return optional ? match : '([^\\s]+)';
                 })
                 .replace(splatParam, '(.*?)')
                 .replace(optionalRegex, '\\s*$1?\\s*');
   return new RegExp('^' + command + '$', 'i');
 };

module.exports = Console;
