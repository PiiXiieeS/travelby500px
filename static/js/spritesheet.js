var gamejs = require('gamejs');

var SpriteSheet = exports.SpriteSheet = function(imagePath, sheetSpec) {
   this.get = function(id) {
      return surfaceCache[id];
   };

   this.width = sheetSpec.width;
   this.height = sheetSpec.height;
   var image = gamejs.image.load(imagePath);
   var surfaceCache = [];
   var imgSize = new gamejs.Rect([0,0],[this.width,this.height]);
   // extract the single images from big spritesheet image
   for (var i=0; i<image.rect.height; i+=this.height) {
       for (var j=0;j<image.rect.width;j+=this.width) {
         var surface = new gamejs.Surface([this.width, this.height]);
         var rect = new gamejs.Rect(j, i, this.width, this.height);
         surface.blit(image, imgSize, rect);
         surfaceCache.push(surface);
      }
   }
   return this;
};
