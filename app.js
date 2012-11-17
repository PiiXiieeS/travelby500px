var express = require('express')
  , mu = require('mu2')
  , config = require('./config')
  , fivehundred = require('./fivehundred')
  , redis = require('redis')
  , stream = require('stream');

client = redis.createClient();

mu.root = __dirname;

var app = express();
app.use(express.bodyParser());

// List of predefined locations that we can navigate towards.
// Sourced via: http://nominatim.openstreetmap.org/search/?format=json&city=Toronto
var locations = [
  {city: 'Toronto', province: 'Ontario', latLng: [43.6529206, -79.384900]},
  {city: 'Montreal', province: 'Quebec', latLng: [45.5224507, -73.5912827]}
]

function renderPage(res, template, variables) {
  var stream = mu.compileAndRender(template, variables);
  res.header('Content-Type', 'text/html');

  if (config.hasOwnProperty("debug") && config.debug) {
    mu.clearCache();
  }
  stream.pipe(res);
}

// Return information about a specific image.
app.get('/photos/:id', function(req, res) {
  var options = {
    id: req.params.id
  }
  fivehundred.photo(options, function(error, response, body) {
    if (error) {
      throw error;
    }

    var body = JSON.parse(body);
    res.json(body);
  });
});

// Returns a list of photo ids for the requested location.
app.get('/photos/:city/:province/:page?', function(req, res) {
  // Given a location, find photos for it.
  var city = req.params.city.toLowerCase();
  var province = req.params.province.toLowerCase();
  var page = req.params.page || 1;

  var userOptions = {
    term: city + ' ' + province,
    page: page
  };

  // Images are indexed based on a simple human readable location.
  var locationKey = [city, province].join(':');
  var photoKey = function(id) {
    return ['photo', id].join(':');
  }

  var dataStream = new stream.Stream();
  dataStream.writable = true;
  dataStream.write = function(data) {
    console.log(data);
    return true;
  }

  // Always search for users within this location. The worst we'll do to the
  // 500px API is page through the users results.
  var photosForUser = function(user) {
    fivehundred.photos({
      feature: 'user',
      user_id: user.id
    }, function(error, response, body) {
      var body = JSON.parse(body);
      body.photos.forEach(function(photo) {
        // Add the photo to the location cache.
        client.sadd(locationKey, photo.id);

        // Add the photo into a hash.
        client.hmset(photoKey(photo.id), "image_url", photo.image_url)
        dataStream.write(photo);
      });
    });
  }

  fivehundred.users(userOptions, function(error, response, body) {
    if (error) {
      throw error;
    }
    var body = JSON.parse(body);

    // Get all users that have an actual city that was passed.
    body.users.forEach(function(user) {
      photosForUser(user);
    });
  });
  res.send(dataStream);
});

app.get('/', function(req, res) {
  var context = {
    locations: JSON.stringify(locations)
  }
  return renderPage(res, 'index.html', context);
});
app.use('/static', express.static(__dirname + '/static'));
app.use(express.logger());
app.listen(config.port);
