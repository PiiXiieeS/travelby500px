// List of predefined locations that we can navigate towards.
// Sourced via: http://nominatim.openstreetmap.org/search/?format=json&city=Toronto
var locations = [
  {city: 'Toronto', province: 'Ontario', latLng: [43.6529206, -79.384900]},
  {city: 'Montreal', province: 'Quebec', latLng: [45.5224507, -73.5912827]},
  {city: 'Burlington', province: 'Ontario', latLng: [43.323564, -79.8011553]},
  {city: 'Scarborough', province: 'Ontario', latLng: [43.7758014, -79.253972]},
  {city: 'North York', province: 'Ontario', latLng: [43.7709163, -79.4124102]},
  {city: 'New York', province: 'New York', latLng: [40.7305991, -73.9865812]},
  {city: 'Brooklyn', province: 'New York', latLng: [40.6501038, -73.9495823]},
  {city: 'New Jersey', province: 'New Jersey', latLng: [40.7281575, -74.0776417]},
  {city: 'Long Beach', province: '', latLng: [40.5885116, -73.657861]}
]

module.exports = locations;
