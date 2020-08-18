const { watch, series, src, dest, lastRun } = require('gulp');
const fs = require('fs');
const htmlmin = require('gulp-htmlmin');
const EventEmitter = require('events');
const ee = new EventEmitter();
const notifier = require('node-notifier');
const server = require('./server');
const through = require('through2');
const path = require('path');
const replace = require('gulp-replace');
const tap = require('gulp-tap');
const minifyInline = require('gulp-minify-inline');
const port = 3005;
const paths = {
	project: process.argv.indexOf('--project') == -1 ? `src/project` : process.argv[process.argv.indexOf('--project') + 1],
	html: `**/*.html`,
	cfm: `**/*.cfm`,
	css: `**/*.css`,
	template:`src/preview/index.html`,
	tmp: {
		css: path.resolve(__dirname, 'src/tmp') + '/**/*.css',
		html: path.resolve(__dirname, 'src/tmp') + '/*.html'
	}
}

console.log(paths.tmp.css, paths.tmp.html);

paths.project = fs.realpathSync(paths.project);
paths.template = path.resolve(paths.template);
paths.cfm = `${paths.project}/${paths.cfm}`;
paths.css = `${paths.project}/${paths.css}`;
paths.html = `${paths.project}/${paths.html}`;


const buildSubDir = () => {
	// return src(paths.css, { since: lastRun(css) })
	return src([paths.css, paths.cfm, paths.html, paths.tmp.html, paths.tmp.css], { since: new Date().getTime() - 1000 })
	.pipe(tap((file, t) => {
		let folderPath = path.dirname(file.path);
		if (path.extname(file.path).substr(1) == 'css') {
			folderPath = path.resolve(path.dirname(file.path), '..');
		}
		return src(folderPath).pipe(tap(build))
	}));
}

const buildTmp = () => {
	return src(paths.tmp)
}

const build = async (file, t) => {
	console.log(`build: ${file.path}`);

	let getStreamContent = (file) => {
		return file.contents.toString('utf8')
	}

	let cfm = new Promise((resolve, reject) => {
		let path = file.path + '/*.cfm';
		src(path)
		.pipe(tap((file, t) => {
			resolve(file);
		}))
	})

	let html = new Promise((resolve, reject) => {
		let path = file.path + '/*.html';
		src(path)
		.pipe(tap((file, t) => {
			resolve(file);
		}))
	})

	let styles = new Promise((resolve, reject) => {
		src(file.path + '/**/*.css')
		.pipe(tap((file, t) => {
			resolve(file);
		}))
	}).then(getStreamContent)

	let code = Promise.race([cfm, html]).then(getStreamContent);

	let results = await Promise.all([code, styles]);

	return src(paths.template)
		.pipe(replace(`<!-- HTML -->`, results[0]))
	    .pipe(replace(`<!-- CSS -->`, `<style scoped>${results[1]}</style>`))
		.pipe(minifyInline({ collapseWhitespace: true })).on('error', function(error) {
			let msg = `Invalid HTML`;
			notifier.notify(msg);
			return done(msg);
		})
		.pipe(through.obj((chunk, enc, cb) => {
			if (!ee.listenerCount(`update`)) {
				return notifier.notify(`No window modules registered. Make sure to add "?dev" to the URL`);
			}
			let html = chunk.contents.toString(enc || 'utf8');
			console.log(`Content size: ${html.length}`);
			ee.emit(`update`, {html});
			return cb();
		}));
}

exports.default = () => {
	server({port, ee, notifier, buildTmp, tmp: path.resolve(__dirname, 'src/tmp')});
	watch([paths.cfm, paths.html, paths.css, paths.tmp.css, paths.tmp.html], buildSubDir);
}