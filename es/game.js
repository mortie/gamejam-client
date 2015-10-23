function randint(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function background(ctx, camera) {
	if (!background.cache) {
		let cache = [];
		for (let i = 0; i < window.innerWidth; ++i) {
			cache.push({
				x: randint(0, window.innerWidth * 5),
				y: randint(0, window.innerHeight * 5)
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
		ctx.beginPath();
		let x = Math.floor(((p.x - cx) / 5) % window.innerWidth);
		let y = Math.floor(((p.y - cy) / 5) % window.innerHeight);
		ctx.arc(x, y, 1, 0, 2*Math.PI);
		ctx.closePath();
		ctx.fill();
	}
	ctx.fillStyle = fs;
}

class Entity {
	constructor(x, y, width, height, id) {
		this.pos = {x: x, y: y};
		this.vel = {x: 0, y: 0};
		this.width = width;
		this.height = height;

		this.id = id;
	}

	draw(ctx) {}

	set(obj) {
		this.pos = obj.pos;
		this.vel = obj.vel;
	}

	update(dt) {
		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;
	}
}

class Bullet extends Entity {
	constructor(x, y, vel, id, ownerId) {
		super(x, y, 5, 5, id);
		this.vel = vel;
		this.ownerId = ownerId;
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
}

class Player extends Entity {
	constructor(x, y, id, rot) {
		super(x, y, 25, 60, id);
		this.rot = rot;
		this.rotVel = 0;
	}

	draw(ctx, selfId) {
		if (selfId == this.id) {
			ctx.fillStyle = "#FFFFFF";
		} else {
			ctx.fillStyle = "#FF0000";
		}

		ctx.rotate(this.rot);
		ctx.beginPath();
		ctx.moveTo(0, -(this.height/2));
		ctx.lineTo(-this.width, this.height/2);
		ctx.lineTo(this.width, this.height/2);
		ctx.closePath();
		ctx.fill();
	}

	set(obj) {
		super.set(obj);
		this.rot = obj.rot;
		this.rotVel = obj.rotVel;
	}

	update(dt) {
		super.update(dt);
		this.rot += this.rotVel * dt;
	}
}

function createEntity(obj) {
	if (obj.type == "player") {
		return new Player(obj.pos.x, obj.pos.y, obj.id, obj.rot);
	} else if (obj.type == "bullet") {
		return new Bullet(obj.pos.x, obj.pos.y, obj.vel, obj.id, obj.ownerId);
	} else {
		throw new Error("Unknown entity type: "+obj.type);
	}
}

export default class Game {
	constructor(sock, canvas) {
		this.sock = sock;
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.id = null;
		this.camera = {x: 0, y: 0};
		this.raf = null;
		this.prevTime = new Date().getTime();
		this.player = null;

		this.keymap = [];
		this.keymap[40] = "down";
		this.keymap[38] = "up";
		this.keymap[37] = "left";
		this.keymap[39] = "right";
		this.keymap[32] = "shoot";

		this.entities = [];

		sock.on("ready", () => {
			sock.send("get_id", {}, (err, res) => {
				this.id = res.id;
			});
		});

		sock.on("set", (msg) => {
			console.log(msg);
			if (!this.entities[msg.id])
				this.entities[msg.id] = createEntity(msg);
			else
				this.entities[msg.id].set(msg);
		});

		sock.on("despawn", (msg) => {
			delete this.entities[msg.id];
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

		background(this.ctx, this.camera);

		let player = this.entities[this.id];
		if (player) {
			this.camera = {
				x: player.pos.x - (window.innerWidth / 2),
				y: player.pos.y - (window.innerHeight / 2)
			};
		}

		this.ctx.translate(-this.camera.x, -this.camera.y);
		this.entities.forEach((ent) => {
			this.ctx.save();
			this.ctx.translate(ent.pos.x, ent.pos.y);
			ent.draw(this.ctx, this.id);
			this.ctx.restore();

			ent.update(dt);
		});
		this.ctx.translate(this.camera.x, this.camera.y);

		this.raf = window.requestAnimationFrame(this.update.bind(this));
	}
}
