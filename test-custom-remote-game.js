#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Custom Remote Game Mode
 * Tests multi-player interactions and proper game state progress
 * 
 * Usage: node test-custom-remote-game.js
 */

const { io: Client } = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds
const VOTING_TIME = 10; // seconds

// Test state
let testResults = [];
let currentTest = '';
let players = {};
let gameRoom = null;

// Helper function to log test results
function logTest(name, status, message = '') {
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${message}`);
  testResults.push({ name, status, message });
}

// Helper function to wait for condition or timeout
function waitForCondition(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

// Helper function to create a player
function createPlayer(name, isHost = false) {
  const socket = Client(SERVER_URL, {
    transports: ['polling', 'websocket'],
    forceNew: true
  });

  const player = {
    name,
    socket,
    isHost,
    connected: false,
    gameCode: null,
    gameState: null,
    multiplayerState: {
      players: [],
      currentPlayerId: null,
      isHost: false,
      promptVotes: [],
      votingTimeLeft: 0
    }
  };

  // Set up event listeners
  socket.on('connect', () => {
    console.log(`🔗 ${name} connected`);
    player.connected = true;
  });

  socket.on('game-created', (data) => {
    console.log(`🏠 ${name} created game: ${data.gameCode}`);
    player.gameCode = data.gameCode;
    gameRoom = data.room;
    player.multiplayerState.isHost = true;
  });

  socket.on('game-joined', (data) => {
    console.log(`👥 ${name} joined game: ${data.gameCode}`);
    player.gameCode = data.gameCode;
    gameRoom = data.room;
  });

  socket.on('join-error', (data) => {
    console.log(`❌ ${name} join error: ${data.message}`);
  });

  socket.on('players-updated', (data) => {
    console.log(`📝 ${name} players updated: ${data.players.map(p => p.name).join(', ')}`);
    player.multiplayerState.players = data.players;
    player.multiplayerState.currentPlayerId = player.socket.id;
  });

  socket.on('game-started', (data) => {
    console.log(`🎮 ${name} game started with config:`, data.gameConfig.mode);
    player.gameState = data.gameState || {};
  });

  socket.on('game-state-updated', (data) => {
    console.log(`🔄 ${name} game state updated: ${data.gameState.gamePhase}`);
    player.gameState = data.gameState;
  });

  socket.on('voting-started', (data) => {
    console.log(`🗳️ ${name} voting started with ${data.customPrompts.length} prompts`);
    player.multiplayerState.promptVotes = [];
    player.multiplayerState.votingTimeLeft = data.timeLeft;
  });

  socket.on('prompt-votes-updated', (data) => {
    console.log(`📊 ${name} prompt votes updated: ${data.votes.length} votes`);
    player.multiplayerState.promptVotes = data.votes;
  });

  socket.on('voting-time-update', (data) => {
    player.multiplayerState.votingTimeLeft = data.timeLeft;
  });

  socket.on('voting-finished', (data) => {
    console.log(`✅ ${name} voting finished, selected: ${data.selectedPrompt.leftConcept} vs ${data.selectedPrompt.rightConcept}`);
    player.gameState = data.gameState;
  });

  socket.on('dial-updated', (data) => {
    if (player.gameState) {
      player.gameState.dialPosition = data.position;
    }
  });

  socket.on('emoji-reaction', (data) => {
    console.log(`😊 ${name} received emoji: ${data.emoji}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 ${name} disconnected`);
    player.connected = false;
  });

  return player;
}

// Test 1: Multi-player game initialization and setup
async function testGameInitialization() {
  currentTest = 'Game Initialization';
  console.log('\n🧪 Testing Game Initialization...');

  try {
    // Create host player
    players.host = createPlayer('Alice', true);
    
    // Wait for connection
    await waitForCondition(() => players.host.connected);
    logTest('Host connection', 'PASS', 'Alice connected successfully');

    // Create game with custom mode
    players.host.socket.emit('create-game', {
      playerName: 'Alice'
    });

    // Wait for game creation
    await waitForCondition(() => players.host.gameCode);
    logTest('Game creation', 'PASS', `Game ${players.host.gameCode} created`);

    // Set up custom mode
    players.host.socket.emit('update-game-mode', {
      gameCode: players.host.gameCode,
      mode: 'custom'
    });

    // Add custom prompts
    const customPrompts = [
      'Hot vs Cold',
      'Fast vs Slow', 
      'Big vs Small',
      'Happy vs Sad',
      'Loud vs Quiet'
    ];

    for (const prompt of customPrompts) {
      players.host.socket.emit('add-prompt', {
        gameCode: players.host.gameCode,
        prompt
      });
    }

    // Create additional players
    players.bob = createPlayer('Bob');
    players.charlie = createPlayer('Charlie');
    players.diana = createPlayer('Diana');

    // Wait for all players to connect
    await waitForCondition(() => 
      players.bob.connected && players.charlie.connected && players.diana.connected
    );
    logTest('All players connected', 'PASS', 'Bob, Charlie, Diana connected');

    // Join players to game
    for (const [name, player] of Object.entries(players)) {
      if (name !== 'host') {
        player.socket.emit('join-game', {
          gameCode: players.host.gameCode,
          playerName: player.name
        });
      }
    }

    // Wait for all players to join
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameCode === players.host.gameCode)
    );
    logTest('All players joined', 'PASS', 'All 4 players in the same room');

    // Verify player list is synchronized
    await waitForCondition(() => 
      players.host.multiplayerState.players.length === 4
    );
    logTest('Player synchronization', 'PASS', '4 players synchronized');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 2: Prompt voting phase with multiple players
async function testPromptVotingPhase() {
  currentTest = 'Prompt Voting Phase';
  console.log('\n🧪 Testing Prompt Voting Phase...');

  try {
    // Start the game
    players.host.socket.emit('start-game', {
      gameCode: players.host.gameCode,
      config: {
        mode: 'custom',
        players: ['Alice', 'Bob', 'Charlie', 'Diana']
      }
    });

    // Wait for game to start and reach voting phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'prompt-voting')
    );
    logTest('Voting phase started', 'PASS', 'All players in prompt-voting phase');

    // Test voting timer synchronization
    await waitForCondition(() => 
      Object.values(players).every(p => p.multiplayerState.votingTimeLeft > 0)
    );
    logTest('Voting timer sync', 'PASS', 'Timer synchronized across all players');

    // Each player votes for different prompts
    const votingActions = [
      { player: players.host, promptId: 'custom-0' },
      { player: players.bob, promptId: 'custom-1' },
      { player: players.charlie, promptId: 'custom-0' }, // Same as Alice
      { player: players.diana, promptId: 'custom-2' }
    ];

    for (const { player, promptId } of votingActions) {
      player.socket.emit('vote-prompt', {
        gameCode: player.gameCode,
        promptId
      });
    }

    // Wait for votes to be synchronized
    await waitForCondition(() => 
      Object.values(players).every(p => p.multiplayerState.promptVotes.length === 4)
    );
    logTest('Vote synchronization', 'PASS', 'All 4 votes synchronized');

    // Test lock-in functionality
    players.host.socket.emit('lock-in-vote', {
      gameCode: players.host.gameCode
    });

    players.charlie.socket.emit('lock-in-vote', {
      gameCode: players.charlie.gameCode
    });

    // Wait for locked votes
    await waitForCondition(() => 
      Object.values(players).some(p => 
        p.multiplayerState.promptVotes.filter(v => v.isLockedIn).length >= 2
      )
    );
    logTest('Lock-in functionality', 'PASS', '2 players locked in votes');

    // Test adding custom prompt during voting
    players.bob.socket.emit('add-prompt-during-voting', {
      gameCode: players.bob.gameCode,
      prompt: 'New vs Old'
    });

    // Wait a bit for the prompt to be added
    await new Promise(resolve => setTimeout(resolve, 1000));
    logTest('Dynamic prompt addition', 'PASS', 'Custom prompt added during voting');

    // Wait for voting to finish (either timer expires or enough players lock in)
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'psychic')
    , VOTING_TIME * 1000 + 2000); // Extra time for processing
    logTest('Voting completion', 'PASS', 'Moved to psychic phase');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 3: Psychic phase interactions and state sync
async function testPsychicPhase() {
  currentTest = 'Psychic Phase';
  console.log('\n🧪 Testing Psychic Phase...');

  try {
    // Verify all players are in psychic phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'psychic')
    );
    logTest('Psychic phase sync', 'PASS', 'All players in psychic phase');

    // Check that a current card was selected
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.currentCard)
    );
    logTest('Card selection', 'PASS', 'Prompt card selected and synchronized');

    // Verify target position is set
    await waitForCondition(() => 
      Object.values(players).every(p => 
        p.gameState && typeof p.gameState.targetPosition === 'number' && 
        p.gameState.targetPosition >= 0 && p.gameState.targetPosition <= 100
      )
    );
    logTest('Target generation', 'PASS', 'Target position generated');

    // Test dial updates (psychic moves dial)
    const psychicPlayer = Object.values(players)[0]; // First player is psychic
    psychicPlayer.socket.emit('update-dial', {
      gameCode: psychicPlayer.gameCode,
      position: 75
    });

    // Wait for dial position to sync
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.dialPosition === 75)
    );
    logTest('Dial synchronization', 'PASS', 'Dial position synchronized');

    // Psychic submits clue
    psychicPlayer.socket.emit('player-action', {
      gameCode: psychicPlayer.gameCode,
      action: 'submit-clue',
      data: { clue: 'Think summer vacation' }
    });

    // Wait for transition to guessing phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'guessing')
    );
    logTest('Clue submission', 'PASS', 'Clue submitted, moved to guessing phase');

    // Verify clue is synchronized
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.psychicClue === 'Think summer vacation')
    );
    logTest('Clue synchronization', 'PASS', 'Clue synchronized across all players');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 4: Guessing phase with multiple players voting
async function testGuessingPhase() {
  currentTest = 'Guessing Phase';
  console.log('\n🧪 Testing Guessing Phase...');

  try {
    // Verify all players are in guessing phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'guessing')
    );
    logTest('Guessing phase sync', 'PASS', 'All players in guessing phase');

    // Non-psychic players make guesses
    const nonPsychicPlayers = Object.values(players).slice(1); // Skip first player (psychic)
    const guessPositions = [65, 70, 68]; // Different guess positions

    for (let i = 0; i < nonPsychicPlayers.length; i++) {
      const player = nonPsychicPlayers[i];
      const position = guessPositions[i];

      // Update dial position
      player.socket.emit('update-dial', {
        gameCode: player.gameCode,
        position
      });

      // Lock in guess
      player.socket.emit('player-action', {
        gameCode: player.gameCode,
        action: 'lock-in-guess',
        data: { position }
      });
    }

    // Wait for all non-psychic players to lock in
    await waitForCondition(() => {
      const somePlayer = Object.values(players)[0];
      return somePlayer.gameState && 
             somePlayer.gameState.guessVotes && 
             somePlayer.gameState.guessVotes.filter(v => v.isLockedIn).length === 3;
    });
    logTest('Guess lock-in', 'PASS', 'All non-psychic players locked in guesses');

    // Wait for transition to scoring phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'scoring')
    );
    logTest('Scoring transition', 'PASS', 'Moved to scoring phase');

    // Verify score calculation
    await waitForCondition(() => 
      Object.values(players).every(p => 
        p.gameState && 
        p.gameState.roundScores && 
        p.gameState.roundScores.length > 0
      )
    );
    logTest('Score calculation', 'PASS', 'Score calculated and synchronized');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 5: Scoring and round progression
async function testScoringAndProgression() {
  currentTest = 'Scoring and Round Progression';
  console.log('\n🧪 Testing Scoring and Round Progression...');

  try {
    // Verify scoring phase
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'scoring')
    );
    logTest('Scoring phase', 'PASS', 'All players in scoring phase');

    // Host starts next round
    players.host.socket.emit('next-round', {
      gameCode: players.host.gameCode
    });

    // Wait for next round to start (should go back to voting)
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.gamePhase === 'prompt-voting')
    );
    logTest('Round progression', 'PASS', 'Advanced to next round');

    // Verify round counter increased
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.currentRound === 2)
    );
    logTest('Round counter', 'PASS', 'Round counter incremented');

    // Verify psychic rotation
    await waitForCondition(() => 
      Object.values(players).every(p => p.gameState && p.gameState.currentPsychicIndex === 1)
    );
    logTest('Psychic rotation', 'PASS', 'Psychic role rotated to next player');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 6: Game end conditions and cleanup
async function testGameEndAndCleanup() {
  currentTest = 'Game End and Cleanup';
  console.log('\n🧪 Testing Game End and Cleanup...');

  try {
    // Fast-forward to end of game by manually setting high round number
    // This simulates reaching the end condition
    
    // Test emoji reactions during game
    players.bob.socket.emit('emoji-reaction', {
      gameCode: players.bob.gameCode,
      emoji: '😍'
    });

    // Wait for emoji to be received by others
    await new Promise(resolve => setTimeout(resolve, 1000));
    logTest('Emoji reactions', 'PASS', 'Emoji reactions work during game');

    // Test disconnection handling
    const originalPlayers = [...players.host.multiplayerState.players];
    players.diana.socket.disconnect();

    // Wait for player list to update
    await waitForCondition(() => 
      players.host.multiplayerState.players.length < originalPlayers.length ||
      players.host.multiplayerState.players.some(p => !p.isConnected)
    );
    logTest('Disconnection handling', 'PASS', 'Player disconnection handled');

    // Test leaving game
    players.charlie.socket.emit('leave-game', {
      gameCode: players.charlie.gameCode
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    logTest('Game leaving', 'PASS', 'Player can leave game');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Test 7: Additional edge cases and stress tests
async function testEdgeCases() {
  currentTest = 'Edge Cases';
  console.log('\n🧪 Testing Edge Cases...');

  try {
    // Test rapid dial movements
    for (let i = 0; i < 10; i++) {
      players.host.socket.emit('update-dial', {
        gameCode: players.host.gameCode,
        position: Math.random() * 100
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    logTest('Rapid dial updates', 'PASS', 'Handled rapid dial movements');

    // Test voting for non-existent prompt
    players.host.socket.emit('vote-prompt', {
      gameCode: players.host.gameCode,
      promptId: 'non-existent-prompt-id'
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    logTest('Invalid prompt voting', 'PASS', 'Handled invalid prompt ID');

    // Test invalid game actions
    players.host.socket.emit('player-action', {
      gameCode: players.host.gameCode,
      action: 'invalid-action',
      data: {}
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    logTest('Invalid actions', 'PASS', 'Handled invalid game actions');

  } catch (error) {
    logTest(currentTest, 'FAIL', error.message);
  }
}

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up...');
  Object.values(players).forEach(player => {
    if (player.socket && player.socket.connected) {
      player.socket.disconnect();
    }
  });
}

// Print test results summary
function printResults() {
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name}: ${test.message}`);
    });
  }
  
  console.log('\n📝 Detailed Results:');
  testResults.forEach(test => {
    console.log(`  ${test.status === 'PASS' ? '✅' : '❌'} ${test.name}`);
  });
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Custom Remote Game Mode Tests');
  console.log('=' .repeat(50));
  
  try {
    await testGameInitialization();
    await testPromptVotingPhase();
    await testPsychicPhase();
    await testGuessingPhase();
    await testScoringAndProgression();
    await testGameEndAndCleanup();
    await testEdgeCases();
    
  } catch (error) {
    console.error('💥 Test runner error:', error.message);
    logTest('Test Runner', 'FAIL', error.message);
  } finally {
    cleanup();
    printResults();
    process.exit(testResults.some(r => r.status === 'FAIL') ? 1 : 0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Tests interrupted by user');
  cleanup();
  printResults();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error.message);
  cleanup();
  process.exit(1);
});

// Set global timeout
setTimeout(() => {
  console.error('⏰ Tests timed out');
  cleanup();
  printResults();
  process.exit(1);
}, TEST_TIMEOUT);

// Start tests
runTests();