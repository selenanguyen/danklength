# Wavelength Game

A digital recreation of the popular board game "Wavelength" - a social guessing game where teams try to read each other's minds by positioning a dial on a spectrum between two opposing concepts.

## 🎯 Game Features

- **Interactive Dial**: Rotatable dial with color-coded scoring zones (4-3-2-0 points)
- **Spectrum Cards**: 20 concept pairs (Hot/Cold, Underrated/Overrated, etc.)
- **Team Scoring**: Two teams compete, first to 10 points wins
- **Game Phases**: Psychic gives clues → Team guesses → Opposing team guesses left/right
- **Visual Target**: Shows actual target location during scoring phase

## 🎮 How to Play

1. **Setup**: Divide into two teams
2. **Psychic Phase**: One player (the Psychic) sees the target location and gives a clue about where it falls on the spectrum
3. **Team Guessing**: The Psychic's team rotates the dial to where they think the target is located
4. **Opposing Guess**: The other team guesses if the target is to the LEFT or RIGHT of the dial
5. **Scoring**: Points awarded based on accuracy:
   - **Bullseye** (red): 4 points
   - **Close** (orange): 3 points 
   - **Okay** (yellow): 2 points
   - **Miss** (gray): 0 points
   - Plus 1 point for correct left/right guess by opposing team
6. **Win**: First team to reach 10 points wins!

## 🚀 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation & Running

1. **Navigate to the project directory:**
   ```bash
   cd /Users/selenanguyen/dev/wavelength/wavelength-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **For Local Play Only:**
   ```bash
   npm run dev
   ```
   Then open: http://localhost:5173/

4. **For Remote Multiplayer:**
   
   **Terminal 1 - Start the server:**
   ```bash
   npm run dev:server
   ```
   
   **Terminal 2 - Start the client:**
   ```bash
   npm run dev
   ```
   
   Then open: http://localhost:5173/

### Game Modes

- **🏠 Local Play**: Play on one device, pass it around
- **🌐 Remote Play**: Each player uses their own device with a 4-character game code

### Remote Multiplayer Features

- **Game Codes**: 4-character codes (e.g. "A3X9") to join games
- **Host Controls**: Game creator can configure settings and start game
- **Real-time Sync**: All players see game state updates in real-time
- **Disconnect Handling**: Players can reconnect, host transfer if needed
- **Cross-Device**: Works on phones, tablets, laptops

### Alternative Commands

- **Run with network access:** `npm run dev -- --host`
- **Run on different port:** `npm run dev -- --port 3000`
- **Build for production:** `npm run build`
- **Preview production build:** `npm run preview`
- **Start server only:** `npm run dev:server`

## 🌐 Online Deployment

Want to host the game online so friends can play without downloading anything?

### Quick Deploy
1. **Server**: Deploy to [Railway](https://railway.app) (free trial)
2. **Frontend**: Deploy to [Netlify](https://netlify.com) (free)
3. **Share URL**: Friends just visit your website!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Hosting Options
- **Railway + Netlify**: Recommended (easy setup)
- **Vercel**: Full-stack option
- **Heroku**: Traditional platform

## 🏗️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with modern features
- **State Management**: React hooks (useState, useCallback)

## 📁 Project Structure

```
src/
├── components/
│   ├── Dial/           # Interactive rotating dial component
│   ├── SpectrumCard/   # Displays concept pairs
│   ├── ScoreBoard/     # Team scores and game status
│   └── GameSetup/      # Welcome screen and rules
├── hooks/              # Custom React hooks for game logic
├── data/               # Spectrum concept pairs database
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🎨 Game Rules

Based on the original Wavelength board game:
- Teams alternate being the active team
- The Psychic can only give clues that relate to the spectrum
- No percentages or numbers allowed in clues
- Both teams have a chance to score on every turn
- Game ends when a team reaches 10 points
