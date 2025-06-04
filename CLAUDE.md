# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start frontend development server (localhost:5173)
- `npm run dev:server` - Start backend server only (localhost:3001)
- `npm run build` - Build for production (outputs to /dist)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Hosting Games for Friends
- `./start-server.sh` - **One-command setup** that handles everything:
  - Starts local game server on port 3001
  - Creates ngrok tunnel for remote access 
  - Updates config.ts with new ngrok URL
  - Builds and deploys to Netlify
  - Provides all URLs needed

### Testing & Quality Assurance
- `npm run test` - Run comprehensive test suite (unit + integration)
- `npm run test:unit` - Run game state logic unit tests only
- `npm run test:integration` - Run multiplayer Socket.IO integration tests
- `./run-tests.sh` - Full test runner with server management
- `curl YOUR_NGROK_URL/health` - Test server connectivity
- `curl YOUR_NGROK_URL/socket.io/?EIO=4&transport=polling&t=TIMESTAMP` - Test Socket.IO

## Architecture Overview

### Dual-Mode Game Architecture
This is a **dual-mode application** supporting both local and remote multiplayer:

**Local Mode**: Single device, pass-and-play
- Game state managed entirely in frontend
- Players take turns with same device
- No network requirements

**Remote Mode**: Multi-device, real-time sync
- Socket.IO client-server architecture
- Game state synchronized across all players
- 4-character room codes for joining

### Key State Management
- **useGameState**: Core game logic hook with 8 phases (setup → player-setup → psychic → guessing → scoring → ended)
- **useSocket**: Multiplayer networking hook with 15+ socket events
- **Game flow**: 8 rounds with rotating psychic, scoring based on dial proximity to hidden target

### Socket.IO Configuration Notes
The Socket.IO client includes special configuration for ngrok compatibility:
```typescript
io(serverUrl, {
  transportOptions: {
    polling: { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } },
    websocket: { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } }
  },
  transports: ['polling', 'websocket']
})
```

### Configuration Management
- `src/config.ts` - Environment-aware server URLs
- Production: Uses ngrok URL during development hosting
- Development: Uses localhost:3001
- **Important**: ngrok URL changes on every restart, config must be updated

### Component Relationships
- **App.tsx**: Main orchestrator, switches between local/remote modes
- **MultiplayerLobby.tsx**: Game creation/joining interface (remote mode only)
- **Dial.tsx**: Core interactive component, handles mouse/touch positioning
- **GameSetup.tsx**: Welcome screen and rules display

### Server Architecture (server.cjs)
- Express server with Socket.IO
- In-memory room storage with 24-hour cleanup
- CORS configured for Netlify domains
- Health endpoint at `/health`
- Real-time game state broadcasting

## Development Workflow

### Local Development
1. Start backend: `npm run dev:server`
2. Start frontend: `npm run dev` 
3. Access at localhost:5173

### Testing with Friends
1. Run `./start-server.sh` (requires ngrok account)
2. Share the Netlify URL (not the ngrok URL)
3. Monitor using ngrok dashboard at localhost:4040

### Important Deployment Notes
- **Netlify**: Auto-deploys from git pushes to master branch
- **Configuration changes**: Require rebuild and redeploy
- **ngrok URLs**: Change on every restart, must update config.ts
- **CORS**: Server configured for production domains in server.cjs

## Troubleshooting Common Issues

### Socket.IO Connection Problems
- Verify ngrok tunnel is active: `curl -s http://localhost:4040/api/tunnels`
- Check bypass headers are included for ngrok warning page
- Ensure server is running on port 3001 before starting ngrok

### Build Issues
- TypeScript errors: Check that all Socket.IO event types match between client and server
- Missing dependencies: Ensure both frontend and backend dependencies are installed

### Deployment Issues  
- Config URL mismatch: Ensure src/config.ts matches current ngrok URL
- Git not pushing: Check repository setup and authentication
- Netlify deploy fails: Check build logs at deploy status URL

## Game Logic Specifics

### Scoring System
- **Bullseye (4 points)**: Within center zone of target
- **Close (3 points)**: Within inner ring  
- **Okay (2 points)**: Within outer ring
- **Miss (0 points)**: Outside all zones
- **Bonus**: +1 point for correct opposing team left/right guess

### Spectrum Concepts
- 20 built-in concept pairs in `src/data/spectrumConcepts.ts`
- Custom prompts supported in game setup
- Target position randomized (0-100) with width (15-35) each round

### Round Management
- 8 rounds total by default
- Psychic role rotates each round
- Game ends when team reaches 10 points OR 8 rounds complete

## Testing Architecture

### Comprehensive Test Suite
The project includes extensive testing for the custom remote game mode:

#### Unit Tests (`test-game-state.js`)
- **Game State Logic**: Initialization, phase transitions, round progression
- **Prompt Voting**: Vote counting, lock-in mechanics, winner selection
- **Score Calculation**: Distance-based zones (center: 4pts, inner: 3pts, outer: 2pts, miss: 0pts)
- **Edge Cases**: Boundary conditions, single players, extreme positions
- **100% Coverage**: All core game mechanics tested

#### Integration Tests (`test-custom-remote-game.js`)
- **Multi-player Setup**: 4 players (Alice=Host, Bob, Charlie, Diana)
- **Socket.IO Events**: All 15+ events tested (create-game, join-game, vote-prompt, etc.)
- **Real-time Sync**: State synchronization across all connected clients
- **Phase Progression**: prompt-voting → psychic → guessing → scoring → next round
- **Error Handling**: Disconnections, invalid actions, network resilience

#### Test Coverage Areas
1. **Game Initialization** (4 players join custom game)
2. **Prompt Voting Phase** (vote sync, lock-in, dynamic prompts)
3. **Psychic Phase** (role identification, clue submission, dial sync)
4. **Guessing Phase** (multi-player voting, position tracking)
5. **Scoring & Progression** (calculation, round advancement, psychic rotation)
6. **Cleanup & Edge Cases** (disconnections, invalid actions, stress tests)

#### Running Tests
```bash
npm run test         # Full suite with server management
npm run test:unit    # Game logic only (fast)
npm run test:integration # Socket.IO multiplayer (requires server)
```

#### Test Results Format
```
📊 Test Results Summary:
Total Tests: 23
✅ Passed: 23  
❌ Failed: 0
📈 Success Rate: 100.0%
```

See `TESTING.md` for detailed documentation and troubleshooting.