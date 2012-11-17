(function() {
  var root = this;

  var App = root.App = {};

  var $ = root.jQuery;

  // Nasty global for gamejs to take it.
  App.WorldMap = null;
  var map;

  App.locations = [];

  var GameJsLayer = L.Class.extend({
    initialize: function (latLng) {
    },

    onAdd: function(map) {
      this._map = map;

      this._el = L.DomUtil.create('canvas', 'gjs-canvas')
      // Make this work with gamejs
      this._el.setAttribute("id", "gjs-canvas");
      map.getPanes().overlayPane.appendChild(this._el);

      map.on('viewreset', this._reset, this);
      map.on('movestart', this._reset, this);
      this._reset();
    },

    _reset: function() {
      console.log(this._map);
      // Update layers position.
      var latLng = this._map.getCenter();
      var pos = this._map.latLngToLayerPoint(latLng);
      console.log(pos);
      L.DomUtil.setPosition(this._el, pos);

      // Update all App markers with new locations.
      // If this position is near a marker, we should fire a marker found event.
      //
      App.locations.forEach(function(obj) {
        obj.loc = map.latLngToLayerPoint(obj.marker.getLatLng());
      });
      
      var nearBy = App.locations.filter(function(obj) {
        var diffX = Math.abs(obj.loc.x - pos.x);
        var diffY = Math.abs(obj.loc.y - pos.y);
        console.log(diffX, diffY);
        return (diffX < 20 && diffY < 20);
      });

      if (nearBy.length) {
        console.log("Fire nearLocation");
        map.fire('nearLocation', nearBy[0]);
      }
    }
  });

  var mapEvents = function(map) {
    var speed = 2;
    map.on('moveMap', function(directions) {
      if (directions.up && directions.right) {
        map.panBy([speed, -speed]);
      } else if (directions.up && directions.left) {
        map.panBy([-speed, -speed]);
      } else if (directions.down && directions.left) {
        map.panBy([-speed, speed]);
      } else if (directions.down && directions.right) {
        map.panBy([speed, speed]);
      } else if (directions.up) {
        map.panBy([0, -speed]);
      } else if (directions.left) {
        map.panBy([-speed, 0]); 
      } else if (directions.right) {
        map.panBy([speed, 0]);
      } else if (directions.down) {
        map.panBy([0, speed]);
      }
    });
  }

  App.init = function(options) {
    var startLatLng = [43.6529206, -79.384900];

    App.WorldMap = map = L.map('map', {
      keyboard: false
    }).setView(startLatLng, 13);

    var locations = JSON.parse(options.locations);

    L.tileLayer('http://{s}.tile.cloudmade.com/56864ad5a09d4398a7b5a6c79c3d64aa/997/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
    }).addTo(map);

    // Setup the canvas for gamejs to draw on.
    var gameCanvas = new GameJsLayer(startLatLng);
    map.addLayer(gameCanvas);

    console.log(locations);
    locations.forEach(function(loc) {
      var marker = L.marker(loc.latLng).addTo(map);
      App.locations.push({marker: marker, loc: null});
    });

    // Setup triggered events
    mapEvents(map);

    // Run this after the app has initialized.
    require.setModuleRoot('./static/js/');
    require.run('game');
  };

}).call(this);
