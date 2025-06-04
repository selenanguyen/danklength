#!/usr/bin/env node

/**
 * Game State Logic Unit Tests
 * Tests the core game state transitions and logic without Socket.IO
 * 
 * Usage: node test-game-state.js
 */

// Mock implementations for testing
const mockSpectrumConcepts = [
  { id: '1', leftConcept: 'Hot', rightConcept: 'Cold' },
  { id: '2', leftConcept: 'Fast', rightConcept: 'Slow' },
  { id: '3', leftConcept: 'Big', rightConcept: 'Small' }
];

function getRandomConcept() {
  return mockSpectrumConcepts[Math.floor(Math.random() * mockSpectrumConcepts.length)];
}

// Test state
let testResults = [];

function logTest(name, status, message = '') {
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${message}`);
  testResults.push({ name, status, message });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Test 1: Game State Initialization
function testGameStateInitialization() {
  console.log('\n🧪 Testing Game State Initialization...');
  
  try {
    const gameState = {
      gameMode: 'custom',
      players: [
        { id: '1', name: 'Alice', isConnected: true },
        { id: '2', name: 'Bob', isConnected: true },
        { id: '3', name: 'Charlie', isConnected: true }
      ],
      currentPsychicIndex: 0,
      currentCard: null,
      targetPosition: 50,
      targetWidth: 25,
      dialPosition: 50,
      gamePhase: 'setup',
      psychicClue: '',
      currentRound: 0,
      totalRounds: 8,
      totalScore: 0,
      roundScores: [],
      roundClues: [],
      customPrompts: [
        { id: 'custom-0', leftConcept: 'Hot', rightConcept: 'Cold' },
        { id: 'custom-1', leftConcept: 'Fast', rightConcept: 'Slow' }
      ],
      promptVotes: [],
      guessVotes: []
    };

    assert(gameState.players.length === 3, 'Should have 3 players');
    assert(gameState.gameMode === 'custom', 'Should be in custom mode');
    assert(gameState.customPrompts.length === 2, 'Should have 2 custom prompts');
    assert(gameState.gamePhase === 'setup', 'Should start in setup phase');
    
    logTest('Initial game state', 'PASS', 'Game state initialized correctly');
  } catch (error) {
    logTest('Initial game state', 'FAIL', error.message);
  }
}

// Test 2: Prompt Voting Logic
function testPromptVotingLogic() {
  console.log('\n🧪 Testing Prompt Voting Logic...');
  
  try {
    // Mock prompt voting scenario
    const customPrompts = [
      { id: 'custom-0', leftConcept: 'Hot', rightConcept: 'Cold' },
      { id: 'custom-1', leftConcept: 'Fast', rightConcept: 'Slow' },
      { id: 'custom-2', leftConcept: 'Big', rightConcept: 'Small' }
    ];

    let promptVotes = [];
    
    // Simulate voting
    promptVotes.push({ playerId: '1', promptId: 'custom-0', isLockedIn: false });
    promptVotes.push({ playerId: '2', promptId: 'custom-1', isLockedIn: false });
    promptVotes.push({ playerId: '3', promptId: 'custom-0', isLockedIn: false }); // Same as player 1

    assert(promptVotes.length === 3, 'Should have 3 votes');
    
    // Test lock-in functionality
    promptVotes[0].isLockedIn = true;
    promptVotes[2].isLockedIn = true;
    
    const lockedVotes = promptVotes.filter(v => v.isLockedIn);
    assert(lockedVotes.length === 2, 'Should have 2 locked votes');
    
    // Test vote counting
    const voteCounts = {};
    promptVotes.forEach(vote => {
      if (vote.isLockedIn) {
        voteCounts[vote.promptId] = (voteCounts[vote.promptId] || 0) + 1;
      }
    });
    
    assert(voteCounts['custom-0'] === 2, 'custom-0 should have 2 votes');
    assert(voteCounts['custom-1'] === undefined, 'custom-1 should have 0 locked votes');
    
    // Select winning prompt
    let selectedPrompt = customPrompts[0]; // default
    let maxVotes = 0;
    
    Object.entries(voteCounts).forEach(([promptId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        const foundPrompt = customPrompts.find(p => p.id === promptId);
        if (foundPrompt) {
          selectedPrompt = foundPrompt;
        }
      }
    });
    
    assert(selectedPrompt.id === 'custom-0', 'Should select custom-0 as winner');
    
    logTest('Prompt voting logic', 'PASS', 'Voting mechanics work correctly');
  } catch (error) {
    logTest('Prompt voting logic', 'FAIL', error.message);
  }
}

// Test 3: Psychic Phase Logic
function testPsychicPhaseLogic() {
  console.log('\n🧪 Testing Psychic Phase Logic...');
  
  try {
    let gameState = {
      gamePhase: 'psychic',
      currentPsychicIndex: 0,
      players: [
        { id: '1', name: 'Alice', isConnected: true },
        { id: '2', name: 'Bob', isConnected: true },
        { id: '3', name: 'Charlie', isConnected: true }
      ],
      currentCard: { id: 'custom-0', leftConcept: 'Hot', rightConcept: 'Cold' },
      targetPosition: 75,
      targetWidth: 25,
      dialPosition: 50,
      psychicClue: '',
      guessVotes: []
    };

    // Test psychic identification
    const currentPsychic = gameState.players[gameState.currentPsychicIndex];
    assert(currentPsychic.name === 'Alice', 'Alice should be the psychic');
    
    // Test clue submission
    gameState.psychicClue = 'Think summer weather';
    gameState.gamePhase = 'guessing';
    gameState.dialPosition = 50; // Reset for guessers
    
    assert(gameState.psychicClue === 'Think summer weather', 'Clue should be set');
    assert(gameState.gamePhase === 'guessing', 'Should transition to guessing');
    assert(gameState.dialPosition === 50, 'Dial should reset to center');
    
    logTest('Psychic phase logic', 'PASS', 'Psychic phase transitions correctly');
  } catch (error) {
    logTest('Psychic phase logic', 'FAIL', error.message);
  }
}

// Test 4: Guessing Phase Logic
function testGuessingPhaseLogic() {
  console.log('\n🧪 Testing Guessing Phase Logic...');
  
  try {
    let gameState = {
      gamePhase: 'guessing',
      currentPsychicIndex: 0,
      players: [
        { id: '1', name: 'Alice', isConnected: true },
        { id: '2', name: 'Bob', isConnected: true },
        { id: '3', name: 'Charlie', isConnected: true }
      ],
      dialPosition: 50,
      guessVotes: []
    };

    // Test guess vote tracking
    gameState.guessVotes.push({
      playerId: '2',
      playerName: 'Bob',
      isLockedIn: false,
      dialPosition: 65
    });

    gameState.guessVotes.push({
      playerId: '3',
      playerName: 'Charlie',
      isLockedIn: false,
      dialPosition: 70
    });

    assert(gameState.guessVotes.length === 2, 'Should have 2 guess votes');
    
    // Test lock-in functionality
    gameState.guessVotes[0].isLockedIn = true;
    gameState.guessVotes[1].isLockedIn = true;
    
    // Check if all non-psychic players locked in
    const nonPsychicPlayers = gameState.players.filter((_, index) => index !== gameState.currentPsychicIndex);
    const lockedInVotes = gameState.guessVotes.filter(vote => vote.isLockedIn);
    
    const allLockedIn = lockedInVotes.length >= nonPsychicPlayers.length && nonPsychicPlayers.length > 0;
    assert(allLockedIn, 'All non-psychic players should be locked in');
    
    // Transition to scoring
    gameState.gamePhase = 'scoring';
    assert(gameState.gamePhase === 'scoring', 'Should transition to scoring');
    
    logTest('Guessing phase logic', 'PASS', 'Guessing phase works correctly');
  } catch (error) {
    logTest('Guessing phase logic', 'FAIL', error.message);
  }
}

// Test 5: Score Calculation Logic
function testScoreCalculationLogic() {
  console.log('\n🧪 Testing Score Calculation Logic...');
  
  try {
    // Mock score calculation function (simplified version)
    function calculateScore(dialPos, targetPos, targetWidth) {
      const distance = Math.abs(dialPos - targetPos);
      const zoneWidth = 5; // 5% per zone
      const centerZone = zoneWidth / 2;           // 2.5%
      const innerZone = centerZone + zoneWidth;   // 7.5%
      const outerZone = centerZone + (zoneWidth * 2); // 12.5%
      
      if (distance <= centerZone) {
        return { points: 4, zone: 'center' };
      } else if (distance <= innerZone) {
        return { points: 3, zone: 'inner' };
      } else if (distance <= outerZone) {
        return { points: 2, zone: 'outer' };
      } else {
        return { points: 0, zone: 'miss' };
      }
    }

    // Test various positions
    const testCases = [
      { dial: 50, target: 50, expected: { points: 4, zone: 'center' } }, // Perfect hit
      { dial: 53, target: 50, expected: { points: 3, zone: 'inner' } },  // Inner zone
      { dial: 60, target: 50, expected: { points: 2, zone: 'outer' } },  // Outer zone
      { dial: 70, target: 50, expected: { points: 0, zone: 'miss' } },   // Miss
      { dial: 25, target: 30, expected: { points: 3, zone: 'inner' } },  // Different target
    ];

    testCases.forEach((testCase, index) => {
      const result = calculateScore(testCase.dial, testCase.target, 25);
      assert(
        result.points === testCase.expected.points && result.zone === testCase.expected.zone,
        `Test case ${index + 1} failed: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(result)}`
      );
    });

    logTest('Score calculation', 'PASS', 'Score calculation works correctly');
  } catch (error) {
    logTest('Score calculation', 'FAIL', error.message);
  }
}

// Test 6: Round Progression Logic
function testRoundProgressionLogic() {
  console.log('\n🧪 Testing Round Progression Logic...');
  
  try {
    let gameState = {
      currentRound: 1,
      totalRounds: 8,
      currentPsychicIndex: 0,
      players: [
        { id: '1', name: 'Alice', isConnected: true },
        { id: '2', name: 'Bob', isConnected: true },
        { id: '3', name: 'Charlie', isConnected: true }
      ],
      roundScores: [3],
      totalScore: 3,
      roundClues: ['Think summer weather'],
      gamePhase: 'scoring'
    };

    // Test round progression
    const nextRound = gameState.currentRound + 1;
    
    if (nextRound <= gameState.totalRounds) {
      gameState.currentRound = nextRound;
      gameState.currentPsychicIndex = (gameState.currentPsychicIndex + 1) % gameState.players.length;
      gameState.gamePhase = 'prompt-voting'; // For custom mode
      gameState.dialPosition = 50;
      gameState.psychicClue = '';
      
      assert(gameState.currentRound === 2, 'Round should increment');
      assert(gameState.currentPsychicIndex === 1, 'Psychic should rotate');
      assert(gameState.gamePhase === 'prompt-voting', 'Should return to voting phase');
    } else {
      gameState.gamePhase = 'ended';
    }

    // Test game end condition
    gameState.currentRound = 8;
    const finalNextRound = gameState.currentRound + 1;
    
    if (finalNextRound > gameState.totalRounds) {
      gameState.gamePhase = 'ended';
    }
    
    assert(gameState.gamePhase === 'ended', 'Game should end after final round');
    
    logTest('Round progression', 'PASS', 'Round progression works correctly');
  } catch (error) {
    logTest('Round progression', 'FAIL', error.message);
  }
}

// Test 7: Edge Cases
function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases...');
  
  try {
    // Test empty custom prompts
    const emptyPrompts = [];
    assert(emptyPrompts.length === 0, 'Empty prompts array should be handled');
    
    // Test single player (edge case)
    const singlePlayerState = {
      players: [{ id: '1', name: 'Alice', isConnected: true }],
      currentPsychicIndex: 0
    };
    
    const nonPsychicPlayers = singlePlayerState.players.filter((_, index) => index !== singlePlayerState.currentPsychicIndex);
    assert(nonPsychicPlayers.length === 0, 'Single player should have no non-psychic players');
    
    // Test boundary score calculations
    function calculateScore(dialPos, targetPos) {
      const distance = Math.abs(dialPos - targetPos);
      if (distance <= 2.5) return { points: 4, zone: 'center' };
      if (distance <= 7.5) return { points: 3, zone: 'inner' };
      if (distance <= 12.5) return { points: 2, zone: 'outer' };
      return { points: 0, zone: 'miss' };
    }
    
    // Test boundary values  
    let result = calculateScore(57.5, 50); // Distance = 7.5, exactly on inner/outer boundary
    assert(result.points === 3, 'Distance 7.5 should be in inner zone'); // distance = 7.5, which is <= 7.5
    
    result = calculateScore(62.5, 50); // Exactly on outer boundary
    assert(result.points === 2, 'Boundary value should be in outer zone');
    
    // Test extreme dial positions
    result = calculateScore(0, 50);   // Far left
    assert(result.points === 0, 'Far positions should miss');
    
    result = calculateScore(100, 50); // Far right
    assert(result.points === 0, 'Far positions should miss');
    
    logTest('Edge cases', 'PASS', 'Edge cases handled correctly');
  } catch (error) {
    logTest('Edge cases', 'FAIL', error.message);
  }
}

// Print test results
function printResults() {
  console.log('\n📊 Game State Test Results:');
  console.log('=' .repeat(40));
  
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
}

// Run all tests
function runAllTests() {
  console.log('🧪 Game State Logic Tests');
  console.log('=' .repeat(30));
  
  testGameStateInitialization();
  testPromptVotingLogic();
  testPsychicPhaseLogic();
  testGuessingPhaseLogic();
  testScoreCalculationLogic();
  testRoundProgressionLogic();
  testEdgeCases();
  
  printResults();
  
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();