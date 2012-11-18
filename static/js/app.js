(function() {
  var root = this;

  var App = root.App = {};

  var $ = root.jQuery;
  var _ = root._;

  var currentLocation = null;

  // Nasty global for gamejs to take it.
  App.WorldMap = null;
  var map;

  App.locations = [];

  var PhotoLayer = L.Class.extend({
    onAdd: function(map) {
      this._map = map;

      this._el = L.DomUtil.create('div', 'photo-canvas')
      // Make this work with gamejs
      this._el.setAttribute("id", "photo-canvas");
      this._el.setAttribute("height", "600px");
      this._el.setAttribute("width", "800px");

      map.getPanes().overlayPane.appendChild(this._el);

      map.on('springPhotos', this._springPhotos, this);
      map.on('springPhotos', this._reset, this);

      map.on('clearLocation', this._clearCanvas, this);
    },

    _reset: function() {
      var latLng = this._map.getCenter();
      var pos = this._map.latLngToLayerPoint(latLng);

      pos.x -= 180;
      pos.y -= 300;

      L.DomUtil.setPosition(this._el, pos);
    },

    _clearCanvas: function() {
      var ctx = this._el;
      ctx.innerHTML = "";

      currentLocation = null;
    },

    _springPhotos: function(photos) {
      // Draw the images in some sane way.
      var ctx = this._el;
      var dX = (140 / 3.5);
      var dY = 5; // (140 / 3.5);

      _.each(photos, function(photo, index) {
        if (photo.image_url) {
          var img = new Image();
          img.onload = function() {
            ctx.appendChild(img);
          }
          console.log(photo.image_url);
          img.src = photo.image_url;
        }
      });
    }
  });

  var GameJsLayer = L.Class.extend({
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
      // Update layers position.
      var latLng = this._map.getCenter();
      var pos = this._map.latLngToLayerPoint(latLng);
      console.log(pos);
      L.DomUtil.setPosition(this._el, pos);

      // Update all App markers with new locations.
      // If this position is near a marker, we should fire a marker found event.
      App.locations.forEach(function(obj) {
        obj.loc = map.latLngToLayerPoint(obj.marker.getLatLng());
      });
      
      var nearBy = App.locations.filter(function(obj) {
        var latLng = obj.marker.getLatLng();

        var diffX = Math.abs(obj.loc.x - pos.x);
        var diffY = Math.abs(obj.loc.y - pos.y);
        console.log(diffX, diffY);
        // Crap. Fix later.
        return (diffX < 10 && diffY < 10);
      });

      if (nearBy.length) {
        var nearBy = nearBy[0];
        console.log("Fire nearLocation", nearBy.marker._locationData);
        map.fire('nearLocation', nearBy.marker._locationData);
      } else {
        map.fire('clearLocation');
      }
    }
  });

  var getPhotos = _.debounce(function(url) {
    $.getJSON(url, function(data) {
      map.fire('springPhotos', data);
    });
  }, 600);

  var mapEvents = function(map) {
    var speed = 4;
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

    map.on('nearLocation', function(data) {
      var url = ['/photos', data.city, data.province].join('/');
      
      if (currentLocation !== url) {
        getPhotos(url);
      }
      currentLocation = url;
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
    var gameCanvas = new GameJsLayer();
    map.addLayer(gameCanvas);

    var photoLayer = new PhotoLayer();
    map.addLayer(photoLayer);

    // Store the locations into an App state variable for easy access later.
    locations.forEach(function(loc) {
      var marker = L.marker(loc.latLng).addTo(map);
      marker._locationData = {
        city: loc.city,
        province: loc.province
      }
      App.locations.push({marker: marker, loc: null});
    });

    // Setup triggered events
    mapEvents(map);

    // Run this after the app has initialized.
    require.setModuleRoot('./static/js/');
    require.run('game');
  };

}).call(this);
