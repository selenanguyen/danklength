const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Spectrum concepts data
const spectrumConcepts = [
  { id: '1', leftConcept: 'Hot', rightConcept: 'Cold' },
  { id: '2', leftConcept: 'Underrated', rightConcept: 'Overrated' },
  { id: '3', leftConcept: 'Scary', rightConcept: 'Not Scary' },
  { id: '4', leftConcept: 'Round', rightConcept: 'Pointy' },
  { id: '5', leftConcept: 'Smells Bad', rightConcept: 'Smells Good' },
  { id: '6', leftConcept: 'Loud', rightConcept: 'Quiet' },
  { id: '7', leftConcept: 'Expensive', rightConcept: 'Cheap' },
  { id: '8', leftConcept: 'Fast', rightConcept: 'Slow' },
  { id: '9', leftConcept: 'Big', rightConcept: 'Small' },
  { id: '10', leftConcept: 'Soft', rightConcept: 'Hard' },
  { id: '11', leftConcept: 'Masculine', rightConcept: 'Feminine' },
  { id: '12', leftConcept: 'Young', rightConcept: 'Old' },
  { id: '13', leftConcept: 'Wet', rightConcept: 'Dry' },
  { id: '14', leftConcept: 'Heavy', rightConcept: 'Light' },
  { id: '15', leftConcept: 'Boring', rightConcept: 'Exciting' },
  { id: '16', leftConcept: 'Dark', rightConcept: 'Bright' },
  { id: '17', leftConcept: 'Rough', rightConcept: 'Smooth' },
  { id: '18', leftConcept: 'Unhealthy', rightConcept: 'Healthy' },
  { id: '19', leftConcept: 'Fantasy', rightConcept: 'Sci-Fi' },
  { id: '20', leftConcept: 'Risky', rightConcept: 'Safe' },
];

// Function to get a random spectrum concept
function getRandomConcept() {
  const randomIndex = Math.floor(Math.random() * spectrumConcepts.length);
  return spectrumConcepts[randomIndex];
}

// Function to get concept from custom prompts or default concepts
function getConceptForGame(gameConfig, currentPromptIndex = 0) {
  if (gameConfig.mode === 'custom' && gameConfig.customPrompts && gameConfig.customPrompts.length > 0) {
    // Use custom prompts if available
    const promptIndex = currentPromptIndex % gameConfig.customPrompts.length;
    const prompt = gameConfig.customPrompts[promptIndex];
    
    // Convert string prompt to concept object
    if (typeof prompt === 'string') {
      const parts = prompt.split(' vs ');
      return {
        id: `custom-${promptIndex}`,
        leftConcept: parts[0] || 'Left',
        rightConcept: parts[1] || 'Right'
      };
    } else {
      // Already an object (fallback)
      return prompt;
    }
  } else {
    // Use default random concept
    return getRandomConcept();
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins for debugging, including undefined (for same-origin requests)
      callback(null, true);
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["ngrok-skip-browser-warning", "bypass-tunnel-reminder", "content-type"],
    optionsSuccessStatus: 200
  }
});

// More comprehensive CORS setup for Express
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning, bypass-tunnel-reminder');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

// Get all spectrum concepts
app.get('/api/spectrum-concepts', (req, res) => {
  res.json(spectrumConcepts);
});

