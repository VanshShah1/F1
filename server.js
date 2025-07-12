const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);

        socket.on('offer', (offer, socketId) => {
            socket.to(socketId).emit('offer', offer, socket.id);
        });

        socket.on('answer', (answer, socketId) => {
            socket.to(socketId).emit('answer', answer, socket.id);
        });

        socket.on('ice-candidate', (candidate, socketId) => {
            socket.to(socketId).emit('ice-candidate', candidate, socket.id);
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));