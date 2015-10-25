let Game = require("./game");

let game, sock;

function startGame() {
	view("game");

	sock = new SockSugar(conf.address);
	game = new Game(sock, document.getElementById("canvas"));

	sock.on("close", () => {
		alert("Server closed.");
		game.stop();
	});

	game.onloss = () => view("game-over");
}

document.querySelector("#startGameBtn").addEventListener("click", startGame);
document.querySelector("#restartGameBtn").addEventListener("click", startGame);
