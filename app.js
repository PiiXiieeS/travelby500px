var express = require('express')
  , mu = require('mu2')
  , redis = require('redis')
  , config = require('./config')
  , fivehundred = require('./fivehundred')
  , locations = require('./locations')
  , templates = require('./templates')
  , _ = require('underscore')
  , SendGrid = require('sendgrid').SendGrid;

client = redis.createClient();

mu.root = __dirname;

var app = express();
app.use(express.bodyParser());

function renderPage(res, template, variables) {
  var stream = mu.compileAndRender(template, variables);
  res.header('Content-Type', 'text/html');

  if (config.hasOwnProperty("debug") && config.debug) {
    mu.clearCache();
  }
  stream.pipe(res);
}

var findPhotos = function(userOptions, callback) {
  // Images are indexed based on a simple human readable location.
  var city = userOptions.city;
  var province = userOptions.province;

  var locationKey = [city, province].join(':');
  var photoKey = function(id) {
    return ['photo', id].join(':');
  }

  var images = [];

  // Always search for users within this location. The worst we'll do to the
  // 500px API is page through the users results.
  var photosForUser = function(user, reverseIndex) {
    fivehundred.photos({
      feature: 'user',
      user_id: user.id
    }, function(error, response, body) {
      var body = JSON.parse(body);

      body.photos.forEach(function(photo) {
        // Add the photo to the location cache.
        //client.sadd(locationKey, photo.id);

        // Add the photo into a hash.
        client.hmset(photoKey(photo.id), "image_url", photo.image_url)
        images.push(photo);
      });

      if (reverseIndex === 0) {
        client.set(locationKey, JSON.stringify(images), redis.print);
        console.log("Respond w/ images");
        return callback(images);
      }
    });
  }

  fivehundred.users(userOptions, function(error, response, body) {
    if (error) {
      throw error;
    }
    var body = JSON.parse(body);
    var totalUsers = body.users.length;

    // Get all users that have an actual city that was passed.
    body.users.forEach(function(user, index) {
      console.log("Getting photo for user", user);
      photosForUser(user, (totalUsers - (index + 1)));
    });
  });
}

// Returns a list of photo ids for the requested location.
app.get('/photos/:city/:province?/:page?', function(req, res) {
  // Given a location, find photos for it.
  var city = req.params.city.toLowerCase();

  if (req.params.province) {
    var province = req.params.province.toLowerCase();
  } else {
    var province = "";
  }

  var page = req.params.page || 1;

  var locationKey = [city, province].join(':');

  client.get(locationKey, function(err, reply) {
    if (reply) {
      console.log("Cached");
      res.send(reply);
    } else {
      console.log("No cache");
      // UGH
      var userOptions = {
        city: city,
        province: province,
        term: city + ' ' + province,
        page: page
      };
      findPhotos(userOptions, function(data) {
        res.json(data);
      });
    }
  });
});

app.get('/email/:id', function(req, res) {
  var options = {
    id: req.params.id
  }

  var sendgrid = new SendGrid('pixelhackday-bartek', 'pixelhackday');

  // woosh
  fivehundred.photo(options, function(error, response, body) {
    var body = JSON.parse(body);

    console.log(body);
    
    var context = {
      name: body.photo.name,
      url: body.photo.image_url
    }

    var template = _.template(templates.email);
    var emailBody = template(context);
    console.log(emailBody);

    sendgrid.send({
      to: 'bart.ciszk@gmail.com',
      from: 'pixelhackday@bartek.im',
      subject: 'A 500px Photo - ' + body.photo.name,
      text: emailBody
    }, function(success, message) {
      console.log(message);
      if (!success) {
        console.log(message);
      }
      res.send("Ok");
    });
  });
});

// Return information about a specific image.
app.get('/photo/:id', function(req, res) {
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


app.get('/', function(req, res) {
  var context = {
    locations: JSON.stringify(locations)
  }
  return renderPage(res, 'index.html', context);
});
app.use('/static', express.static(__dirname + '/static'));
app.use(express.logger());
app.listen(config.port);
