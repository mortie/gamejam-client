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

function createImage(url) {
	var img = document.createElement("img");
	img.src = url;
	return img;
}

function background(ctx, camera, offset) {
	if (!background.cache) {
		let cache = [];
		let n = window.innerWidth / 2;
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
	constructor({img, x, y, width, height, dwidth, dheight, wsteps, hsteps, nsteps, loop, fps, rot, offsetX, offsetY}) {
		loop = loop || false;
		fps = fps || 30;
		nsteps = nsteps || wsteps * hsteps;
		dwidth = dwidth || width;
		dheight = dheight || height;
		rot = rot || 0;
		offsetX = offsetX || 0;
		offsetY = offsetY || 0;

		this.img = img;
		this.x = x;
		this.y = y;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this.rot = rot;
		this.width = width;
		this.height = height;
		this.dwidth = dwidth;
		this.dheight = dheight;
		this.wsteps = wsteps;
		this.hsteps = hsteps;
		this.wstep = 0;
		this.hstep = 0;
		this.step = 0;
		this.nsteps = nsteps;
		this.loop = loop;
		this.visible = true;
		this.onend = function(){};

		let interval = setInterval(() => {
			this.step += 1;
			if (this.step >= this.nsteps) {
				this.step = 0;
				this.wstep = 0;
				this.hstep = 0;

				if (!this.loop) {
					clearInterval(interval);
					this.onend();
				}

				return;
			}

			this.wstep += 1;
			if (this.wstep >= this.wsteps) {
				this.wstep = 0;
				this.hstep += 1;
			}

		}, 1000/fps);
	}

	animate(ctx) {
		if (!this.visible)
			return;

		ctx.translate(this.x, this.y);

		if (this.rot)
			ctx.rotate(this.rot);

		ctx.drawImage(
			this.img,
			this.wstep * this.width,
			this.hstep * this.width,
			this.width,
			this.height,
			this.offsetX,
			this.offsetY,
			this.dwidth,
			this.dheight
		);

		if (this.rot)
			ctx.rotate(-this.rot);
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
};
let BulletSounds = {
	spawn: {url: "sounds/bullet_spawn.wav", vol: 0.5},
	despawn: {url: "sounds/bullet_despawn.wav", vol: 1}
};

class Bullet extends Entity {
	constructor(x, y, vel, id, ownerId, game) {
		super(x, y, 5, 5, id, game);
		this.vel.set(vel.x, vel.y);
		this.ownerId = ownerId;

		game.playSound(BulletSounds.spawn, this.pos);
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
			img: BulletImgs.despawn,
			x: this.pos.x,
			y: this.pos.y,
			width: 64,
			height: 64,
			dwidth: 16,
			dheight: 16,
			wsteps: 5,
			hsteps: 5
		}));
		this.game.playSound(BulletSounds.despawn, this.pos);
	}
}

let PlayerImgs = {
	thrust_back: createImage("imgs/player_thrust_back.png"),
	despawn: createImage("imgs/player_despawn.png")
};
let PlayerSounds = {
	despawn: {url: "sounds/player_despawn.wav", vol: 1},
	thrust: {url: "sounds/player_thrust.wav", vol: 1}
};

class Player extends Entity {
	constructor(x, y, id, rot, name, game) {
		super(x, y, 25, 60, id, game);
		this.rot = rot;
		this.rotVel = 0;
		this.keys = {};
		this.health = 0;
		this.name = name;

		this.thrustAnim = new Animation({
			img: PlayerImgs.thrust_back,
			x: this.pos.x,
			y: this.pos.y,
			width: 128,
			height: 128,
			dwidth: 64,
			dheight: 64,
			wsteps: 4,
			hsteps: 4,
			fps: 60,
			loop: true
		});
		this.thrustAnim.visible = false;
		game.animate(this.thrustAnim);

		if (this.id === game.id) {
			this.thrustSound = document.createElement("audio");
			this.thrustSound.src = PlayerSounds.thrust.url;
			this.thrustSound.loop = true;
			this.thrustSound.play();
			this.thrustSound.volume = 0;
		}
	}

