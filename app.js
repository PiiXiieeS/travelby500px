var express = require('express')
  , mu = require('mu2')
  , config = require('./config')
  , fivehundred = require('./fivehundred')
  , redis = require('redis');

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

app.get('/photos', function(req, res) {
  // Given a location, find photos for it.
  city = 'Toronto'
  province = 'Ontario'
  var user_options = {
    term: city + ' ' + province
  };

  fivehundred.users(user_options, function(error, response, body) {
    if (error) {
      throw error;
    }
    var body = JSON.parse(body);

    var images = [];
    // Get all users that have an actual city that was passed.
    body.users.forEach(function(user) {
      fivehundred.photos({
        feature: 'user',
        user_id: user.id
      }, function(error, response, body) {
        var body = JSON.parse(body);
        body.photos.forEach(function(photo) {
          images.push(photo.id);
        });
      });
    });
  });
  res.json("Ok");
});

app.get('/', function(req, res) {
  return renderPage(res, 'index.html', {});
});
app.use('/static', express.static(__dirname + '/static'));
app.use(express.logger());
app.listen(config.port);
