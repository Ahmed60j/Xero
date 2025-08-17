(() => {
	const socket = io();
	let currentRoom = null;
	let myId = null;

	const byId = (id) => document.getElementById(id);
	const messagesEl = byId('messages');
	const presenceEl = byId('presence');
	const textEl = byId('text');
	const roomEl = byId('room');
	const nameEl = byId('name');
	const joinBtn = byId('join');
	const sendBtn = byId('send');

	socket.emit('set_name', localStorage.getItem('name') || '');
	socket.on('me', (id) => {
		myId = id;
	});

	function renderPresence(members) {
		presenceEl._members = members;
		const names = members
			.map((m) => (m?.name || m?.id))
			.filter(Boolean);
		presenceEl.textContent = members.length
			? 'In room: ' + names.join(', ')
			: 'Not in a room';
	}

	function addMessage(msg) {
		const el = document.createElement('div');
		el.className = 'm' + (msg.from === myId ? ' me' : '');
		el.textContent = (msg.name ? msg.name + ': ' : '') + msg.text;
		messagesEl.appendChild(el);
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	joinBtn.onclick = () => {
		const roomId = roomEl.value.trim() || 'general';
		const name = nameEl.value.trim() || 'Anonymous';
		localStorage.setItem('name', name);
		socket.emit('set_name', name);
		if (currentRoom) {
			socket.emit('leave', currentRoom);
		}
		socket.emit('join', roomId);
		currentRoom = roomId;
	};

	sendBtn.onclick = () => {
		const text = textEl.value.trim();
		if (!text || !currentRoom) return;
		socket.emit('message', { roomId: currentRoom, text });
		textEl.value = '';
	};

	textEl.addEventListener('input', () => {
		if (!currentRoom) return;
		socket.emit('typing', { roomId: currentRoom, typing: textEl.value.length > 0 });
	});

	socket.on('presence', renderPresence);
	socket.on('message', addMessage);
	socket.on('typing', ({ from, typing }) => {
		if (from === myId) return;
		presenceEl.textContent = typing ? 'Someone is typing...' : '';
		setTimeout(() => renderPresence(presenceEl._members || []), 800);
	});
})();