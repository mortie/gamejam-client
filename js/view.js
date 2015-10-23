window.view = function(name) {
	var current = document.querySelector(".view.current");
	var newElem = document.querySelector(".view."+name);

	if (current)
		current.className = current.className.replace(" current", "");

	if (newElem.className.indexOf(" current") === -1)
		newElem.className += " current";
};
