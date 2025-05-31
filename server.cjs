const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://wavelength-game.netlify.app", "https://wavelength-game-selena.netlify.app"]
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeRooms: gameRooms.size 
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Wavelength Game Server',
    version: '1.0.0',
    activeRooms: gameRooms.size
  });
});

// Game rooms storage
const gameRooms = new Map();

// Generate random 4-character game code
function generateGameCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create new game room
function createGameRoom() {
  let gameCode;
  do {
    gameCode = generateGameCode();
  } while (gameRooms.has(gameCode));

  const room = {
    code: gameCode,
    host: null,
    players: [],
    gameState: null,
    isGameStarted: false,
    createdAt: new Date(),
  };

  gameRooms.set(gameCode, room);
  return room;
}

// Clean up old rooms (older than 24 hours)
function cleanupOldRooms() {
  const now = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  for (const [code, room] of gameRooms.entries()) {
    if (now - room.createdAt > dayInMs) {
      gameRooms.delete(code);
      console.log(`Cleaned up old room: ${code}`);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldRooms, 60 * 60 * 1000);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create game room
  socket.on('create-game', (data) => {
    const room = createGameRoom();
    room.host = socket.id;
    room.players.push({
      id: socket.id,
      name: data.playerName,
      isHost: true,
      isConnected: true,
    });

    socket.join(room.code);
    socket.emit('game-created', {
      gameCode: room.code,
      room: room,
    });

    console.log(`Game created: ${room.code} by ${data.playerName}`);
  });

  // Join game room
  socket.on('join-game', (data) => {
    const { gameCode, playerName } = data;
    const room = gameRooms.get(gameCode.toUpperCase());

    if (!room) {
      socket.emit('join-error', { message: 'Game not found' });
      return;
    }

    if (room.isGameStarted) {
      socket.emit('join-error', { message: 'Game already in progress' });
      return;
    }

    // Check if player name already exists
    const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (existingPlayer) {
      socket.emit('join-error', { message: 'Player name already taken' });
      return;
    }

    // Add player to room
    room.players.push({
      id: socket.id,
      name: playerName,
      isHost: false,
      isConnected: true,
    });

    socket.join(room.code);
    
    // Notify all players in room
    io.to(room.code).emit('player-joined', {
      player: room.players[room.players.length - 1],
      room: room,
    });

    socket.emit('game-joined', { room: room });
    console.log(`${playerName} joined game: ${room.code}`);
  });

  // Start game
  socket.on('start-game', (data) => {
    const { gameCode, gameConfig } = data;
    const room = gameRooms.get(gameCode);

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    room.isGameStarted = true;
    room.gameState = {
      ...gameConfig,
      currentRound: 0,
      phase: 'psychic',
    };

    io.to(room.code).emit('game-started', {
      gameConfig: gameConfig,
      gameState: room.gameState,
    });

    console.log(`Game started: ${room.code}`);
  });

  // Update game state
  socket.on('update-game-state', (data) => {
    const { gameCode, gameState } = data;
    const room = gameRooms.get(gameCode);

    if (!room) return;

    room.gameState = gameState;
    
    // Broadcast to all other players in room
    socket.to(room.code).emit('game-state-updated', { gameState });
  });

  // Update dial position
  socket.on('update-dial', (data) => {
    const { gameCode, position, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room) return;

    // Broadcast dial position to all other players
    socket.to(room.code).emit('dial-updated', { 
      position, 
      playerId,
    });
  });

  // Player ready/lock in
  socket.on('player-ready', (data) => {
    const { gameCode, playerId, action } = data;
    const room = gameRooms.get(gameCode);

    if (!room) return;

    // Broadcast to all players
    io.to(room.code).emit('player-action', {
      playerId,
      action,
      data: data,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Find and update player status in all rooms
    for (const [code, room] of gameRooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isConnected = false;
        
        // Notify other players
        socket.to(room.code).emit('player-disconnected', {
          playerId: socket.id,
          playerName: player.name,
        });

        // If host disconnected and game hasn't started, transfer host
        if (player.isHost && !room.isGameStarted && room.players.length > 1) {
          const newHost = room.players.find(p => p.id !== socket.id && p.isConnected);
          if (newHost) {
            newHost.isHost = true;
            room.host = newHost.id;
            io.to(room.code).emit('host-transferred', {
              newHostId: newHost.id,
              newHostName: newHost.name,
            });
          }
        }

        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Wavelength server running on port ${PORT}`);
});