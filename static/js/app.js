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
    model: PhotoModel,

    initialize: function() {
      this.activeIndex = 0;
    },

    // Hacked image at a certain index
    imageAtIndex: function(index) {
      // HACK. Replace the 2.jpg in the activeImage with 4.jpg. Is bigger
      var instance = this.at(index);

      if (!instance || !instance.get('image_url')) {
        return null;
      }
      console.log("Replacing?", instance);
      var url = instance.get('image_url').replace('2.jpg', '4.jpg');
      instance.set({image_url_large: url});
      return instance
    },

    activeImage: function() {
      return this.imageAtIndex(this.activeIndex);
    },

    getNextImage: function() {
      return this.imageAtIndex(this.activeIndex + 1);
    },

    getPreviousImage: function() {
      return this.imageAtIndex(this.activeIndex - 1);
    },

    nextImage: function() {
      if (!this.imageAtIndex(this.activeIndex + 1)) {
        return
      }

      this.activeIndex += 1;
      return this.activeImage();
    },

    previousImage: function() {
      if (!this.imageAtIndex(this.activeIndex - 1)) {
        return
      }

      this.activeIndex -= 1;
      return this.activeImage();
    }
  });
  var Photos = new PhotoCollection();

  // A functional photo gallery
  var GalleryView = Backbone.View.extend({
    template: '#tm_gallery',
    emailTemplate: '#tm_email',

    id: "#gallery-layer", 

    initialize: function(map) {
      _.bindAll(this);
      var self = this;

      this._map = map;
      this.el = $(this.id).hide();

      $(this.el).on("click #send-grid", function() {
        self.showEmailView();
      });

      $(this.el).on("click #gallery-email-submit", function() {
        self.sendEmail();
      });

      // Whyyyy
      map.on('galleryEnter', this.render, this);
      map.on('galleryEnter', this._bindGallery, this);
      map.on('galleryLeave', this._clear, this);
      map.on('galleryLeave', this._unbindGallery, this);
    },

    sendEmail: function() {
      var photo = Photos.activeImage();
      $.get("/email/" + photo.id, function(resp) {
        console.log("EmailResponse", resp);
      });
      $(this.emailTemplate).hide();
    },

    showEmailView: function() {
      var context = {};
      var template = _.template($(this.emailTemplate).html());
      $(this.el).append((template(context)));
    },

    // Unbind default events, then
    _bindGallery: function() {
      App.unbindEvents(map);
      var self = this;

      map.on('moveMap', _.debounce(function(direction) {
        console.log('moveMap.Gallery');
        if (direction.left) {
          Photos.previousImage();
          self.render();
        } else if (direction.right) {
          Photos.nextImage();
          self.render();
        }
      }, 100));
    },

    _unbindGallery: function() {
      map.off('moveMap')
      App.bindEvents(map);
    },

    _clear: function() {
      $(this.el).html("").hide("slow");
    },

    // Render a template that would display the gallery of images.
    render: function() {
      // Re-adjust the layer.
      var context = {
        activeImage: Photos.activeImage(),
        nextImage: Photos.getNextImage(),
        previousImage: Photos.getPreviousImage()
      }
      var template = _.template($(this.template).html());
      $(this.el).html(template(context)).show("slow");
    }
  });

  // Display a circle of photos.
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

      // What is this for again?
      pos.x -= 180;
      pos.y -= 300;

      L.DomUtil.setPosition(this._el, pos);
    },

    clear: function() {
      var el = this._el;

      _.delay(function() {
        $(el).fadeOut(function() {
          $(el).html("");
        });
      }, 500);
      currentLocation = null;
    },

    _springPhotos: function(photos) {
      $(this._el).show();
      // Draw the images in some sane way.
      var ctx = this._el;

      var a = 0, x,y;

      var oX = 20,
        oY = 130, // origin
        r = 200; // radius

      var photos = _.shuffle(_.toArray(photos));
      Photos.reset(photos);

      // lame hax!
      var infoEnter = {};
      infoEnter.image_url = '/static/img/info-enter.png'

      var toDisplay = photos.slice(0, 8);
      toDisplay.push(infoEnter);

      _.each(toDisplay, function(photo, index) {
        if (photo.image_url) {
          var img = new Image();
          img.onload = function() {
            ctx.appendChild(img);
          }
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

  App.unbindEvents = function(map) {
    var map = map || App.WorldMap;
    map.off('moveMap');
  }

  App.bindSplashEvents = function(map) {
    var map = map || App.WorldMap;

    map.on('enterGame', function() {
      $("#splash").hide("slow");
      // Setup triggered events
      App.bindEvents(map);
    });
  }

  App.bindEvents = function(map) {
    var map = map || App.WorldMap;

    var speed = 4;
    map.on('moveMap', function(directions) {
      console.log('moveMap.Default');
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
    // Toronto
    // var startLatLng = [43.6229206, -79.374900];

    // New York
    var startLatLng = [40.7305991, -73.9465812];

    App.WorldMap = map = L.map('map', {
      keyboard: false
    }).setView(startLatLng, 12);

    var locations = JSON.parse(options.locations);


    L.tileLayer('http://{s}.tile.cloudmade.com/56864ad5a09d4398a7b5a6c79c3d64aa/78209/256/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 18
    }).addTo(map);

    // Setup the canvas for gamejs to draw on.
    var gameCanvas = new GameJsLayer();
    map.addLayer(gameCanvas);

    var photoLayer = new PhotoLayer();
    map.addLayer(photoLayer);

    var galleryView = new GalleryView(map);

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

    // Splash screen events
    App.bindSplashEvents(map);

    // Run this after the app has initialized.
    require.setModuleRoot('./static/js/');
    require.run('game');
  };

}).call(this);
