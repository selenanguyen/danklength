const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Game constants
const PROMPT_VOTING_TIME_SECONDS = 2000; // temporary TODO change back

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
    // Always use custom prompts and cycle through them
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

// Function to get all custom prompts as concept objects
function getCustomPromptsAsConcepts(customPrompts) {
  return customPrompts.map((prompt, index) => {
    if (typeof prompt === 'string') {
      const parts = prompt.split(' vs ');
      return {
        id: `custom-${index}`,
        leftConcept: parts[0] || 'Left',
        rightConcept: parts[1] || 'Right'
      };
    } else {
      return prompt;
    }
  });
}

// Function to select a prompt based on votes
function selectPromptFromVotes(customPrompts, votes) {
  const promptConcepts = getCustomPromptsAsConcepts(customPrompts);
  
  if (!votes || votes.length === 0) {
    // No votes - pick random prompt
    const randomIndex = Math.floor(Math.random() * promptConcepts.length);
    return promptConcepts[randomIndex];
  }
  
  // Count votes for each prompt
  const voteCounts = {};
  votes.forEach(vote => {
    if (vote.promptId) {
      voteCounts[vote.promptId] = (voteCounts[vote.promptId] || 0) + 1;
    }
  });
  
  if (Object.keys(voteCounts).length === 0) {
    // No valid votes - pick random prompt
    const randomIndex = Math.floor(Math.random() * promptConcepts.length);
    return promptConcepts[randomIndex];
  }
  
  // Find prompt(s) with most votes
  const maxVotes = Math.max(...Object.values(voteCounts));
  const topPrompts = Object.keys(voteCounts).filter(promptId => voteCounts[promptId] === maxVotes);
  
  // If tie, pick randomly among tied prompts
  const selectedPromptId = topPrompts[Math.floor(Math.random() * topPrompts.length)];
  
  // Find the corresponding prompt concept
  return promptConcepts.find(p => p.id === selectedPromptId) || promptConcepts[0];
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
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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

// Pack API endpoints
app.get('/api/packs/:username', (req, res) => {
  const { username } = req.params;
  const userData = userPacks.get(username);
  res.json(userData?.packs || []);
});

app.post('/api/packs/:username', (req, res) => {
  const { username } = req.params;
  const { packs } = req.body;
  
  userPacks.set(username, {
    packs: packs || [],
    lastUpdated: new Date().toISOString()
  });
  
  // Save to file after update
  savePacksToFile();
  
  res.json({ success: true });
});

app.put('/api/packs/:username', (req, res) => {
  const { username } = req.params;
  const { packs } = req.body;
  
  userPacks.set(username, {
    packs: packs || [],
    lastUpdated: new Date().toISOString()
  });
  
  // Save to file after update
  savePacksToFile();
  
  res.json({ success: true });
});

// Game rooms storage
const gameRooms = new Map();

// User packs storage with file persistence
const PACKS_FILE = path.join(__dirname, 'user-packs.json');
const userPacks = new Map(); // username -> { packs: PromptPack[], lastUpdated: string }

// Load packs from file on startup
function loadPacksFromFile() {
  try {
    if (fs.existsSync(PACKS_FILE)) {
      const data = fs.readFileSync(PACKS_FILE, 'utf8');
      const packsData = JSON.parse(data);
      
      // Convert array back to Map
      Object.entries(packsData).forEach(([username, userData]) => {
        userPacks.set(username, userData);
      });
      
      console.log(`Loaded packs for ${userPacks.size} users from file`);
    }
  } catch (error) {
    console.error('Error loading packs from file:', error);
  }
}

// Save packs to file
function savePacksToFile() {
  try {
    // Convert Map to plain object for JSON storage
    const packsData = Object.fromEntries(userPacks);
    fs.writeFileSync(PACKS_FILE, JSON.stringify(packsData, null, 2));
  } catch (error) {
    console.error('Error saving packs to file:', error);
  }
}

// Load packs on server startup
loadPacksFromFile();

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

// Voting timers storage
const votingTimers = new Map();

// Skip vote tracking - tracks which players want to skip disconnected players
const skipVotes = new Map(); // Map<gameCode, Map<disconnectedPlayerName, Set<voterSocketId>>>

// Connection notifications queue for UI display
const connectionNotifications = new Map(); // Map<gameCode, Array<{type, playerName, timestamp}>>

// Helper function to add connection notification
function addConnectionNotification(gameCode, type, playerName) {
  if (!connectionNotifications.has(gameCode)) {
    connectionNotifications.set(gameCode, []);
  }
  
  const notifications = connectionNotifications.get(gameCode);
  notifications.push({
    type, // 'connected', 'disconnected', 'reconnected'
    playerName,
    timestamp: Date.now()
  });
  
  // Keep only last 10 notifications
  if (notifications.length > 10) {
    notifications.splice(0, notifications.length - 10);
  }
  
  // Broadcast to all players in room - send only the new notification
  io.to(gameCode).emit('connection-notification', {
    type,
    playerName,
    timestamp: Date.now()
  });
}

// Helper function to check if player can be skipped
function canSkipPlayer(room, playerName) {
  const connectedPlayers = room.players.filter(p => p.isConnected);
  return connectedPlayers.length >= 2; // Need at least 2 connected players to skip
}

// Helper function to check if all eligible players voted to skip
function checkSkipVotes(gameCode, disconnectedPlayerName) {
  const room = gameRooms.get(gameCode);
  if (!room) return false;
  
  const connectedPlayers = room.players.filter(p => p.isConnected);
  if (connectedPlayers.length < 2) return false; // Need at least 2 players
  
  // Calculate eligible voters: connected players who are not the one being skipped
  const eligibleVoters = connectedPlayers.filter(p => p.name !== disconnectedPlayerName);
  
  const skipMap = skipVotes.get(gameCode);
  if (!skipMap || !skipMap.has(disconnectedPlayerName)) return false;
  
  const votersForSkip = skipMap.get(disconnectedPlayerName);
  return votersForSkip.size >= eligibleVoters.length;
}

// Helper function to clear skip votes for a player (when they reconnect)
function clearSkipVotes(gameCode, playerName) {
  const skipMap = skipVotes.get(gameCode);
  if (skipMap) {
    skipMap.delete(playerName);
    if (skipMap.size === 0) {
      skipVotes.delete(gameCode);
    }
    // Broadcast updated skip vote status
    broadcastSkipVoteStatus(gameCode);
  }
}

// Helper function to clear all skip votes for a game (when round changes)
function clearAllSkipVotes(gameCode) {
  skipVotes.delete(gameCode);
  // Broadcast that skip votes are cleared
  broadcastSkipVoteStatus(gameCode);
}

// Helper function to broadcast current skip vote status
function broadcastSkipVoteStatus(gameCode) {
  const room = gameRooms.get(gameCode);
  if (!room) return;
  
  const skipMap = skipVotes.get(gameCode);
  if (!skipMap || skipMap.size === 0) {
    // No active skip votes
    io.to(gameCode).emit('skip-vote-update', { clear: true });
    return;
  }
  
  // Broadcast status for each player being voted on
  for (const [playerName, voterIds] of skipMap.entries()) {
    const connectedPlayers = room.players.filter(p => p.isConnected);
    // Calculate eligible voters: connected players who are not the one being skipped
    const eligibleVoters = connectedPlayers.filter(p => p.name !== playerName);
    
    io.to(gameCode).emit('skip-vote-update', {
      playerNameToSkip: playerName,
      votesReceived: voterIds.size,
      votesNeeded: eligibleVoters.length,
      voterNames: Array.from(voterIds).map(id => room.players.find(p => p.id === id)?.name).filter(Boolean)
    });
  }
}

// Helper function to check if all eligible players have locked in their guesses
function checkAllPlayersLockedIn(gameState) {
  if (!gameState || gameState.gamePhase !== 'guessing') return false;
  
  const { players, currentPsychicIndex, guessVotes = [], skippedPlayers = [] } = gameState;
  
  // Get non-psychic players
  const nonPsychicPlayers = players.filter((_, index) => index !== currentPsychicIndex);
  
  // Further filter out skipped players
  const eligiblePlayers = nonPsychicPlayers.filter(player => !skippedPlayers.includes(player.name));
  
  // Check if all eligible (non-psychic, non-skipped) players have locked in votes
  const lockedInVotes = guessVotes.filter(vote => vote.isLockedIn);
  
  console.log('SERVER: Lock-in check debug:');
  console.log('- All players:', players.map(p => p.name));
  console.log('- Psychic index:', currentPsychicIndex);
  console.log('- Non-psychic players:', nonPsychicPlayers.map(p => p.name));
  console.log('- Skipped players:', skippedPlayers);
  console.log('- Eligible players:', eligiblePlayers.map(p => p.name));
  console.log('- Locked-in votes:', lockedInVotes.length);
  console.log('- Need votes from:', eligiblePlayers.length);
  console.log('- All locked in?', lockedInVotes.length >= eligiblePlayers.length && eligiblePlayers.length > 0);
  
  return lockedInVotes.length >= eligiblePlayers.length && eligiblePlayers.length > 0;
}

// Helper function to transition game to scoring phase
function transitionToScoring(room) {
  if (!room.gameState || room.gameState.gamePhase !== 'guessing') return false;
  
  console.log(`SERVER: Transitioning room ${room.code} to scoring phase`);
  
  // Calculate score using the current dial position
  const dialPosition = room.gameState.dialPosition || 50;
  const targetPosition = room.gameState.targetPosition || 50;
  const targetWidth = room.gameState.targetWidth || 25;
  
  // Simple scoring logic (matches client-side calculation)
  const distance = Math.abs(dialPosition - targetPosition);
  const centerZone = 2.5;
  const innerZone = 7.5; 
  const outerZone = 12.5;
  
  let points = 0;
  let zone = 'miss';
  if (distance <= centerZone) {
    points = 4;
    zone = 'center';
  } else if (distance <= innerZone) {
    points = 3;
    zone = 'inner';
  } else if (distance <= outerZone) {
    points = 2;
    zone = 'outer';
  }
  
  // Update game state
  room.gameState.totalScore = (room.gameState.totalScore || 0) + points;
  room.gameState.roundScores = [...(room.gameState.roundScores || []), points];
  
  // Store round history with psychic information
  const currentPsychic = room.gameState.players[room.gameState.currentPsychicIndex];
  const roundHistory = {
    clue: room.gameState.psychicClue || '',
    psychicName: currentPsychic?.name || 'Unknown',
    psychicIndex: room.gameState.currentPsychicIndex
  };
  room.gameState.roundClues = [...(room.gameState.roundClues || []), roundHistory];
  room.gameState.gamePhase = 'scoring';
  
  console.log(`SERVER: Scored ${points} points in zone "${zone}" for room ${room.code}`);
  return true;
}

// Helper function to advance to next available psychic
function advanceToNextPsychic(room) {
  if (!room.gameState || !room.gameState.players) return;
  
  const connectedPlayers = room.players.filter(p => p.isConnected);
  const skippedPlayers = room.gameState.skippedPlayers || [];
  
  console.log(`SERVER: advanceToNextPsychic - Starting from current psychic index: ${room.gameState.currentPsychicIndex}`);
  console.log(`SERVER: advanceToNextPsychic - Connected players:`, connectedPlayers.map(p => p.name));
  console.log(`SERVER: advanceToNextPsychic - Skipped players:`, skippedPlayers);
  console.log(`SERVER: advanceToNextPsychic - All game players:`, room.gameState.players.map(p => p.name));
  
  // Find next eligible psychic (connected and not skipped)
  let nextPsychicIndex = (room.gameState.currentPsychicIndex + 1) % room.gameState.players.length;
  let attempts = 0;
  
  console.log(`SERVER: advanceToNextPsychic - Starting search at index: ${nextPsychicIndex}`);
  
  while (attempts < room.gameState.players.length) {
    const candidate = room.gameState.players[nextPsychicIndex];
    const isConnected = connectedPlayers.some(p => p.name === candidate.name);
    const isSkipped = skippedPlayers.includes(candidate.name);
    
    console.log(`SERVER: advanceToNextPsychic - Checking candidate: ${candidate.name} (index ${nextPsychicIndex})`);
    console.log(`  - Is connected: ${isConnected}`);
    console.log(`  - Is skipped: ${isSkipped}`);
    console.log(`  - Is eligible: ${isConnected && !isSkipped}`);
    
    if (isConnected && !isSkipped) {
      // Found eligible psychic
      console.log(`SERVER: advanceToNextPsychic - Found eligible psychic: ${candidate.name} at index ${nextPsychicIndex}`);
      room.gameState.currentPsychicIndex = nextPsychicIndex;
      room.gameState.gamePhase = 'psychic';
      room.gameState.psychicClue = '';
      return true;
    }
    
    // IMPORTANT: Increment attempts BEFORE moving to next index
    attempts++;
    nextPsychicIndex = (nextPsychicIndex + 1) % room.gameState.players.length;
    console.log(`SERVER: advanceToNextPsychic - Moving to next index: ${nextPsychicIndex} (attempt ${attempts})`);
  }
  
  // No eligible psychic found - this shouldn't happen with proper validation
  console.error(`No eligible psychic found in room ${room.code}`);
  return false;
}

// Function to start voting timer
function startVotingTimer(gameCode) {
  const room = gameRooms.get(gameCode);
  if (!room || !room.gameState) return;
  
  let timeLeft = PROMPT_VOTING_TIME_SECONDS;
  room.gameState.votingTimeLeft = timeLeft;
  
  const timer = setInterval(() => {
    timeLeft--;
    room.gameState.votingTimeLeft = timeLeft;
    
    // Broadcast time update
    io.to(gameCode).emit('voting-time-update', { timeLeft });
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      votingTimers.delete(gameCode);
      finishVoting(gameCode);
    }
  }, 1000);
  
  votingTimers.set(gameCode, timer);
}

