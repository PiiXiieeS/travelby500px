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

  var PhotoModel = Backbone.Model.extend({});
  // Should setup a collection of photos with thumbnail and primary sizes..
  var PhotoCollection = Backbone.Collection.extend({
    model: PhotoModel
  });
  var Photos = new PhotoCollection();

  var GalleryLayer = L.Class.extend({
    template: '#tm_gallery',

    onAdd: function(map) {
      this._map = map;

      this._el = L.DomUtil.create('div', 'gallery-layer');
      L.DomUtil.setPosition(this._el, [0, 0]);

      $(this._el).css("width", "800px");
      map.getPanes().overlayPane.appendChild(this._el);

      map.on('galleryEnter', this._draw, this);
      map.on('galleryLeave', this._clear, this);
    },

    _clear: function() {
      $(this._el).html("");
    },

    // Render a template that would display the gallery of images.
    _draw: function() {
      // Re-adjust the layer.
      var galleryLayer = new GalleryLayer();
      map.addLayer(galleryLayer);
      this._el = L.DomUtil.create('div', 'gallery-layer');

      L.DomUtil.setPosition(this._el, [0, 0]);
      var context = {
        images: Photos.models.slice(0, 6),
        activeImage: Photos.at(0).toJSON()
      }
      var template = _.template($(this.template).html());
      $(this._el).html(template(context));
    }
  });

  var PhotoLayer = L.Class.extend({
    onAdd: function(map) {
      this._map = map;

      this._el = L.DomUtil.create('div', 'photo-canvas')
      this._el.setAttribute("id", "photo-canvas");
      this._el.setAttribute("height", "600px");
      this._el.setAttribute("width", "800px");

      map.getPanes().overlayPane.appendChild(this._el);

      map.on('springPhotos', this._springPhotos, this);
      map.on('springPhotos', this._reset, this);

      map.on('clearLocation', this.clear, this);
    },

    _reset: function() {
      var latLng = this._map.getCenter();
      var pos = this._map.latLngToLayerPoint(latLng);

      pos.x -= 180;
      pos.y -= 300;

      L.DomUtil.setPosition(this._el, pos);
    },

    clear: function() {
      this._el.innerHTML = "";
      currentLocation = null;
    },

    _springPhotos: function(photos) {
      // Draw the images in some sane way.
      var ctx = this._el;
      var dX = (140 / 3.5);
      var dY = 5; // (140 / 3.5);

      var a = 0, x,y;

      var oX = 20,
        oY = 130, // origin
        r = 200; // radius

      var photos = _.toArray(photos);
      Photos.reset(photos);

      _.each(photos.slice(0,20), function(photo, index) {
        if (photo.image_url) {
          var img = new Image();
          img.onload = function() {
            ctx.appendChild(img);
          }
          //console.log(photo.image_url);
          img.src = photo.image_url;

            a += 35;
            x = oY + r * Math.cos(a * Math.PI / 180);
            y = oY + r * Math.sin(a * Math.PI / 180);

            $(img).animate({"marginTop":y},1);
            $(img).animate({"marginLeft":x},1);
            $(img).animate({"opacity":1},300);

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

      var maxZoom = map.getMaxZoom() + 1;
      var reverseZoom = (maxZoom - map.getZoom());
      
      var nearBy = App.locations.filter(function(obj) {
        var markerLatLng = obj.marker.getLatLng();

        // Take into account the zoom level.
        var distance = markerLatLng.distanceTo(latLng);
        console.log("Distance to ", obj.marker._locationData, distance);

        // The further out the we're zoomed in the more loose this should be.
        return (distance / reverseZoom) < (30 * reverseZoom);
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
    var startLatLng = [43.6229206, -79.374900];

    App.WorldMap = map = L.map('map', {
      keyboard: false
    }).setView(startLatLng, 12);

    var locations = JSON.parse(options.locations);

    L.tileLayer('http://{s}.tile.cloudmade.com/56864ad5a09d4398a7b5a6c79c3d64aa/78209/256/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
      maxZoom: 18
    }).addTo(map);

    // Setup the canvas for gamejs to draw on.
    var gameCanvas = new GameJsLayer();
    map.addLayer(gameCanvas);

    var photoLayer = new PhotoLayer();
    map.addLayer(photoLayer);

    var galleryLayer = new GalleryLayer();
    map.addLayer(galleryLayer);

    var TreasureIcon = new L.Icon({
      iconUrl: '/static/img/treasure.png',
      iconSize: [39, 38]
    });

    // Store the locations into an App state variable for easy access later.
    locations.forEach(function(loc) {
      var marker = L.marker(loc.latLng, {icon: TreasureIcon}).addTo(map);
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
