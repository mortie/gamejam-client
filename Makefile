build:
	browserify -t babelify --outfile bundle.js es/*.js
