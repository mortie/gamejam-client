let Game = require("./game.js");

document.querySelector("#startGameBtn").addEventListener("click", () => {
	view("game");
	let sock = new SockSugar("ws://localhost:8081");
	let game = new Game(sock, document.getElementById("canvas"));
});