// Get a random spectrum concept
app.get('/api/random-concept', (req, res) => {
  res.json(getRandomConcept());
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
    originalHostName: null, // Track the original game creator by name
    players: [],
    gameState: null,
    isGameStarted: false,
    createdAt: new Date(),
    customPrompts: [],
    gameMode: 'normal',
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
    room.originalHostName = data.playerName; // Set the original host name
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

    // Send initial game mode to the host
    socket.emit('game-mode-updated', {
      mode: room.gameMode,
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

    // Check if player name already exists and is connected
    const existingPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase() && p.isConnected);
    if (existingPlayer) {
      socket.emit('join-error', { message: 'Player name already taken' });
      return;
    }

    // Check if this name belongs to a disconnected player
    const disconnectedPlayer = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase() && !p.isConnected);
    if (disconnectedPlayer) {
      // Reconnect the disconnected player
      disconnectedPlayer.id = socket.id;
      disconnectedPlayer.isConnected = true;
      
      // Check if this is the original host reconnecting
      if (room.originalHostName && room.originalHostName.toLowerCase() === playerName.toLowerCase()) {
        // Original host is reconnecting - restore their host status
        // First, remove host status from current host
        const currentHost = room.players.find(p => p.isHost);
        if (currentHost && currentHost !== disconnectedPlayer) {
          currentHost.isHost = false;
        }
        
        // Restore host status to original host
        disconnectedPlayer.isHost = true;
        room.host = socket.id;
        
        console.log(`Original host ${playerName} reconnected and regained host status in room ${room.code}`);
      }
      
      socket.join(room.code);
      
      // If game is in progress, restore player to game cycle
      if (room.gameState && room.isGameStarted) {
        const connectedPlayers = room.players.filter(p => p.isConnected);
        
        // Rebuild the game state players list with reconnected player
        room.gameState.players = connectedPlayers.map((p, index) => ({
          id: `player-${index}`,
          name: p.name,
          isConnected: true,
        }));
        
        // Find the reconnecting player's position in the new array
        const reconnectedPlayerIndex = room.gameState.players.findIndex(p => p.name === playerName);
        
        // Adjust psychic index if necessary to maintain game flow
        if (reconnectedPlayerIndex !== -1) {
          // If the reconnecting player was supposed to be the current psychic, 
          // and we're not in the middle of their turn, adjust accordingly
          const currentPsychicName = room.gameState.players[room.gameState.currentPsychicIndex]?.name;
          if (!currentPsychicName || room.gameState.gamePhase === 'psychic') {
            // Reset to a valid psychic index
            room.gameState.currentPsychicIndex = Math.min(room.gameState.currentPsychicIndex, room.gameState.players.length - 1);
          }
        }
        
        // Broadcast updated game state to all players
        io.to(room.code).emit('game-state-updated', { gameState: room.gameState });
        console.log(`Player ${playerName} restored to game cycle in room ${room.code}`);
      }
      
      // Notify other players of reconnection
      socket.to(room.code).emit('player-reconnected', {
        playerId: socket.id,
        playerName: playerName,
        room: room,
      });
      
      // If host status changed, notify about host transfer
      if (disconnectedPlayer.isHost) {
        io.to(room.code).emit('host-transferred', {
          newHostId: socket.id,
          newHostName: playerName,
          room: room,
        });
      }
      
      socket.emit('game-joined', { room: room });
      
      // Send current game state if game is in progress
      if (room.gameState && room.isGameStarted) {
        socket.emit('game-started', {
          gameConfig: room.gameState,
          gameState: room.gameState,
        });
      }
      
      // Send existing custom prompts to the reconnected player
      if (room.customPrompts.length > 0) {
        socket.emit('prompt-added', {
          prompts: room.customPrompts,
          addedBy: 'system',
        });
      }
      
      // Send current game mode to the reconnected player
      if (room.gameMode) {
        socket.emit('game-mode-updated', {
          mode: room.gameMode,
        });
      }
      
      console.log(`${playerName} reconnected to game: ${room.code}`);
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
    
    // Send existing custom prompts to the newly joined player
    if (room.customPrompts.length > 0) {
      socket.emit('prompt-added', {
        prompts: room.customPrompts,
        addedBy: 'system',
      });
    }
    
    // Send current game mode to the newly joined player
    if (room.gameMode) {
      socket.emit('game-mode-updated', {
        mode: room.gameMode,
      });
    }
    
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
    
    // Generate initial game state with a spectrum concept
    const currentCard = getConceptForGame(gameConfig, 0);
    const connectedPlayers = room.players.filter(p => p.isConnected);
    
    room.gameState = {
      ...gameConfig,
      players: connectedPlayers,
      currentPsychicIndex: 0, // First player is psychic
      currentCard: currentCard,
      targetPosition: Math.random() * 100, // Random target position (0-100)
      targetWidth: Math.floor(Math.random() * 20) + 15, // Random width 15-35
      dialPosition: 50, // Initial dial position at center
      gamePhase: 'psychic',
      psychicClue: '',
      currentRound: 1,
      totalRounds: 8, // Default 8 rounds
      totalScore: 0,
      roundScores: [],
      currentPromptIndex: 0 // Track current prompt index for custom games
    };

    io.to(room.code).emit('game-started', {
      gameConfig: gameConfig,
      gameState: room.gameState,
    });

    console.log(`Game started: ${room.code} with concept: ${currentCard.leftConcept} - ${currentCard.rightConcept}`);
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

  // Generate new spectrum concept for next round
  socket.on('next-round', (data) => {
    const { gameCode } = data;
    const room = gameRooms.get(gameCode);

    if (!room || !room.gameState) return;

    // Increment prompt index and get next concept
    const nextPromptIndex = (room.gameState.currentPromptIndex || 0) + 1;
    const newCard = getConceptForGame(room.gameState, nextPromptIndex);
    const newTargetPosition = Math.random() * 100;
    
    // Update room game state
    room.gameState.currentCard = newCard;
    room.gameState.targetPosition = newTargetPosition;
    room.gameState.dialPosition = 50; // Reset dial to center
    room.gameState.psychicClue = ''; // Reset clue
    room.gameState.currentRound += 1;
    room.gameState.currentPromptIndex = nextPromptIndex;

    // Broadcast the new round data to all players
    io.to(room.code).emit('new-round-data', {
      currentCard: newCard,
      targetPosition: newTargetPosition,
      currentRound: room.gameState.currentRound
    });

    console.log(`New round started for game ${room.code}: ${newCard.leftConcept} - ${newCard.rightConcept}`);
  });

  // Handle custom prompt submission
  socket.on('add-prompt', (data) => {
    const { gameCode, prompt, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room || room.isGameStarted) return;

    // Add prompt to room's custom prompts
    if (prompt && prompt.trim() && !room.customPrompts.includes(prompt.trim())) {
      room.customPrompts.push(prompt.trim());
      
      // Broadcast updated prompts to all players in room
      io.to(room.code).emit('prompt-added', {
        prompts: room.customPrompts,
        addedBy: playerId,
      });

      console.log(`Prompt added to game ${room.code}: "${prompt}" by ${playerId}`);
    }
  });

  // Handle game mode updates
  socket.on('update-game-mode', (data) => {
    const { gameCode, mode } = data;
    const room = gameRooms.get(gameCode);

    if (!room || room.isGameStarted || room.host !== socket.id) return;

    // Update room's game mode
    room.gameMode = mode;
    
    // Broadcast updated game mode to all players in room
    io.to(room.code).emit('game-mode-updated', {
      mode: mode,
    });

    console.log(`Game mode updated for game ${room.code}: ${mode}`);
  });

  // Handle intentional game leave
  socket.on('leave-game', (data) => {
    const { gameCode } = data;
    const room = gameRooms.get(gameCode);

    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      // Mark player as disconnected
      player.isConnected = false;
      
      // Notify other players
      socket.to(room.code).emit('player-disconnected', {
        playerId: socket.id,
        playerName: player.name,
      });

      // If host left, transfer host to next connected player
      if (player.isHost && room.players.length > 1) {
        const newHost = room.players.find(p => p.id !== socket.id && p.isConnected);
        if (newHost) {
          // Remove host status from disconnected player
          player.isHost = false;
          // Set new host
          newHost.isHost = true;
          room.host = newHost.id;
          console.log(`Host transferred from ${player.name} to ${newHost.name} in room ${room.code}`);
          io.to(room.code).emit('host-transferred', {
            newHostId: newHost.id,
            newHostName: newHost.name,
            room: room,
          });
        }
      }

      console.log(`${player.name} left game: ${room.code}`);
    }
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

        // If host disconnected, transfer host to next connected player
        if (player.isHost && room.players.length > 1) {
          const newHost = room.players.find(p => p.id !== socket.id && p.isConnected);
          if (newHost) {
            // Remove host status from disconnected player
            player.isHost = false;
            // Set new host
            newHost.isHost = true;
            room.host = newHost.id;
            console.log(`Host transferred from ${player.name} to ${newHost.name} in room ${room.code}`);
            io.to(room.code).emit('host-transferred', {
              newHostId: newHost.id,
              newHostName: newHost.name,
              room: room,
            });
          }
        }

        // If game is in progress, adjust the game cycle to skip disconnected players
        if (room.gameState && room.isGameStarted) {
          const connectedPlayers = room.players.filter(p => p.isConnected);
          const disconnectedPlayerIndex = room.gameState.players.findIndex(p => p.name === player.name);
          
          if (disconnectedPlayerIndex !== -1 && connectedPlayers.length > 0) {
            // Update the game state players list to only include connected players
            room.gameState.players = connectedPlayers.map((p, index) => ({
              id: `player-${index}`,
              name: p.name,
              isConnected: true,
            }));
            
            // Adjust current psychic index if needed
            if (room.gameState.currentPsychicIndex >= disconnectedPlayerIndex) {
              // If current psychic disconnected or we need to adjust the index
              if (room.gameState.currentPsychicIndex >= room.gameState.players.length) {
                room.gameState.currentPsychicIndex = 0; // Reset to first player
              }
            }
            
            // Broadcast updated game state to remaining players
            io.to(room.code).emit('game-state-updated', { gameState: room.gameState });
            console.log(`Game cycle adjusted for disconnected player ${player.name} in room ${room.code}`);
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