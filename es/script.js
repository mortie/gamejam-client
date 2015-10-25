let Game = require("./game");

let game, sock;

function startGame(name) {
	if (typeof name !== "string")
		name = document.getElementById("playerName").value || "Guest";

	view("game");
	location.hash = name;

	sock = new SockSugar(conf.address);
	game = new Game(sock, document.getElementById("canvas"), name);

	sock.on("close", () => {
		alert("Server closed.");
		game.stop();
	});

	game.onloss = () => view("game-over");
}

document.querySelector("#startForm").addEventListener("submit", (evt) => {
	evt.preventDefault();
	startGame();
});

document.querySelector("#restartGameBtn").addEventListener("click", () => {
	location.reload();
});

document.querySelector("#storyBtn").addEventListener("click", () => {
	location.hash = "";
	location.reload();
});

window.addEventListener("load", () => {
	let name = location.hash.substring(1);
	if (name) {
		startGame(name);
		console.log("starting");
	}
});