	draw(ctx, selfId) {
		let h = Math.round((this.health * 2.4) + 15);

		if (selfId == this.id) {
			ctx.fillStyle = "rgb("+h+", "+h+", "+h+")";
		} else {
			ctx.fillStyle = "rgb("+h+", 0, 0)";
		}

		ctx.rotate(this.rot);

		if (this.keys.up) {
			this.thrustAnim.rot = this.rot;
			this.thrustAnim.x = this.pos.x;
			this.thrustAnim.y = this.pos.y;
			this.thrustAnim.offsetX = -this.thrustAnim.dwidth/2;
			this.thrustAnim.offsetY = this.thrustAnim.dwidth/2;

			if (this.keys.sprint) {
				this.thrustAnim.dheight = 100;
				if (this.id == selfId)
					this.game.screenShake(10);
			} else {
				this.thrustAnim.dheight = 64;
			}
		}

		ctx.beginPath();
		ctx.moveTo(0, -(this.height/2));
		ctx.lineTo(-this.width, this.height/2);
		ctx.lineTo(this.width, this.height/2);
		ctx.closePath();
		ctx.fill();

		{

			let h = (this.height/2) + 10;
			if (this.thrustAnim.visible)
				h += this.thrustAnim.dheight;

		}

		ctx.rotate(-this.rot);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 30px Arial";
		ctx.strokeStyle = "#000000";
		ctx.fillStyle = "#ffffff";
		ctx.lineWidth = 2;
		ctx.fillText(this.name, 0, 0);
		ctx.strokeText(this.name, 0, 0);

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

				let pos = e.pos.clone().sub(this.pos).normalize().scale(130);

				ctx.fillStyle = "rgb(255, 0, 0)";
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, 5, 0, 2*Math.PI);
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

		if (obj.name)
			this.name = obj.name;

		if (this.id == this.game.id && lastHealth > obj.health) {
			this.game.screenShake(50);
		}
	}

	update(dt) {
		super.update(dt);
		this.rot += this.rotVel * dt;

		if (this.keys.up) {
			this.thrustAnim.visible = true;

			if (this.keys.sprint && this.thrustSound)
				this.thrustSound.volume = 0.6;
			else if (this.id === this.game.id)
				this.thrustSound.volume = 0.3;
		} else {
			this.thrustAnim.visible = false;

			if (this.thrustSound)
				this.thrustSound.volume = 0;
		}
	}

	despawn() {
		this.game.animate(new Animation({
			img: PlayerImgs.despawn,
			x: this.pos.x,
			y: this.pos.y,
			width: 64,
			height: 64,
			dwidth: 256,
			dheight: 256,
			offsetX: -128,
			offsetY: -128,
			wsteps: 5,
			hsteps: 5
		}));
		this.thrustAnim.visible = false;
		this.thrustAnim.loop = false;
		this.game.playSound(PlayerSounds.despawn, this.pos);
		if (this.thrustSound)
			this.thrustSound.pause();
	}
}

function createEntity(obj, game) {
	if (obj.type == "player") {
		return new Player(obj.pos.x, obj.pos.y, obj.id, obj.rot, obj.name, game);
	} else if (obj.type == "bullet") {
		return new Bullet(obj.pos.x, obj.pos.y, obj.vel, obj.id, obj.ownerId, game);
	} else {
		throw new Error("Unknown entity type: "+obj.type);
	}
}

export default class Game {
	constructor(sock, canvas, name) {
		this.sock = sock;
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.id = null;
		this.camera = new Vec2(0, 0);
		this.raf = null;
		this.prevTime = new Date().getTime();
		this.player = null;
		this.onloss = function(){};

		this.shake = 0;
		this.shakedec = 0.5;

		this.keymap = [];
		this.keymap[87] = "up";
		this.keymap[38] = "up";
		this.keymap[83] = "down";
		this.keymap[40] = "down";
		this.keymap[65] = "left";
		this.keymap[37] = "left";
		this.keymap[68] = "right";
		this.keymap[39] = "right";
		this.keymap[32] = "shoot";
		this.keymap[16] = "sprint";


		this.entities = [];
		this.animations = [];

		sock.on("ready", () => {
			sock.send("get_id", {
				name: name
			}, (err, res) => {
				this.id = res.id;
			});
		});

		sock.on("set", (msg) => {
			msg.forEach((m) => {
				if (this.entities[m.id]) {
					this.entities[m.id].set(m);
				} else {
					if (!m.type)
						return;

					let ent = createEntity(m, this);
					this.entities[m.id] = ent;
				}
			});
		});

		sock.on("despawn", (msg) => {
			if (!this.entities[msg.id])
				return;

			this.entities[msg.id].despawn();
			delete this.entities[msg.id];
			if (msg.id == this.id) {
				this.screenShake(400);
				setTimeout(() => {
					this.stop();
					this.onloss();
				}, 1200);
			}
		});

		window.addEventListener("keydown", (evt) => {
			if (this.keymap[evt.keyCode]) {
				evt.preventDefault();
				evt.stopPropagation();
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
		this.animations.forEach((a) => {
			this.ctx.save();
			a.animate(this.ctx);
			this.ctx.restore();
		});
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
		this.animations.push(animation);
		animation.onend = () => {
			delete this.animations[i];
		};
	}

	playSound(s, pos) {
		let player = this.entities[this.id];
		if (!player)
			return;

		let dist = player.pos.clone().sub(pos);

		let sound = document.createElement("audio");
		sound.src = s.url;
		sound.volume = Math.max(1 - (dist.length() / 1000), 0) * s.vol;
		sound.play();
	}
}
