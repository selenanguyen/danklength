# Testing Guide for Custom Remote Game Mode

This document describes the comprehensive testing suite for the Wavelength-style game's custom remote multiplayer functionality.

## Overview

The testing suite consists of two main components:

1. **Game State Unit Tests** (`test-game-state.js`) - Tests core game logic without Socket.IO
2. **Custom Remote Game Integration Tests** (`test-custom-remote-game.js`) - Tests full multiplayer functionality with Socket.IO

## Quick Start

### Running Game State Unit Tests
```bash
# Simple unit tests for game logic
node test-game-state.js
```

### Running Full Integration Tests
```bash
# Comprehensive multiplayer tests (requires server)
./run-tests.sh
```

Or manually:
```bash
# Start server first
npm run dev:server

# In another terminal, run tests
node test-custom-remote-game.js
```

## Test Coverage

### Game State Unit Tests ✅

Tests core game mechanics without network dependencies:

- **Game State Initialization** - Player setup, game modes, custom prompts
- **Prompt Voting Logic** - Vote counting, lock-in mechanics, winner selection
- **Psychic Phase Logic** - Role identification, clue submission, phase transitions
- **Guessing Phase Logic** - Multi-player guess tracking, vote synchronization
- **Score Calculation Logic** - Distance-based scoring with different zones
- **Round Progression Logic** - Round advancement, psychic rotation, game end conditions
- **Edge Cases** - Boundary conditions, single players, extreme positions

### Custom Remote Game Integration Tests 🧪

Tests full multiplayer Socket.IO functionality:

#### 1. **Multi-player Game Initialization and Setup**
- ✅ Host creates game with 4-character room code
- ✅ 3 additional players join successfully  
- ✅ Game mode set to custom with 5 test prompts
- ✅ Player list synchronized across all clients
- ✅ Host/non-host permissions correctly assigned

#### 2. **Prompt Voting Phase with Multiple Players**
- ✅ All players enter prompt-voting phase simultaneously
- ✅ Voting timer synchronized across all clients (10 seconds)
- ✅ Each player votes for different prompts
- ✅ Vote counts updated in real-time for all players
- ✅ Lock-in functionality works correctly
- ✅ Dynamic prompt addition during voting
- ✅ Voting completion triggers phase transition

#### 3. **Psychic Phase Interactions and State Sync**
- ✅ All players transition to psychic phase
- ✅ Winning prompt selected and synchronized
- ✅ Target position generated and shared
- ✅ Dial movements synchronized in real-time
- ✅ Psychic clue submission triggers guessing phase
- ✅ Clue synchronized across all players

#### 4. **Guessing Phase with Multiple Players**
- ✅ Non-psychic players can move dial and lock in guesses
- ✅ Guess positions tracked per player
- ✅ Lock-in status updated for all players
- ✅ Transition to scoring when all players locked in
- ✅ Real-time dial synchronization

#### 5. **Scoring and Round Progression**
- ✅ Score calculation based on dial position vs target
- ✅ Score synchronized across all players
- ✅ Host can advance to next round
- ✅ Round counter increments correctly
- ✅ Psychic role rotates to next player
- ✅ Return to prompt-voting for next round

#### 6. **Game End Conditions and Cleanup**
- ✅ Emoji reaction system works during gameplay
- ✅ Player disconnection handled gracefully
- ✅ Game leaving functionality
- ✅ Connection state management

#### 7. **Edge Cases and Stress Tests**
- ✅ Rapid dial movements handled smoothly
- ✅ Invalid prompt voting rejected safely
- ✅ Invalid game actions ignored appropriately
- ✅ Network resilience and error handling

## Test Architecture

### Socket.IO Event Coverage

The tests verify all critical Socket.IO events:

**Game Management:**
- `create-game` - Room creation
- `join-game` - Player joining
- `start-game` - Game initialization
- `leave-game` - Player departure

**Game State:**
- `update-game-state` - State synchronization
- `game-state-updated` - State broadcast
- `players-updated` - Player list changes

**Voting System:**
- `vote-prompt` - Prompt selection
- `lock-in-vote` - Vote finalization
- `unlock-vote` - Vote changes
- `add-prompt-during-voting` - Dynamic prompts
- `voting-started` - Phase initiation
- `voting-finished` - Phase completion

**Gameplay:**
- `update-dial` - Dial position changes
- `dial-updated` - Position synchronization
- `player-action` - Clue submission, guess locking
- `next-round` - Round progression
- `emoji-reaction` - Player interactions

### Test Players

The integration tests simulate 4 players:
- **Alice** (Host) - Creates game, manages rounds
- **Bob** - Regular player
- **Charlie** - Regular player  
- **Diana** - Regular player (tests disconnection)

### Assertions and Validations

Each test includes comprehensive assertions:
- **State Synchronization** - All players have consistent game state
- **Timing** - Events occur within expected timeframes
- **Data Integrity** - Vote counts, scores, and positions are accurate
- **Role Management** - Psychic rotation and permissions work correctly
- **Error Handling** - Invalid actions are rejected gracefully

## Running Tests in CI/CD

The tests are designed to be run in automated environments:

```bash
# Set test timeout and run
export TEST_TIMEOUT=60000
./run-tests.sh

# Check exit code
echo "Tests completed with exit code: $?"
```

## Troubleshooting

### Common Issues

1. **Server not starting** - Ensure port 3001 is available
2. **Connection timeouts** - Check firewall settings
3. **Test failures** - Review server logs for Socket.IO errors

### Debug Mode

Enable verbose logging:
```bash
DEBUG=socket.io* node test-custom-remote-game.js
```

### Manual Testing

For interactive testing:
1. Start server: `npm run dev:server`
2. Open browser: `http://localhost:5173`
3. Create custom game and test with multiple browser tabs

## Performance Considerations

The tests verify:
- **Concurrent Connections** - 4 simultaneous players
- **Real-time Updates** - Sub-second state synchronization
- **Memory Usage** - No memory leaks during long games
- **Network Efficiency** - Minimal redundant data transmission

## Future Enhancements

Planned test improvements:
- [ ] Load testing with 10+ players
- [ ] Network partition simulation
- [ ] Mobile browser compatibility
- [ ] Cross-browser testing automation
- [ ] Performance regression detection
- [ ] Visual diff testing for UI components

## Contributing

When adding new features:
1. Add corresponding unit tests to `test-game-state.js`
2. Add integration tests to `test-custom-remote-game.js`
3. Update this documentation
4. Ensure all tests pass before submitting PR

## Test Results Example

```
🚀 Custom Remote Game Mode Tests
==================================

🧪 Testing Game Initialization...
✅ Host connection: Alice connected successfully
✅ Game creation: Game AB12 created
✅ All players connected: Bob, Charlie, Diana connected
✅ All players joined: All 4 players in the same room
✅ Player synchronization: 4 players synchronized

🧪 Testing Prompt Voting Phase...
✅ Voting phase started: All players in prompt-voting phase
✅ Voting timer sync: Timer synchronized across all players
✅ Vote synchronization: All 4 votes synchronized
✅ Lock-in functionality: 2 players locked in votes
✅ Dynamic prompt addition: Custom prompt added during voting
✅ Voting completion: Moved to psychic phase

📊 Test Results Summary:
==================================
Total Tests: 23
✅ Passed: 23
❌ Failed: 0
📈 Success Rate: 100.0%
```