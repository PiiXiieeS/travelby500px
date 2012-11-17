// Wrapper to 500px API.
var request = require('request')
  , config = require('./config').fivehundred
  , _ = require('underscore');

var FiveHundred = {
  formatResponse: function(error, response, body) {
    return true;
  },

  photo: function(options, callback) {
    var url = config.url + "/photos/" + options.id
    var qs = {
      consumer_key: config.consumer_key
    }
    _.extend(qs, options);
    console.log(qs);

    request.get({
      url: url,
      qs: qs
    }, callback);
  },
  
  photos: function(options, callback) {
    var url = config.url + "/photos";
    var qs = {
      consumer_key: config.consumer_key
    }
    _.extend(qs, options);

    console.log(qs);
    request.get({
      url: url,
      qs: qs
    }, callback);
  },

  users: function(options, callback) {
    var url = config.url + "/users/search";
    var qs = {
        consumer_key: config.consumer_key,
    }
    _.extend(qs, options);

    console.log(url);
    console.log(qs);
    request.get({
      url: url,
      qs: qs
    }, callback);
  }
}

module.exports = FiveHundred;
