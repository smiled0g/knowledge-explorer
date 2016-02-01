var Console = {
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
  },

  showInput: function(command) {
    var item = $('<div class="input"></div>');
    item.text(command);
    $('#chatbox').prepend(item);
  },

  showResponse: function(response, option) {
    var item = $('<div class="response"></div>');
    item.text(response);
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
  }

}

// Borrowed from Annyang
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
