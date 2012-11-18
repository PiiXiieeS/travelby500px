var gamejs = require('gamejs');

// Dirty.
var WorldMap = App.WorldMap;

var GameController = function(player) {
  this.player = player;
  this.enter = this.up = this.down = this.left = this.right = false;

  this.handle = function(event) {
    if (event.type === gamejs.event.KEY_DOWN) {
      if (event.key === gamejs.event.K_LEFT) {
        this.left = true;
      } else if (event.key === gamejs.event.K_RIGHT) {
        this.right = true;
      } else if (event.key === gamejs.event.K_UP) {
        this.up = true;
      } else if (event.key === gamejs.event.K_DOWN) {
        this.down = true;
      } else if (event.key === gamejs.event.K_ENTER) {
        WorldMap.fire('galleryEnter');
      } else if (event.key === gamejs.event.K_ESC) {
        WorldMap.fire("galleryLeave");
      } else if (event.key === gamejs.event.K_SPACE) {
        WorldMap.fire('enterGame');
      }
    } else if (event.type === gamejs.event.KEY_UP) {
        if (event.key === gamejs.event.K_LEFT) {
          this.left = false;
        } else if (event.key === gamejs.event.K_RIGHT) {
          this.right = false;
        } else if (event.key === gamejs.event.K_UP) {
          this.up = false;
        } else if (event.key === gamejs.event.K_DOWN) {
          this.down = false;
        } else {
            console.debug(event.key);
        }
    }
  }

  this.angle = function() {
    if (this.up && this.left) {
      WorldMap.fire('moveMap', {up: true, left: true});
      return Math.PI + (Math.PI * 0.25);
    } else if (this.up && this.right) {
      WorldMap.fire('moveMap', {up: true, right: true});
      return Math.PI * -0.25;
    } else if (this.down && this.left) {
      WorldMap.fire('moveMap', {down: true, left: true});
      return Math.PI - (Math.PI * 0.25);
    } else if (this.down && this.right) {
      WorldMap.fire('moveMap', {down: true, right: true});
      return Math.PI * 0.25;
    } else if (this.down) {
      WorldMap.fire('moveMap', {down: true});
      return Math.PI * 0.5;
    } else if (this.left) {
      WorldMap.fire('moveMap', {left: true});
      return Math.PI;
    } else if (this.up) {
      WorldMap.fire('moveMap', {up: true});
      return Math.PI * 1.5;
    } else if (this.right) {
      WorldMap.fire('moveMap', {right: true});
      return 0;
    }
    return null;
  }
  return this;
}

var Wisp = function(rect) {
  Wisp.superConstructor.apply(this, arguments);

  this.image = gamejs.image.load("/static/img/ship-right.png");
  this.rect = new gamejs.Rect(rect);
  this.speed = 250;
  this.angle = null;

  return this;
}
gamejs.utils.objects.extend(Wisp, gamejs.sprite.Sprite);

Wisp.prototype.update = function(msDuration) {
    // Move the map when the player is near the bounding boxes.
    if (this.angle !== null) {
      /*
      this.rect.moveIp(
          Math.cos(this.angle) * this.speed * (msDuration / 1000),
          Math.sin(this.angle) * this.speed * (msDuration / 1000)
      );
      */
    }
}

var main = function() {
  var display = gamejs.display.setMode([200, 200]);

  var wisp = new Wisp([0, 0]);
  var gameController = new GameController(wisp);

  var tick = function(msDuration) {
    gamejs.event.get().forEach(function(event) {
      gameController.handle(event);
    });

    wisp.update(msDuration);

    display.clear()
    wisp.draw(display);

    wisp.angle = gameController.angle();
  };
  gamejs.time.fpsCallback(tick, this, 60);
}

gamejs.preload([
  '/static/img/ship-right.png'
]);
gamejs.ready(main);
