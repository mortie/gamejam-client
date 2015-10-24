let Game = require("./game");

document.querySelector("#startGameBtn").addEventListener("click", () => {
	view("game");
	let sock = new SockSugar("ws://serve.mort.coffee:89");
	let game = new Game(sock, document.getElementById("canvas"));

	sock.on("close", () => {
		alert("Server closed.");
		game.stop();
	});
});
