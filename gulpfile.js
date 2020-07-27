const { watch, series, src, dest } = require('gulp');
const fs = require('fs');
const htmlmin = require('gulp-htmlmin');
const EventEmitter = require('events');
const ee = new EventEmitter();
const notifier = require('node-notifier');
const server = require('./server');
const through = require('through2');
const path = require('path');
const replace = require('gulp-replace');

const port = 3005;
const paths = {
	project: `src/project`,
	cfm: `index.cfm`,
	css: `styles/styles.css`,
	template:`src/preview/index.html`
}

paths.project = fs.realpathSync(paths.project);
paths.css = path.resolve(paths.project, paths.css);
paths.cfm = path.resolve(paths.project, paths.cfm);
paths.template = path.resolve(paths.template);

const build = (done) => {
	let cfm = fs.readFileSync(paths.cfm, 'utf8');
	let css = fs.readFileSync(paths.css, 'utf8');
	src(paths.template)
		.pipe(replace(`<!-- HTML -->`, cfm))
	    .pipe(replace(/<link rel="stylesheets" href="styles\/styles\.css" \/>/, `<style scoped>${css}</style>`))
		.pipe(htmlmin({ collapseWhitespace: true })).on('error', function(error) {
			let msg = `Invalid HTML`;
			notifier.notify(msg);
			return done(msg);
		})
		.pipe(through.obj((chunk, enc, cb) => {
			if (!ee.listenerCount(`update`)) {
				return notifier.notify(`No window modules registered. Make sure to add "dev" to the URL`);
			}
			let html = chunk.contents.toString(enc || 'utf8');
			console.log(`Content size: ${html.length}`);
			ee.emit(`update`, {html});
			return cb();
		}));
	done();
}

exports.default = () => {
	server({port, ee, notifier});
	watch([paths.cfm, paths.css], build);
}