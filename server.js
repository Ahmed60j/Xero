const path = require('path');
const http = require('http');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const users = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
	users.set(socket.id, { id: socket.id, name: null });

	socket.on('set_name', (name) => {
		users.set(socket.id, { id: socket.id, name });
		socket.emit('me', socket.id);
	});

	socket.on('join', (roomId) => {
		if (!rooms.has(roomId)) {
			rooms.set(roomId, new Set());
		}
		const memberSet = rooms.get(roomId);
		memberSet.add(socket.id);
		socket.join(roomId);
		io.to(roomId).emit(
			'presence',
			Array.from(memberSet).map((id) => users.get(id))
		);
	});

	socket.on('message', ({ roomId, text }) => {
		const user = users.get(socket.id);
		const payload = {
			id: Date.now() + Math.random(),
			from: socket.id,
			name: user?.name || 'Anonymous',
			text,
			ts: new Date().toISOString(),
		};
		io.to(roomId).emit('message', payload);
	});

	socket.on('typing', ({ roomId, typing }) => {
		socket.to(roomId).emit('typing', { from: socket.id, typing });
	});

	socket.on('leave', (roomId) => {
		socket.leave(roomId);
		if (rooms.has(roomId)) {
			const memberSet = rooms.get(roomId);
			memberSet.delete(socket.id);
			io.to(roomId).emit(
				'presence',
				Array.from(memberSet).map((id) => users.get(id))
			);
		}
	});

	socket.on('disconnect', () => {
		users.delete(socket.id);
		for (const [roomId, memberSet] of rooms.entries()) {
			if (memberSet.delete(socket.id)) {
				io.to(roomId).emit(
					'presence',
					Array.from(memberSet).map((id) => users.get(id))
				);
			}
		}
	});
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`server on http://localhost:${port}`);
});