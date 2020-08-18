const socketio = require('socket.io');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

module.exports = (o) => {
	const ee = o.ee;
	const notifier = o.notifier;
	const port = o.port || 3005;
	const app = express();
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json({limit: '10mb', extended: true}))
	const server = app.listen(port, (err) => {
	  if (err) throw new Error(err);
	  console.log(`LSVT dev injector server is listening on ${port}.`)
	});
	const io = socketio.listen(server);

	io.on('connection', (socket) =>{
		let msg = `Window "${socket.id}" is connected.`;
		notifier ? notifier.notify(msg) : console.log(msg);

	    function update(data) {
	      console.log(`${data.html.length} bytes emitted.`);
	      socket.emit('update', data);
	      let msg = `Page updated.`;
	      notifier ? notifier.notify(msg) : console.log(msg);
	    }

	    function edit(html) {
	    	let stylesDir = path.resolve(o.tmp, 'styles');
	    	let stylesFile = path.resolve(stylesDir, 'styles.css');
	    	let htmlFile =  path.resolve(o.tmp, 'index.html');
	    	if (!fs.existsSync(stylesDir)){
	    	    fs.mkdirSync(stylesDir);
	    	}
	    	fs.writeFileSync(stylesFile, '', 'utf8');
	    	fs.writeFileSync(htmlFile, html, 'utf8');
	    	exec(`subl ${htmlFile}`, function callback(error, stdout, stderr){
	    	    if (error) console.log(error);
	    	});
	    	exec(`subl ${stylesFile}`, function callback(error, stdout, stderr){
	    	    if (error) console.log(error);
	    	});

	    }

	    ee.on('update', update);

	    socket.on('edit', edit);

	    socket.on('disconnect', () => {
	      console.log(`Window "${socket.id}" has been disconnected.`);
	      ee.removeListener('update', update);
	    });
	})
}

