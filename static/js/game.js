var gamejs = require('gamejs')
  , SpriteSheet = require('./spritesheet').SpriteSheet;

// Dirty.
var WorldMap = App.WorldMap;

var Animation = function(spriteSheet, animationSpec, fps) {
  this.fps = fps || 2;
  this.frameDuration = 200;
  this.spec = animationSpec;
  
  this.currentFrame = null;
	this.currentFrameDuration = 0;
	this.currentAnimation = null;
	
	this.spriteSheet = spriteSheet;
	
	this.loopFinished = false;
	
	this.image = spriteSheet.get(0);
	return this;
};

Animation.prototype.start = function(animation) {
	this.currentAnimation = animation;
	this.currentFrame = this.spec[animation][0];
	this.currentFrameDuration = 0;
	this.update(0);
	return;
};

Animation.prototype.update = function(msDuration) {
	if (!this.currentAnimation) {
		throw new Error('No animation started.');
	}
	
	this.currentFrameDuration += msDuration;
	if (this.currentFrameDuration >= this.frameDuration){
		this.currentFrame++;
		this.currentFrameDuration = 0;
	
		var aniSpec = this.spec[this.currentAnimation];
		if (aniSpec.length == 1 || this.currentFrame > aniSpec[1]) {
			this.loopFinished = true;
			
			if (aniSpec.length === 3 && aniSpec[2] === false) {
				this.currentFrame--;
			} else {
				this.currentFrame = aniSpec[0];
			}
		}
	}
	
	this.image = this.spriteSheet.get(this.currentFrame);
	return;
};

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

var Wisp = function(rect, spriteSheet, animation) {
  Wisp.superConstructor.apply(this, arguments);

  this.image = gamejs.image.load("/static/img/ship-right.png");
  this.rect = new gamejs.Rect(rect);
  this.speed = 250;
  this.angle = null;
  this.animation = new Animation(spriteSheet, animation, 12);
  this.animation.start('sailing');

  return this;
}
gamejs.utils.objects.extend(Wisp, gamejs.sprite.Sprite);

Wisp.prototype.update = function(msDuration) {
    this.animation.update(msDuration);
    this.image = this.animation.image;
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

  var gameController = new GameController(wisp);

  // Animate!
  var dimensions = {width: 150, height: 175}
  var spriteSheet = new SpriteSheet('/static/img/boat.png', dimensions);
  var animation = {
    'sailing': [0, 1, 2, 4]
  }

  var wisp = new Wisp([0, 0], spriteSheet, animation);

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
  '/static/img/ship-right.png',
  '/static/img/boat.png'
]);
gamejs.ready(main);
