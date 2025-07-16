const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const menuDiv = document.getElementById('menu');
const gameCanvasDiv = document.getElementById('gameCanvas');
const ipInput = document.getElementById('ipInput');
const joinButton = document.getElementById('joinButton');
const hostButton = document.getElementById('hostButton');

// Append renderer to gameCanvasDiv instead of body
gameCanvasDiv.appendChild(renderer.domElement);

// Initial state: hide game canvas, show menu
gameCanvasDiv.style.display = 'none';

let ws = null; // Declare ws globally

function connectToServer(ipAddress) {
    ws = new WebSocket(`ws://${ipAddress}:8080`);

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        menuDiv.style.display = 'none';
        gameCanvasDiv.style.display = 'block';
        renderer.setSize(window.innerWidth, window.innerHeight);
        animate(); // Start the game loop only after connection
    };

    ws.onmessage = event => {
        const data = JSON.parse(event.data);

        if (data.type === 'init') {
            playerId = data.playerId;
            playerGroup.children[0].material.color.set(data.players[playerId].color);
            for (const id in data.players) {
                if (id !== playerId) {
                    const otherPlayerGroup = new THREE.Group();
                    const otherBody = new THREE.Mesh(bodyGeometry, new THREE.MeshBasicMaterial({ color: data.players[id].color }));
                    otherBody.position.y = 0.25;
                    otherPlayerGroup.add(otherBody);
                    otherPlayerGroup.add(frontLeftWheel.clone());
                    otherPlayerGroup.add(frontRightWheel.clone());
                    otherPlayerGroup.add(backLeftWheel.clone());
                    otherPlayerGroup.add(backRightWheel.clone());
                    otherPlayerGroup.add(spoiler.clone());
                    otherPlayerGroup.add(frontWing.clone());

                    otherPlayerGroup.position.set(data.players[id].x, data.players[id].y, data.players[id].z);
                    otherPlayerGroup.rotation.y = data.players[id].rotationY;
                    scene.add(otherPlayerGroup);
                    players[id] = otherPlayerGroup;
                }
            }
        } else if (data.type === 'update') {
            if (players[data.playerId]) {
                players[data.playerId].position.set(data.player.x, data.player.y, data.player.z);
                players[data.playerId].rotation.y = data.player.rotationY;
            } else {
                const otherPlayerGroup = new THREE.Group();
                const otherBody = new THREE.Mesh(bodyGeometry, new THREE.MeshBasicMaterial({ color: data.player.color }));
                otherBody.position.y = 0.25;
                otherPlayerGroup.add(otherBody);
                otherPlayerGroup.add(frontLeftWheel.clone());
                otherPlayerGroup.add(frontRightWheel.clone());
                otherPlayerGroup.add(backLeftWheel.clone());
                otherPlayerGroup.add(backRightWheel.clone());
                otherPlayerGroup.add(spoiler.clone());
                otherPlayerGroup.add(frontWing.clone());

                otherPlayerGroup.position.set(data.player.x, data.player.y, data.player.z);
                otherPlayerGroup.rotation.y = data.player.rotationY;
                scene.add(otherPlayerGroup);
                players[data.playerId] = otherPlayerGroup;
            }
        } else if (data.type === 'remove') {
            if (players[data.playerId]) {
                scene.remove(players[data.playerId]);
                delete players[data.playerId];
            }
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
    };

    ws.onerror = error => {
        console.error('WebSocket error:', error);
    };
}

joinButton.addEventListener('click', () => {
    const ipAddress = ipInput.value.trim();
    if (ipAddress) {
        connectToServer(ipAddress);
    } else {
        alert('Please enter an IP address.');
    }
});

hostButton.addEventListener('click', () => {
    connectToServer('localhost');
});

// Movement controls
const keyboard = {};
document.addEventListener('keydown', event => {
    keyboard[event.key] = true;
});
document.addEventListener('keyup', event => {
    keyboard[event.key] = false;
});

const playerSpeed = 0.1;

function animate() {
    requestAnimationFrame(animate);

    let moved = false;
    const rotationSpeed = 0.05;
    if (keyboard['a']) {
        playerGroup.rotation.y += rotationSpeed;
        moved = true;
    }
    if (keyboard['d']) {
        playerGroup.rotation.y -= rotationSpeed;
        moved = true;
    }

    const forwardVector = new THREE.Vector3(0, 0, 1);
    forwardVector.applyQuaternion(playerGroup.quaternion);

    if (keyboard['w']) {
        playerGroup.position.add(forwardVector.multiplyScalar(playerSpeed));
        moved = true;
    }
    if (keyboard['s']) {
        playerGroup.position.sub(forwardVector.multiplyScalar(playerSpeed));
        moved = true;
    }

    if (moved && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'move',
            x: playerGroup.position.x,
            y: playerGroup.position.y,
            z: playerGroup.position.z,
            rotationY: playerGroup.rotation.y
        }));
    }

    camera.position.x = playerGroup.position.x - 3 * Math.sin(playerGroup.rotation.y);
    camera.position.y = playerGroup.position.y + 1.5;
    camera.position.z = playerGroup.position.z - 3 * Math.cos(playerGroup.rotation.y);
    camera.lookAt(playerGroup.position);

    renderer.render(scene, camera);
}