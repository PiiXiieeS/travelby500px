var gamejs = require('gamejs');

// Dirty.
var WorldMap = App.WorldMap;

var GameController = function(player) {
  this.player = player;
  this.up = this.down = this.left = this.right = false;

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
      return Math.PI + (Math.PI * 0.25);
    } else if (this.up && this.right) {
      return Math.PI * -0.25;
    } else if (this.down && this.left) {
      return Math.PI - (Math.PI * 0.25);
    } else if (this.down && this.right) {
      return Math.PI * 0.25;
    } else if (this.down) {
      return Math.PI * 0.5;
    } else if (this.left) {
      return Math.PI;
    } else if (this.up) {
      return Math.PI * 1.5;
    } else if (this.right) {
      return 0;
    }
    return null;
  }
  return this;
}

var Wisp = function(rect) {
  Wisp.superConstructor.apply(this, arguments);

  this.image = gamejs.image.load("/static/wisp.png");
  this.rect = new gamejs.Rect(rect);
  this.speed = 250;
  this.angle = null;

  return this;
}
gamejs.utils.objects.extend(Wisp, gamejs.sprite.Sprite);

Wisp.prototype.update = function(msDuration) {
    // Move the map when the player is near the bounding boxes.
    if (this.rect.y < 10) {
      WorldMap.fire('moveMap', {up: true});
    }

    if (this.angle !== null) {
      this.rect.moveIp(
          Math.cos(this.angle) * this.speed * (msDuration / 1000),
          Math.sin(this.angle) * this.speed * (msDuration / 1000)
      );
    }
}

var main = function() {
  var display = gamejs.display.setMode([800, 600]);

  var wisp = new Wisp([200, 200]);
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
  '/static/wisp.png'
]);
gamejs.ready(main);
