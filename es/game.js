let Vec2 = require("./vec2");

function randint(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random(min, max) {
	return Math.random() * (max - min + 1) + min;
}

function diff(n1, n2) {
	return Math.abs(n1 - n2);
}

function background(ctx, camera, offset) {
	if (!background.cache) {
		let cache = [];
		let n = 1000;
		for (let i = 0; i < n; ++i) {
			let parallax = random(5.6, 9);
			cache.push({
				x: randint(0, window.innerWidth * parallax),
				y: randint(0, window.innerHeight * parallax),
				p: parallax
			});
		}
		background.cache = cache;
	}

	let cx = camera.x;
	let cy = camera.y;
	let cache = background.cache;

	let fs = ctx.fillStyle;
	ctx.fillStyle = "#FFFFFF";
	for (let i = 0, len = cache.length; i < len; ++i) {
		let p = cache[i];
		let x = (((p.x - cx) / p.p) + offset.x) % window.innerWidth;
		let y = (((p.y - cy) / p.p) + offset.y) % window.innerHeight;
		if (x < 0)
			x += window.innerWidth;
		if (y < 0)
			y += window.innerHeight;

		ctx.beginPath();
		ctx.arc(x, y, 1, 0, 2*Math.PI);
		ctx.closePath();
		ctx.fill();
	}
	ctx.fillStyle = fs;
}

window.addEventListener("resize", () => background.cache = null);

class Animation {
	constructor({img, x, y, width, height, nsteps, loop = false, fps = 10}) {
		this.img = img;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.nsteps = nsteps;
		this.step = 0;
		this.onend = function(){};

		let interval = setInterval(() => {
			this.step += 1;
			if (this.step > this.nsteps) {
				this.step = 0;

				if (!loop)
					this.onend();
			}
		}, 1000/fps);
	}

	animate(ctx) {
		ctx.drawImage(
			this.img,
			this.step * this.width,
			0,
			this.width,
			this.height,
			this.x,
			this.y,
			this.width,
			this.height
		);
	}
}

class Entity {
	constructor(x, y, width, height, id, game) {
		this.pos = new Vec2(x, y);
		this.vel = new Vec2(0, 0);
		this.width = width;
		this.height = height;
		this.game = game;

		this.id = id;
	}

	draw(ctx) {}

	set(obj) {
		this.pos.set(obj.pos.x, obj.pos.y);
		this.vel.set(obj.vel.x, obj.vel.y);
	}

	update(dt) {
		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;
	}

	despawn() {}
}

let BulletImgs = {
	despawn: createImage("imgs/bullet_despawn.png")
}

class Bullet extends Entity {
	constructor(x: 0, y: 0, vel, id, ownerId, game) {
		super(x, y, 5, 5, id, game);
		this.imgs = BulletImgs;
		this.vel.set(vel.x, vel.y);
		this.ownerId = ownerId;

		if (ownerId == game.id)
			game.screenShake(10, 0);
	}

	draw(ctx, selfId) {
		if (selfId == this.ownerId) {
			ctx.fillStyle = "#FFFFFF";
		} else {
			ctx.fillStyle = "#FF0000";
		}

		ctx.beginPath();
		ctx.arc(-(this.width/2), -(this.height/2), this.width/2, 0, 2*Math.PI);
		ctx.closePath();
		ctx.fill();
	}

	set(obj) {
		super.set(obj);
	}

	despawn() {
		this.game.animate(new Animation({
			img: this.imgs.despawn,
			x: this.pos.x,
			y: this.pos.y
		}));
	}
}

let PlayerImgs = {
	thrust_back: createImage("imgs/player_thrust_back.png"),
	explosion: createImage("imgs/player_explosion.png")
}

class Player extends Entity {
	constructor(x, y, id, rot, game) {
		super(x, y, 25, 60, id, game);
		this.imgs = PlayerImgs;
		this.rot = rot;
		this.rotVel = 0;
		this.keys = {};
		this.health = 0;
	}

	draw(ctx, selfId) {
		let h = 255-((100-this.health) * 2)

		if (selfId == this.id) {
			ctx.fillStyle = "rgb("+h+", "+h+", "+h+")";
		} else {
			ctx.fillStyle = "rgb("+h+", 0, 0)";
		}

		ctx.rotate(this.rot);

		if (this.keys.up) {
			ctx.drawImage(
				this.imgs.thrust_back,
				-this.width,
				this.height/2,
				this.width*2,
				this.height*2
			);
		}

		ctx.beginPath();
		ctx.moveTo(0, -(this.height/2));
		ctx.lineTo(-this.width, this.height/2);
		ctx.lineTo(this.width, this.height/2);
		ctx.closePath();
		ctx.fill();

		ctx.rotate(-this.rot);

		//Draw pointers to far away players
		if (selfId == this.id) {
			this.game.entities.forEach((e) => {

				//Only draw players
				if (!(e instanceof Player))
					return;

				//Only draw far away players
				if (
					diff(e.pos.x, this.pos.x) < window.innerWidth / 2 &&
					diff(e.pos.y, this.pos.y) < window.innerHeight / 2
				) {
					return;
				}

				let pos = e.pos.clone().sub(this.pos).normalize().scale(100);

				console.log(pos);

				ctx.fillStyle = "rgb(255, 0, 0)";
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, 10, 0, 2*Math.PI);
				ctx.closePath();
				ctx.fill();
			});
		}
	}

	set(obj) {
		super.set(obj);
		let lastHealth = this.health;

		this.rot = obj.rot;
		this.rotVel = obj.rotVel;
		this.keys = obj.keys;
		this.health = obj.health;

		if (this.id == this.game.id && lastHealth > obj.health) {
			this.game.screenShake(200);
		}
	}

	update(dt) {
		super.update(dt);
		this.rot += this.rotVel * dt;
	}
}

