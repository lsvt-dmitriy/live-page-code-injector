const socketio = require('socket.io');
const express = require('express');
const bodyParser = require('body-parser');

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

	    ee.on('update', update);

	    socket.on('disconnect', () => {
	      console.log(`Window "${socket.id}" has been disconnected.`);
	      ee.removeListener('update', update);
	    });
	})
}

