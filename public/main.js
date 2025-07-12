import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const socket = io();

const menu = document.getElementById('menu');
const createRoomBtn = document.getElementById('create-room');
const roomCodeInput = document.getElementById('room-code');
const joinRoomBtn = document.getElementById('join-room');
const gameCanvas = document.getElementById('game');

let scene, camera, renderer, world;
let players = {};

createRoomBtn.addEventListener('click', () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.emit('join-room', roomId);
    menu.style.display = 'none';
    initGame();
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomCodeInput.value;
    socket.emit('join-room', roomId);
    menu.style.display = 'none';
    initGame();
});

socket.on('user-connected', (id) => {
    createPlayer(id);

    const peerConnection = createPeerConnection(id);
    players[id].peerConnection = peerConnection;

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', peerConnection.localDescription, id);
        });
});

socket.on('offer', (offer, id) => {
    createPlayer(id);

    const peerConnection = createPeerConnection(id);
    players[id].peerConnection = peerConnection;

    peerConnection.setRemoteDescription(offer)
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            socket.emit('answer', peerConnection.localDescription, id);
        });
});

socket.on('answer', (answer, id) => {
    players[id].peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', (candidate, id) => {
    players[id].peerConnection.addIceCandidate(candidate);
});

socket.on('user-disconnected', (id) => {
    if (players[id]) {
        world.removeBody(players[id].body);
        scene.remove(players[id].mesh);
        delete players[id];
    }
});

function createPeerConnection(socketId) {
    const peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, socketId);
        }
    };

    peerConnection.ontrack = (event) => {
        // We don't need to do anything with the track for now
    };

    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            players[socketId].body.position.copy(data.position);
            players[socketId].body.quaternion.copy(data.quaternion);
        };
    };

    const dataChannel = peerConnection.createDataChannel('game-data');
    dataChannel.onopen = () => {
        console.log('data channel open');
    };
    players[socketId].dataChannel = dataChannel;

    return peerConnection;
}

function initGame() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    const groundBody = new CANNON.Body({ mass: 0 });
    const groundShape = new CANNON.Plane();
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    camera.position.z = 5;

    createPlayer(socket.id);

    animate();
}

function createPlayer(id) {
    const vehicleBody = new CANNON.Body({ mass: 1 });
    const vehicleShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    vehicleBody.addShape(vehicleShape);
    vehicleBody.position.y = 1;
    world.addBody(vehicleBody);

    const vehicleGeometry = new THREE.BoxGeometry(2, 1, 4);
    const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const vehicleMesh = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
    scene.add(vehicleMesh);

    players[id] = {
        body: vehicleBody,
        mesh: vehicleMesh
    };
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1 / 60);

    for (const id in players) {
        players[id].mesh.position.copy(players[id].body.position);
        players[id].mesh.quaternion.copy(players[id].body.quaternion);
    }

    renderer.render(scene, camera);
}

document.addEventListener('keydown', (event) => {
    if (!players[socket.id]) return;

    const vehicleBody = players[socket.id].body;

    switch (event.key) {
        case 'ArrowUp':
            vehicleBody.velocity.z = -10;
            break;
        case 'ArrowDown':
            vehicleBody.velocity.z = 10;
            break;
        case 'ArrowLeft':
            vehicleBody.angularVelocity.y = 1;
            break;
        case 'ArrowRight':
            vehicleBody.angularVelocity.y = -1;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (!players[socket.id]) return;

    const vehicleBody = players[socket.id].body;

    switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
            vehicleBody.velocity.z = 0;
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            vehicleBody.angularVelocity.y = 0;
            break;
    }
});

setInterval(() => {
    if (players[socket.id]) {
        const position = players[socket.id].body.position;
        const quaternion = players[socket.id].body.quaternion;

        for (const id in players) {
            if (id !== socket.id && players[id].dataChannel) {
                players[id].dataChannel.send(JSON.stringify({ position, quaternion }));
            }
        }
    }
}, 1000 / 30);


