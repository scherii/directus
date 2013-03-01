define([
  "handlebars",
  "plugins/backbone.layoutmanager",
  "plugins/bootstrap-dropdown",          //load anonomosly
  "plugins/bootstrap-typeahead",          //load anonomosly
  "plugins/jquery.timeago"               //load anonomosly
],

function(Handlebars) {

  // Provide a global location to place configuration settings and module
  // creation.
  var app = {
    capitalize: function(string, seperator) {
      var idIndex;

      if (seperator === undefined) {
        seperator = "_";
      }

      if (!string) return '';

      idIndex = string.lastIndexOf("_id");
      if (string.length - idIndex === 3) {
        string = string.substring(0, idIndex);
      }
      return _.map(string.split(seperator), function(word) { return word.charAt(0).toUpperCase() + word.slice(1); }).join(' ');
    },

    bytesToSize: function(bytes, precision) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      var posttxt = 0;
      bytes = parseInt(bytes,10);
      if (bytes === 0) return 'n/a';
      while( bytes >= 1024 ) {
          posttxt++;
          bytes = bytes / 1024;
      }
      return bytes.toFixed(precision) + " " + sizes[posttxt];
    },

    contextualDate: function(value) {
      return jQuery.timeago(value+'Z');
    },

    actionMap: {
      'ADD': 'added',
      'DELETE': 'deleted',
      'UPDATE': 'updated'
    },

    prepositionMap: {
      'ADD': 'to',
      'DELETE': 'from',
      'UPDATE': 'within'
    }
  };

  app.sendFiles = function(files, callback) {
    var formData = new FormData();

    if (files instanceof File) files = [files];

    _.each(files, function(file, i) {
      formData.append('file'+i, file);
    });
    
    $.ajax({
      url: '/directus/api/server.php',
      type: 'POST',
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      success: callback
    });
  }

  //Raw handlebars data, helpful with data types
  Handlebars.registerHelper('raw', function(data) {
    return data && new Handlebars.SafeString(data);
  });

  Handlebars.registerHelper('number', function(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  });

  Handlebars.registerHelper('resource', function(name) {
    return app.RESOURCES_URL + name;
  });

  Handlebars.registerHelper('capitalize', function(string) {
    return app.capitalize(string);
  });

  Handlebars.registerHelper('bytesToSize', function(bytes) {
    return app.bytesToSize(bytes, 0);
  });

  Handlebars.registerHelper('contextualDate', function(date) {
    return new Handlebars.SafeString('<div title="'+ new Date(date+'Z') +'">'+app.contextualDate(date)+'</div>');
  });

  Handlebars.registerHelper('avatarSmall', function(userId) {
    return '<img src="' + app.users.get(userId).get('avatar') + '" style="margin-right:7px;" class="avatar">' + app.users.get(userId).get('first_name');
  });

  Handlebars.registerHelper('activeMap', function(model) {
    switch (model.get('active')) {
      case 0:
        return 'deleted';
      case 1:
        return 'active';
      case 2:
        return 'inactive';
    }
  });

  Handlebars.registerHelper('userShort', function(userId) {
    var user = app.users.get(userId);
    var firstName = user.get('first_name').toLowerCase();
    var lastNameFirstCharacter = user.get('last_name').toLowerCase().charAt(0);
    var nickName = firstName;
    var hit = app.users.find(function(model) { return model.get('first_name').toLowerCase() === firstName && model.id !== userId; });
    if (hit !== undefined) {
      nickName = firstName + ' ' + lastNameFirstCharacter + '.';
      var hit = app.users.find(function(model) { return model.get('first_name').toLowerCase() === firstName && model.get('last_name').toLowerCase().charAt(0) === lastNameFirstCharacter && model.id !== userId; });
      if (hit !== undefined) {
        nickName = firstName + ' ' + user.get('last_name');
      }
    }
    return new Handlebars.SafeString('<img src="'+user.get('avatar')+'" class="avatar"/>' + app.capitalize(nickName," "));
  });

  Handlebars.registerHelper('userAvatar', function(userId) {
    var user = app.users.get(userId);
    return new Handlebars.SafeString('<img src="'+user.get('avatar')+'" class="avatar"/>');
  });

  Handlebars.registerHelper('userFull', function(userId) {
    var user = app.users.get(userId);
    return new Handlebars.SafeString('<img src="'+user.get('avatar')+'"  class="avatar"/>'+user.get('first_name')+' '+user.get('last_name'));
  });

  // Agnus Croll:
  // http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
  Object.toType = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
  };


  //give forms the ability to serialize to objects

  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });

    return o;
  };

  // Localize or create a new JavaScript Template object.
  var JST = window.JST = window.JST || {};


  // Configure LayoutManager with Backbone Boilerplate defaults.
  Backbone.Layout.configure({
    // Allow LayoutManager to augment Backbone.View.prototype.
    manage: true,

    prefix: "app/templates/",

    fetch: function(path) {
      // Concatenate the file extension.

      // If template is not a path but instead Handlebars.Compile
      if (typeof path === 'function') {
        return path;
      }

      path = path + ".html";

      // If cached, use the compiled template.
      if (JST[path]) {
        return JST[path];
      }

      // Put fetch into `async-mode`.
      var done = this.async();

      // Seek out the template asynchronously.
      // ASYNC is causing render-order trouble, use sync now since it will be compiled anyway

      //$.get(app.root + path, function(contents) {
      //  done(JST[path] = Handlebars.compile(contents));
      //});

      $.ajax({
        url: app.root + path,
        async: false,
        success: function(contents) {
          done(JST[path] = Handlebars.compile(contents));
        }
      });


    }
  });

  // Mix Backbone.Events, modules, and layout management into the app object.
  return _.extend(app, {
    // Create a custom object with a nested Views object.
    module: function(additionalProps) {
      return _.extend({ Views: {} }, additionalProps);
    },

    // Helper for using layouts.
    useLayout: function(options) {
      // Create a new Layout with options.
      var layout = new Backbone.Layout(_.extend({
        el: "body"
      }, options));

      // Cache the refererence.
      return this.layout = layout;
    }

  }, Backbone.Events);
});