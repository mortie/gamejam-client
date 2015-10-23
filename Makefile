build:
	browserify -t babelify --outfile bundle.js js/*.js
