let Game = require("./game");

let game, sock;

function startGame() {
	view("game");
	location.hash = "game";

	sock = new SockSugar(conf.address);
	game = new Game(sock, document.getElementById("canvas"));

	sock.on("close", () => {
		alert("Server closed.");
		game.stop();
	});

	game.onloss = () => view("game-over");
}

document.querySelector("#startGameBtn").addEventListener("click", startGame);
document.querySelector("#restartGameBtn").addEventListener("click", () => {
	location.hash = "game";
	location.reload();
});
document.querySelector("#storyBtn").addEventListener("click", () => {
	location.hash = "";
	location.reload();
});

window.addEventListener("load", () => {
	if (location.hash.substring(1) === "game") {
		startGame();
		console.log("starting");
	}
});
