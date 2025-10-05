const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

console.log('Starting Swaz WebRTC Signaling Server...');

const app = express();

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false
});

const rooms = new Map();

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log('📨 Server received raw message:', message.toString());
        console.log('📨 Message type:', typeof message);
        console.log('📨 Message length:', message.length);
        
        let data;
        try {
            data = JSON.parse(message);
            console.log('📨 Parsed message:', data);
        } catch (e) {
            console.error('❌ Invalid JSON received:', message.toString());
            console.error('❌ Parse error:', e.message);
            return;
        }

        const { type, payload } = data;
        const { roomId } = payload || {};
        console.log('📨 Message type:', type);
        console.log('📨 Room ID:', roomId);

        switch (type) {
            case 'join-room':
                handleJoinRoom(ws, roomId);
                break;
            // These messages are simply relayed to the other peer in the room
            case 'offer':
            case 'answer':
            case 'ice-candidate':
            case 'public-key':
                relayMessage(ws, roomId, data);
                break;
            default:
                console.warn('Unknown message type:', type);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        handleDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        handleDisconnect(ws);
    });
});

function handleJoinRoom(ws, providedRoomId) {
    const roomId = providedRoomId || uuidv4();
    let room = rooms.get(roomId);

    if (!room) {
        room = new Set();
        rooms.set(roomId, room);
    }

    if (room.size >= 2) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Room is full' } }));
        return;
    }

    room.add(ws);
    ws.roomId = roomId;

    console.log(`Client joined room ${roomId}. Room size: ${room.size}`);
    ws.send(JSON.stringify({ type: 'room-joined', payload: { roomId } }));

    if (room.size === 2) {
        for (const client of room) {
            if (client !== ws) {
                 // The peer that joined second starts the key exchange
                 client.send(JSON.stringify({ type: 'peer-joined', payload: { initiator: true } }));
                 ws.send(JSON.stringify({ type: 'peer-joined', payload: { initiator: false } }));
            }
        }
        console.log(`Room ${roomId} is now full. Peer exchange can begin.`);
    }
}

function relayMessage(senderWs, roomId, message) {
    const room = rooms.get(roomId);
    if (room) {
        for (const client of room) {
            if (client !== senderWs && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        }
    }
}

function handleDisconnect(ws) {
    const { roomId } = ws;
    if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
            room.delete(ws);
            console.log(`Client left room ${roomId}. Room size: ${room.size}`);
            
            for (const client of room) {
                client.send(JSON.stringify({ type: 'peer-left' }));
            }

            if (room.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} is now empty and has been deleted.`);
            }
        }
    }
}


const PORT = process.env.PORT || process.env.SIGNALING_SERVER_PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Swaz WebRTC Signaling Server is listening on ${HOST}:${PORT}`);
    console.log('Ready for WebSocket connections...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
