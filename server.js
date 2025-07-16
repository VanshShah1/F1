const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = {};

wss.on('connection', ws => {
    const playerId = Math.random().toString(36).substring(2, 9);
    const randomColor = Math.floor(Math.random()*16777215); // Generate a random hexadecimal color
    players[playerId] = {
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        color: randomColor
    };
    console.log(`Player ${playerId} connected`);

    ws.send(JSON.stringify({ type: 'init', playerId: playerId, players: players }));

    ws.on('message', message => {
        const data = JSON.parse(message);
        if (data.type === 'move') {
            players[playerId].x = data.x;
            players[playerId].y = data.y;
            players[playerId].z = data.z;
            players[playerId].rotationY = data.rotationY;

            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', playerId: playerId, player: players[playerId] }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`Player ${playerId} disconnected`);
        delete players[playerId];
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'remove', playerId: playerId }));
            }
        });
    });
});

console.log('WebSocket server started on port 8080');