function createEntity(obj, game) {
	if (obj.type == "player") {
		return new Player(obj.pos.x, obj.pos.y, obj.id, obj.rot, game);
	} else if (obj.type == "bullet") {
		return new Bullet(obj.pos.x, obj.pos.y, obj.vel, obj.id, obj.ownerId, game);
	} else {
		console.log("Unknown entity type: "+obj.type);
		return false;
	}
}

function createImage(url) {
	var img = document.createElement("img");
	img.src = url;
	return img;
}

export default class Game {
	constructor(sock, canvas) {
		this.sock = sock;
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.id = null;
		this.camera = new Vec2(0, 0);
		this.raf = null;
		this.prevTime = new Date().getTime();
		this.player = null;

		this.shake = 0;
		this.shakedec = 0.5;

		this.keymap = [];
		this.keymap[87] = "up";
		this.keymap[83] = "down";
		this.keymap[65] = "left";
		this.keymap[68] = "right";
		this.keymap[32] = "shoot";

		this.entities = [];
		this.animations = [];

		sock.on("ready", () => {
			sock.send("get_id", {}, (err, res) => {
				this.id = res.id;
			});
		});

		sock.on("set", (msg) => {
			if (!this.entities[msg.id]) {
				let ent = createEntity(msg, this);
				if (ent)
					this.entities[msg.id] = ent;
			} else {
				this.entities[msg.id].set(msg);
			}
		});

		sock.on("despawn", (msg) => {
			delete this.entities[msg.id];
			if (msg.id == this.id) {
				alert("You died.");
				this.stop();
			}
		});

		window.addEventListener("keydown", (evt) => {
			if (this.keymap[evt.keyCode]) {
				evt.preventDefault();
				this.sock.send("keydown", {
					key: this.keymap[evt.keyCode]
				});
			}
		});

		window.addEventListener("keyup", (evt) => {
			if (this.keymap[evt.keyCode]) {
				this.sock.send("keyup", {
					key: this.keymap[evt.keyCode]
				});
			}
		});

		this.update();
	}

	update() {
		let dt = new Date().getTime() - this.prevTime;
		this.prevTime = new Date().getTime();

		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;

		let player = this.entities[this.id];
		if (player) {
			this.camera.set(
				player.pos.x - (window.innerWidth / 2),
				player.pos.y - (window.innerHeight / 2)
			);
		}

		let shakeOffset = new Vec2(0, 0);
		if (this.shake > 0) {
			shakeOffset.set(
				(Math.random() - 0.5) * this.shake,
				(Math.random() - 0.5) * this.shake
			);
			this.shake -= dt * this.shakedec;
		} else  {
			shakeOffset.set(0, 0);
		}

		let cam = this.camera.clone().add(shakeOffset);

		background(this.ctx, this.camera, shakeOffset);

		this.ctx.translate(-cam.x, -cam.y);
		this.entities.forEach((ent) => {
			this.ctx.save();
			this.ctx.translate(ent.pos.x, ent.pos.y);
			ent.draw(this.ctx, this.id);
			this.ctx.restore();

			ent.update(dt);
		});
		this.animations.forEach((a) => a.animate());
		this.ctx.translate(cam.x, cam.y);

		this.raf = window.requestAnimationFrame(this.update.bind(this));
	}

	stop() {
		window.cancelAnimationFrame(this.raf);
	}

	screenShake(n) {
		if (this.shake < n)
			this.shake = n;
	}

	animate(animation) {
		let i = this.animations.length;
		this.animations.add(animation);
		animation.onend = () => {
			delete this.animations[i];
		}
	}
}
