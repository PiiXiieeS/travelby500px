(function() {
  var root = this;

  var App = root.App = {};

  var $ = root.jQuery;

  // Nasty global for gamejs to take it.
  App.WorldMap = null;
  var map;

  var GameJsLayer = L.Class.extend({
    initialize: function (options) {
    },

    onAdd: function(map) {
      this._map = map;

      this._el = L.DomUtil.create('canvas', 'gjs-canvas')
      // Make this work with gamejs
      this._el.setAttribute("id", "gjs-canvas");
      map.getPanes().overlayPane.appendChild(this._el);
    }
  });

  var mapEvents = function(map) {
    map.on('moveMap', function(directions) {
      console.log("Move the map!", directions);
      if (directions.up) {
        map.panBy([0, -2]);
      }
    });
  }

  App.init = function(options) {
    App.WorldMap = map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('http://{s}.tile.cloudmade.com/56864ad5a09d4398a7b5a6c79c3d64aa/997/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
    }).addTo(map);

    // Setup the canvas for gamejs to draw on.
    var gameCanvas = new GameJsLayer();
    map.addLayer(gameCanvas);

    // Setup triggered events
    mapEvents(map);

    // Run this after the app has initialized.
    require.setModuleRoot('./static/js/');
    require.run('game');
  };

}).call(this);
