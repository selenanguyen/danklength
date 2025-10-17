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
- ngrok account (free) for hosting games

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd /Users/selenanguyen/dev/wavelength/wavelength-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### 🎮 Hosting Games for Friends

**One-Command Server Setup** (Recommended):
```bash
./start-server.sh
```

This script automatically:
- Starts your local game server
- Creates an ngrok tunnel for remote access
- Updates the website configuration
- Builds and deploys the website
- Provides you with all the URLs

**What you'll see:**
```
🎉 Setup Complete!
================================
🌐 Website: https://danklength.netlify.app
🔗 Ngrok URL: https://abc123.ngrok-free.app
⏰ Deploy triggered at: 2025-05-31 18:30:25 UTC
📡 Check deploy status: https://app.netlify.com/sites/danklength/deploys

🎮 Your friends can now play at: https://danklength.netlify.app
Press Ctrl+C to stop all services
```

**Share the website URL** with friends and start playing!

### 🔧 Troubleshooting

**If the script fails:**
1. Make sure you have ngrok configured: `ngrok config add-authtoken YOUR_TOKEN`
2. Check if ports 3001 or 4040 are already in use
3. Ensure you have git configured and the repository is set up

**If friends can't connect:**
1. Check that ngrok is still running (script should show "Press Ctrl+C to stop")
2. Verify the website deployed: Check the Netlify deploy status URL shown by the script
3. Test your server: Run `curl YOUR_NGROK_URL/health` (URL from script output)
4. Wait 1-2 minutes after deployment for changes to take effect

**Each time you restart:**
- The ngrok URL changes, so you need to run the script again
- The website will automatically update with the new server URL

### 🏠 Local Development Only

**For Local Play Only:**
```bash
npm run dev
```
Then open: http://localhost:5173/

**For Local Multiplayer Development:**

Terminal 1 - Start the server:
```bash
npm run dev:server
```

Terminal 2 - Start the client:
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

### ⚡ Quick Deploy (Recommended)

**Render + Vercel** - Deploy in ~10 minutes:

1. **Backend to Render** (free tier)
   - Create Web Service from GitHub
   - Auto-deploys on push to master

2. **Frontend to Vercel** (free tier)
   - Import GitHub repository
   - Set `VITE_SERVER_URL` environment variable
   - Auto-deploys on every commit

**See:** [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for step-by-step checklist

### 📚 Documentation

- **Quick Start**: [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - 10-minute setup guide
- **Detailed Guide**: [RENDER_VERCEL_SETUP.md](./RENDER_VERCEL_SETUP.md) - Step-by-step with screenshots
- **Full Reference**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive troubleshooting

### Hosting Options

| Platform | Backend | Frontend | Cost | Setup Time |
|----------|---------|----------|------|------------|
| **Render + Vercel** | ✅ | ✅ | Free* | ~10 min |
| Railway + Netlify | ✅ | ✅ | $5/mo | ~15 min |
| Vercel (Full-stack) | ✅ | ✅ | Free | ~10 min |
| Render (Both) | ✅ | ✅ | Free* | ~10 min |

\* Free tier has limitations (backend spins down after 15min inactivity)

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
