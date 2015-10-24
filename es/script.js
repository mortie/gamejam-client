let Game = require("./game");

document.querySelector("#startGameBtn").addEventListener("click", () => {
	view("game");
	let sock = new SockSugar(conf.address);
	let game = new Game(sock, document.getElementById("canvas"));

	sock.on("close", () => {
		alert("Server closed.");
		game.stop();
	});
});