// Function to finish voting and select prompt
function finishVoting(gameCode) {
  const room = gameRooms.get(gameCode);
  if (!room || !room.gameState) return;
  
  // Select prompt based on votes
  const selectedPrompt = selectPromptFromVotes(room.customPrompts, room.gameState.promptVotes);
  
  // Update game state with selected prompt and move to psychic phase
  room.gameState.currentCard = selectedPrompt;
  room.gameState.selectedPromptForRound = selectedPrompt;
  room.gameState.targetPosition = Math.random() * 100; // Generate new target position
  room.gameState.targetWidth = 25; // Total target area is 25% of spectrum (containing all scoring zones)
  room.gameState.gamePhase = 'psychic';
  room.gameState.promptVotes = []; // Clear votes
  
  // Ensure custom prompts are preserved in the game state
  room.gameState.customPrompts = getCustomPromptsAsConcepts(room.customPrompts);
  
  // Broadcast the selected prompt and new phase
  io.to(gameCode).emit('voting-finished', {
    selectedPrompt: selectedPrompt,
    gameState: room.gameState
  });
  
  console.log(`Voting finished for ${gameCode}, selected: ${selectedPrompt.leftConcept} vs ${selectedPrompt.rightConcept}`);
}

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

    // Allow joining ongoing games (removed restriction)

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
        // Update player connection status in game state
        const gamePlayer = room.gameState.players.find(p => p.name === playerName);
        if (gamePlayer) {
          gamePlayer.isConnected = true;
        }
        
        // Check if player was skipped BEFORE clearing them
        const wasSkipped = room.gameState.skippedPlayers && room.gameState.skippedPlayers.includes(playerName);
        console.log(`SERVER: Player ${playerName} reconnecting. Was skipped: ${wasSkipped}`);
        console.log(`SERVER: skippedPlayers BEFORE clearing:`, room.gameState.skippedPlayers);
        
        // Remove player from skipped list if they were skipped
        if (room.gameState.skippedPlayers) {
          const originalLength = room.gameState.skippedPlayers.length;
          room.gameState.skippedPlayers = room.gameState.skippedPlayers.filter(name => name !== playerName);
          console.log(`SERVER: skippedPlayers AFTER clearing:`, room.gameState.skippedPlayers);
          console.log(`SERVER: Removed ${originalLength - room.gameState.skippedPlayers.length} entries`);
        }
        
        // Clear any skip votes for this player
        clearSkipVotes(room.code, playerName);
        
        // Broadcast updated skip vote status to all players
        broadcastSkipVoteStatus(room.code);
        
        console.log(`Player ${playerName} restored to game cycle in room ${room.code}. Was skipped: ${wasSkipped}. Updated skippedPlayers:`, room.gameState.skippedPlayers);
        
        // Explicitly broadcast updated game state to ensure all clients sync the cleared skip status
        if (wasSkipped) {
          console.log(`SERVER: Broadcasting updated game state after clearing skip status for ${playerName}`);
          console.log(`SERVER: Broadcasting skippedPlayers:`, room.gameState.skippedPlayers);
          io.to(room.code).emit('game-state-updated', { gameState: room.gameState });
        }
        
        // Store the wasSkipped flag and the cleared game state for later use
        disconnectedPlayer.wasSkipped = wasSkipped;
        disconnectedPlayer.clearedGameState = wasSkipped ? JSON.parse(JSON.stringify(room.gameState)) : null;
      }
      
      // Add connection notification (this will broadcast to all players)
      addConnectionNotification(room.code, 'reconnected', playerName);
      
      // Send a single consolidated update to other players about the reconnection
      socket.to(room.code).emit('player-reconnected', {
        player: disconnectedPlayer,
        room: room,
        gameState: room.gameState,
        disconnectedPlayers: room.players.filter(p => !p.isConnected).map(p => p.name)
      });
      
      // Check if this player was originally the host (before transfer)
      const wasOriginalHost = disconnectedPlayer.isHost;
      
      // If host status changed, notify about host transfer
      if (wasOriginalHost) {
        io.to(room.code).emit('host-transferred', {
          newHostId: socket.id,
          newHostName: playerName,
          room: room,
        });
        
        console.log(`SERVER: Original host ${playerName} reconnected, checking if they were skipped`);
        console.log(`SERVER: Current skippedPlayers:`, room.gameState?.skippedPlayers);
      }
      
      socket.emit('game-joined', { room: room });
      
      // Send current game state if game is in progress
      if (room.gameState && room.isGameStarted) {
        console.log(`SERVER: Sending game-started to reconnecting player ${playerName}`);
        socket.emit('game-started', {
          gameConfig: room.gameState,
          gameState: room.gameState,
        });
        
        // ADDITIONALLY, if this player was skipped, send a definitive sync to override their local state
        if (disconnectedPlayer.wasSkipped && disconnectedPlayer.clearedGameState) {
          console.log(`SERVER: Player ${playerName} was skipped, sending additional definitive sync`);
          console.log(`SERVER: Using stored cleared state with skippedPlayers:`, disconnectedPlayer.clearedGameState.skippedPlayers);
          console.log(`SERVER: Current room state skippedPlayers (might be corrupted):`, room.gameState.skippedPlayers);
          // Send after a small delay to ensure game-started is processed first
          setTimeout(() => {
            socket.emit('host-reconnect-sync', {
              gameState: disconnectedPlayer.clearedGameState,
              isDefinitive: true
            });
          }, 100);
        }
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
    const newPlayer = {
      id: socket.id,
      name: playerName,
      isHost: false,
      isConnected: true,
    };
    room.players.push(newPlayer);

    socket.join(room.code);
    
    // If game is in progress, add player to game cycle
    if (room.gameState && room.isGameStarted) {
      // Add player to game state
      room.gameState.players.push({
        id: `player-${room.gameState.players.length}`,
        name: playerName,
        isConnected: true,
      });
      
      // Broadcast updated game state
      io.to(room.code).emit('game-state-updated', { 
        gameState: room.gameState,
        disconnectedPlayers: room.players.filter(p => !p.isConnected).map(p => p.name)
      });
      
      // Send current game state to new player
      socket.emit('game-started', {
        gameConfig: room.gameState,
        gameState: room.gameState,
      });
      
      console.log(`Player ${playerName} joined ongoing game in room ${room.code}`);
    }
    
    // Add connection notification for new player
    addConnectionNotification(room.code, 'connected', playerName);

    // Notify all players in room about the new player
    io.to(room.code).emit('player-joined', {
      player: newPlayer,
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
    
    const connectedPlayers = room.players.filter(p => p.isConnected);
    let initialPhase = 'psychic';
    let currentCard = null;
    
    // For custom mode, start with voting phase
    if (gameConfig.mode === 'custom' && room.customPrompts && room.customPrompts.length > 0) {
      initialPhase = 'prompt-voting';
    } else {
      // For normal mode, generate initial card
      currentCard = getConceptForGame(gameConfig, 0);
    }
    
    room.gameState = {
      ...gameConfig,
      players: connectedPlayers,
      currentPsychicIndex: 0, // First player is psychic
      currentCard: currentCard,
      targetPosition: Math.random() * 100, // Random target position (0-100)
      targetWidth: 25, // Total target area is 25% of spectrum (containing all scoring zones)
      dialPosition: 50, // Initial dial position at center
      gamePhase: initialPhase,
      psychicClue: '',
      currentRound: 1,
      totalRounds: 8, // Default 8 rounds
      totalScore: 0,
      roundScores: [],
      currentPromptIndex: 0, // Track current prompt index for custom games
      promptVotes: [],
      votingTimeLeft: PROMPT_VOTING_TIME_SECONDS,
      customPrompts: room.customPrompts ? getCustomPromptsAsConcepts(room.customPrompts) : undefined
    };

    io.to(room.code).emit('game-started', {
      gameConfig: gameConfig,
      gameState: room.gameState,
    });

    // If we're starting with voting, start the voting timer
    if (initialPhase === 'prompt-voting') {
      startVotingTimer(room.code);
    }

    console.log(`Game started: ${room.code} in ${initialPhase} phase`);
  });

  // Update game state
  socket.on('update-game-state', (data) => {
    const { gameCode, gameState } = data;
    const room = gameRooms.get(gameCode);

    if (!room) return;

    // Get player name for debugging
    const player = room.players.find(p => p.id === socket.id);
    const playerName = player?.name || 'Unknown';
    
    console.log(`🔥 SERVER: Received game state update from ${playerName}`);
    console.log(`🔥 SERVER: Current skippedPlayers:`, room.gameState?.skippedPlayers);
    console.log(`🔥 SERVER: Incoming skippedPlayers:`, gameState?.skippedPlayers);
    console.log(`🔥 SERVER: Current psychic: ${room.gameState?.players[room.gameState?.currentPsychicIndex]?.name} (index ${room.gameState?.currentPsychicIndex})`);
    console.log(`🔥 SERVER: Incoming psychic: ${gameState?.players[gameState?.currentPsychicIndex]?.name} (index ${gameState?.currentPsychicIndex})`);

    // During prompt-voting phase, preserve existing promptVotes if incoming state doesn't have them
    if (room.gameState && room.gameState.gamePhase === 'prompt-voting' && 
        gameState.promptVotes === undefined && room.gameState.promptVotes) {
      console.log('SERVER: Preserving promptVotes during voting phase');
      console.log('SERVER: Existing votes:', JSON.stringify(room.gameState.promptVotes, null, 2));
      gameState.promptVotes = room.gameState.promptVotes;
    }

    room.gameState = gameState;
    
    console.log(`🔥 SERVER: Updated room skippedPlayers:`, room.gameState?.skippedPlayers);
    
    // Broadcast to all other players in room with disconnected players info
    socket.to(room.code).emit('game-state-updated', { 
      gameState,
      disconnectedPlayers: room.players.filter(p => !p.isConnected).map(p => p.name)
    });
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

    // Clear all skip votes when starting a new round
    clearAllSkipVotes(gameCode);

    // Check if game should end (using the incremented round number)
    const nextRound = room.gameState.currentRound + 1;
    const totalRounds = room.gameState.totalRounds || 8;
    
    if (nextRound > totalRounds) { // TODO (Selena, not claude): change this back to totalRounds
      // Game should end
      room.gameState.gamePhase = 'ended';
      io.to(room.code).emit('game-state-updated', { gameState: room.gameState });
      console.log(`Game ${room.code} ended after ${room.gameState.currentRound} rounds`);
      return;
    }

    // Increment round and rotate psychic
    room.gameState.currentRound = nextRound;
    room.gameState.dialPosition = 50; // Reset dial to center
    room.gameState.psychicClue = ''; // Reset clue
    room.gameState.promptVotes = []; // Reset votes
    
    // Rotate to next eligible psychic (connected and not skipped)
    console.log(`SERVER: Current psychic before rotation: ${room.gameState.players[room.gameState.currentPsychicIndex]?.name} (index ${room.gameState.currentPsychicIndex})`);
    advanceToNextPsychic(room);
    console.log(`SERVER: New psychic after rotation: ${room.gameState.players[room.gameState.currentPsychicIndex]?.name} (index ${room.gameState.currentPsychicIndex})`);
    
    // For custom mode, start voting phase
    if (room.gameState.mode === 'custom' && room.customPrompts && room.customPrompts.length > 0) {
      room.gameState.gamePhase = 'prompt-voting';
      room.gameState.votingTimeLeft = PROMPT_VOTING_TIME_SECONDS;
      
      // Ensure custom prompts are preserved in the game state
      room.gameState.customPrompts = getCustomPromptsAsConcepts(room.customPrompts);
      
      // Broadcast the new round with voting phase
      io.to(room.code).emit('new-round-voting', {
        currentRound: room.gameState.currentRound,
        gameState: room.gameState
      });
      
      // Start voting timer
      startVotingTimer(room.code);
      
      console.log(`New round ${room.gameState.currentRound} voting started for game ${room.code}`);
    } else {
      // For normal mode, generate next concept
      const nextPromptIndex = (room.gameState.currentPromptIndex || 0) + 1;
      const newCard = getConceptForGame(room.gameState, nextPromptIndex);
      const newTargetPosition = Math.random() * 100;
      
      
      // Update room game state
      room.gameState.currentCard = newCard;
      room.gameState.targetPosition = newTargetPosition;
      room.gameState.targetWidth = 25; // Total target area is 25% of spectrum (containing all scoring zones)
      room.gameState.currentPromptIndex = nextPromptIndex;
      room.gameState.gamePhase = 'psychic';

      // Broadcast the new round data to all players
      io.to(room.code).emit('new-round-data', {
        currentCard: newCard,
        targetPosition: newTargetPosition,
        currentRound: room.gameState.currentRound,
        currentPsychicIndex: room.gameState.currentPsychicIndex
      });

      console.log(`New round started for game ${room.code}: ${newCard.leftConcept} - ${newCard.rightConcept}`);
    }
  });

  // Handle prompt voting
  socket.on('vote-prompt', (data) => {
    const { gameCode, promptId, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room || !room.gameState || room.gameState.gamePhase !== 'prompt-voting') return;

    // Initialize promptVotes array if it doesn't exist
    if (!room.gameState.promptVotes) {
      room.gameState.promptVotes = [];
    }

    // Find existing vote from this player
    const existingVoteIndex = room.gameState.promptVotes.findIndex(vote => vote.playerId === playerId);
    
    if (existingVoteIndex >= 0) {
      // Update existing vote
      if (promptId && promptId.trim() !== '') {
        room.gameState.promptVotes[existingVoteIndex] = {
          playerId: playerId,
          promptId: promptId,
          isLockedIn: false // Reset lock-in when changing vote
        };
      } else {
        // Remove vote if no promptId provided
        room.gameState.promptVotes.splice(existingVoteIndex, 1);
      }
    } else {
      // Add new vote if promptId is provided
      if (promptId && promptId.trim() !== '') {
        room.gameState.promptVotes.push({
          playerId: playerId,
          promptId: promptId,
          isLockedIn: false
        });
      }
    }

    // Debug: Log final vote state
    console.log(`=== FINAL VOTE STATE AFTER ${playerId} VOTED ===`);
    console.log('All votes:', JSON.stringify(room.gameState.promptVotes, null, 2));
    console.log('Vote counts by prompt:');
    const voteCounts = {};
    room.gameState.promptVotes.forEach(vote => {
      if (vote.promptId && vote.promptId !== '') {
        voteCounts[vote.promptId] = (voteCounts[vote.promptId] || 0) + 1;
      }
    });
    console.log(JSON.stringify(voteCounts, null, 2));

    // Broadcast vote update to all players
    io.to(room.code).emit('vote-updated', {
      promptVotes: room.gameState.promptVotes
    });

    console.log(`Player ${playerId} voted for prompt ${promptId} in game ${room.code}. Total votes: ${room.gameState.promptVotes.length}`);
  });

  // Handle lock in vote
  socket.on('lock-in-vote', (data) => {
    const { gameCode, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room || !room.gameState || room.gameState.gamePhase !== 'prompt-voting') return;

    // Initialize promptVotes array if it doesn't exist
    if (!room.gameState.promptVotes) {
      room.gameState.promptVotes = [];
    }

    console.log(`=== LOCK-IN DEBUG: Player ${playerId} locking in ===`);
    console.log('Before lock-in, all votes:', JSON.stringify(room.gameState.promptVotes, null, 2));
    
    // Find and update player's vote to locked in
    const voteIndex = room.gameState.promptVotes.findIndex(v => v.playerId === playerId);
    console.log(`Found vote at index: ${voteIndex}`);
    
    if (voteIndex >= 0) {
      // Player has an existing vote - lock it in
      console.log('Existing vote found:', JSON.stringify(room.gameState.promptVotes[voteIndex], null, 2));
      room.gameState.promptVotes[voteIndex].isLockedIn = true;
      console.log('After locking in:', JSON.stringify(room.gameState.promptVotes[voteIndex], null, 2));
    } else {
      // Player locked in without voting (abstain)
      console.log('No existing vote found, creating abstain vote');
      room.gameState.promptVotes.push({
        playerId: playerId,
        promptId: '', // Empty means abstain
        isLockedIn: true
      });
    }
    
    console.log('After lock-in, all votes:', JSON.stringify(room.gameState.promptVotes, null, 2));

    // Check if all players are locked in
    const connectedPlayers = room.players.filter(p => p.isConnected);
    const lockedInVotes = room.gameState.promptVotes.filter(v => v.isLockedIn);
    
    if (lockedInVotes.length >= connectedPlayers.length) {
      // All players locked in - finish voting early
      const timer = votingTimers.get(gameCode);
      if (timer) {
        clearInterval(timer);
        votingTimers.delete(gameCode);
      }
      finishVoting(gameCode);
    } else {
      // Broadcast lock in update
      io.to(room.code).emit('vote-updated', {
        promptVotes: room.gameState.promptVotes
      });
    }

    console.log(`Player ${playerId} locked in vote for game ${room.code}. Total votes: ${room.gameState.promptVotes.length}`);
  });

  // Handle unlock vote
  socket.on('unlock-vote', (data) => {
    const { gameCode, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room || !room.gameState || room.gameState.gamePhase !== 'prompt-voting') return;

    // Initialize promptVotes array if it doesn't exist
    if (!room.gameState.promptVotes) {
      room.gameState.promptVotes = [];
    }

    console.log(`=== UNLOCK DEBUG: Player ${playerId} unlocking vote ===`);
    console.log('Before unlock, all votes:', JSON.stringify(room.gameState.promptVotes, null, 2));
    
    // Find and update player's vote to unlocked
    const voteIndex = room.gameState.promptVotes.findIndex(v => v.playerId === playerId);
    console.log(`Found vote at index: ${voteIndex}`);
    
    if (voteIndex >= 0) {
      // Player has an existing vote - unlock it
      console.log('Existing vote found:', JSON.stringify(room.gameState.promptVotes[voteIndex], null, 2));
      room.gameState.promptVotes[voteIndex].isLockedIn = false;
      console.log('After unlocking:', JSON.stringify(room.gameState.promptVotes[voteIndex], null, 2));
    }
    
    console.log('After unlock, all votes:', JSON.stringify(room.gameState.promptVotes, null, 2));

    // Broadcast unlock update
    io.to(room.code).emit('vote-updated', {
      promptVotes: room.gameState.promptVotes
    });

    console.log(`Player ${playerId} unlocked vote for game ${room.code}`);
  });

  // Handle adding prompt during voting
  socket.on('add-prompt-during-voting', (data) => {
    const { gameCode, prompt, playerId } = data;
    const room = gameRooms.get(gameCode);

    if (!room || !room.gameState || room.gameState.gamePhase !== 'prompt-voting') return;

    // Add prompt to room's custom prompts
    if (prompt && prompt.trim() && !room.customPrompts.includes(prompt.trim())) {
      room.customPrompts.push(prompt.trim());
      
      // Update game state custom prompts too
      const promptConcepts = getCustomPromptsAsConcepts(room.customPrompts);
      room.gameState.customPrompts = promptConcepts;
      
      // Get the new prompt ID
      const newPromptId = `custom-${room.customPrompts.length - 1}`;
      
      // Automatically vote for the new prompt
      if (!room.gameState.promptVotes) {
        room.gameState.promptVotes = [];
      }
      
      // Find existing vote from this player and update it
      const existingVoteIndex = room.gameState.promptVotes.findIndex(vote => vote.playerId === playerId);
      
      if (existingVoteIndex >= 0) {
        // Update existing vote to the new prompt
        room.gameState.promptVotes[existingVoteIndex] = {
          playerId: playerId,
          promptId: newPromptId,
          isLockedIn: false
        };
      } else {
        // Add new vote for the new prompt
        room.gameState.promptVotes.push({
          playerId: playerId,
          promptId: newPromptId,
          isLockedIn: false
        });
      }
      
      // Broadcast updated prompts and votes to all players in room
      io.to(room.code).emit('prompt-added-during-voting', {
        prompts: room.customPrompts,
        customPrompts: promptConcepts,
        addedBy: playerId,
      });
      
      // Also update the main game state for immediate display
      io.to(room.code).emit('game-state-updated', { 
        gameState: room.gameState 
      });
      
      io.to(room.code).emit('vote-updated', {
        promptVotes: room.gameState.promptVotes
      });

      console.log(`Prompt added during voting to game ${room.code}: "${prompt}" by ${playerId}`);
    }
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

  // Handle player actions (including emoji reactions)
  socket.on('player-action', (data) => {
    const { action, data: actionData } = data;
    
    if (action === 'emoji-reaction') {
      const { emoji } = actionData;
      
      // Find which room this socket is in
      let userRoom = null;
      for (const [code, room] of gameRooms.entries()) {
        if (room.players.find(p => p.id === socket.id)) {
          userRoom = room;
          break;
        }
      }
      
      if (userRoom) {
        // Broadcast emoji reaction to all other players in the room (not the sender)
        socket.to(userRoom.code).emit('emoji-reaction', { emoji });
        console.log(`Emoji reaction ${emoji} sent to room ${userRoom.code}`);
      }
    }
  });

  // Handle emoji reactions (direct event)
  socket.on('emoji-reaction', (data) => {
    const { emoji } = data;
    
    // Find which room this socket is in
    let userRoom = null;
    for (const [code, room] of gameRooms.entries()) {
      if (room.players.find(p => p.id === socket.id)) {
        userRoom = room;
        break;
      }
    }
    
    if (userRoom) {
      // Broadcast emoji reaction to all other players in the room (not the sender)
      socket.to(userRoom.code).emit('emoji-reaction', { emoji });
      console.log(`Emoji reaction ${emoji} sent to room ${userRoom.code}`);
    }
  });

  // Handle skip vote for disconnected player
  socket.on('vote-to-skip-player', (data) => {
    const { gameCode, playerNameToSkip } = data;
    const room = gameRooms.get(gameCode);
    
    if (!room) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    const voter = room.players.find(p => p.id === socket.id);
    const playerToSkip = room.players.find(p => p.name === playerNameToSkip);
    
    if (!voter || !playerToSkip) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }
    
    // Check if player to skip is actually disconnected
    if (playerToSkip.isConnected) {
      socket.emit('error', { message: 'Cannot skip connected player' });
      return;
    }
    
    // Check if we have enough players to skip
    if (!canSkipPlayer(room, playerNameToSkip)) {
      socket.emit('error', { message: 'Not enough players to skip' });
      return;
    }
    
    // Initialize skip tracking for this game if needed
    if (!skipVotes.has(gameCode)) {
      skipVotes.set(gameCode, new Map());
    }
    
    const skipMap = skipVotes.get(gameCode);
    if (!skipMap.has(playerNameToSkip)) {
      skipMap.set(playerNameToSkip, new Set());
    }
    
    // Add this player's vote to skip
    const votersForSkip = skipMap.get(playerNameToSkip);
    votersForSkip.add(socket.id);
    
    // Check if all players have voted to skip
    if (checkSkipVotes(gameCode, playerNameToSkip)) {
      // All players voted to skip - permanently exclude this player from cycles
      if (room.gameState) {
        room.gameState.skippedPlayers = room.gameState.skippedPlayers || [];
        if (!room.gameState.skippedPlayers.includes(playerNameToSkip)) {
          room.gameState.skippedPlayers.push(playerNameToSkip);
        }
        
        // If this was the current psychic, move to next player
        if (room.gameState.gamePhase === 'psychic') {
          const currentPsychic = room.gameState.players[room.gameState.currentPsychicIndex];
          if (currentPsychic && currentPsychic.name === playerNameToSkip) {
            // Move to next psychic
            advanceToNextPsychic(room);
          }
        }
        
        // If this was a guesser and we're in guessing phase, check if all remaining players are locked in
        if (room.gameState.gamePhase === 'guessing') {
          console.log(`SERVER: Player ${playerNameToSkip} skipped during guessing phase, checking if all others are locked in`);
          if (checkAllPlayersLockedIn(room.gameState)) {
            console.log(`SERVER: All remaining players are locked in, transitioning to scoring`);
            // All remaining players are locked in - transition to scoring
            transitionToScoring(room);
          }
        }
        
        // Clear skip votes since action was taken
        skipMap.delete(playerNameToSkip);
        
        // Broadcast updated game state
        io.to(gameCode).emit('game-state-updated', { 
          gameState: room.gameState,
          disconnectedPlayers: room.players.filter(p => !p.isConnected).map(p => p.name),
          message: `${playerNameToSkip} has been skipped by all players`
        });
        
        console.log(`Player ${playerNameToSkip} skipped by all players in room ${gameCode}`);
      }
    } else {
      // Broadcast current skip vote status
      const connectedPlayers = room.players.filter(p => p.isConnected);
      io.to(gameCode).emit('skip-vote-update', {
        playerNameToSkip,
        votesReceived: votersForSkip.size,
        votesNeeded: connectedPlayers.length,
        voterNames: Array.from(votersForSkip).map(id => room.players.find(p => p.id === id)?.name).filter(Boolean)
      });
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
        
        // Add connection notification
        addConnectionNotification(room.code, 'disconnected', player.name);

        // Notify other players about disconnection
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

        // If game is in progress, update player connection status but don't automatically skip
        if (room.gameState && room.isGameStarted) {
          // Update player connection status in game state
          const gamePlayer = room.gameState.players.find(p => p.name === player.name);
          if (gamePlayer) {
            gamePlayer.isConnected = false;
          }
          
          // Broadcast updated game state to show disconnection status
          io.to(room.code).emit('game-state-updated', { 
            gameState: room.gameState,
            disconnectedPlayers: room.players.filter(p => !p.isConnected).map(p => p.name)
          });
          console.log(`Player ${player.name} marked as disconnected in room ${room.code}`);
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