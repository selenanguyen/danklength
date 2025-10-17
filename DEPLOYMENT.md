# Deployment Guide: Render + Vercel

This guide explains how to deploy the Wavelength game with the backend on Render and frontend on Vercel.

## Architecture Overview

- **Backend (Render)**: Node.js/Express server with Socket.IO for real-time multiplayer
- **Frontend (Vercel)**: React + Vite SPA with Socket.IO client

## Prerequisites

- GitHub account with this repository
- Render account (https://render.com)
- Vercel account (https://vercel.com)

---

## Part 1: Deploy Backend to Render

### Step 1: Create a Render Web Service

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `danklength-server` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 2: Note Your Render URL

After deployment, Render will assign you a URL like:
```
https://danklength-server.onrender.com
```

**Save this URL** - you'll need it for the frontend configuration.

### Step 3: Verify Backend is Running

Test your backend by visiting:
```
https://your-render-app.onrender.com/health
```

You should see: `{"status":"healthy","timestamp":"...","activeRooms":0}`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Set Environment Variable

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Before deploying, go to **Environment Variables**
5. Add:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: Your Render URL (e.g., `https://danklength-server.onrender.com`)
   - **Environments**: Check all (Production, Preview, Development)
6. Click **Deploy**

**Option B: Update config.ts**

Edit `src/config.ts` and replace the placeholder:
```typescript
serverUrl: import.meta.env.VITE_SERVER_URL || (
  import.meta.env.PROD
    ? 'https://danklength-server.onrender.com'  // Your actual Render URL
    : 'http://localhost:3001'
),
```

### Step 2: Deploy

1. Vercel will auto-detect Vite configuration
2. Click **Deploy**
3. Wait for deployment to complete

### Step 3: Test Your Deployment

Visit your Vercel URL (e.g., `https://danklength.vercel.app`)
- Create a game
- Open in another browser/device
- Join with the game code
- Test multiplayer functionality

---

## Quick Deploy Options (Alternative)

### Option 1: Railway + Netlify

#### Deploy the Server (Railway)

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Deploy from GitHub**:
   - Push your code to GitHub
   - Connect Railway to your GitHub repo
   - Railway will automatically detect and deploy the server
3. **Get Server URL**: Copy your Railway app URL (e.g., `https://wavelength-game-server.railway.app`)

#### Deploy the Frontend (Netlify)

1. **Create Netlify Account**: Go to [netlify.com](https://netlify.com) and sign up
2. **Deploy from GitHub**:
   - Connect Netlify to your GitHub repo
   - Netlify will automatically build and deploy from the `dist` folder
3. **Update Config**: Update `src/config.ts` with your Railway server URL
4. **Get Website URL**: Your site will be available at something like `https://wavelength-game.netlify.app`

---

## Configuration

### Environment Variables

#### Frontend (Vercel)
- `VITE_SERVER_URL`: Backend server URL (e.g., `https://danklength-server.onrender.com`)

#### Backend (Render)
- `NODE_ENV`: Automatically set to `production`
- `PORT`: Automatically assigned by Render

### CORS Configuration

The backend (`server.cjs`) is pre-configured to accept connections from:
- `localhost:5173` (local Vite dev)
- `localhost:3000` (alternative local port)
- `*.vercel.app` (all Vercel deployments)
- `*.netlify.app` (Netlify deployments)

To restrict to specific domains, edit `server.cjs:124-129`

## Build Commands

```bash
# Build frontend
npm run build

# Start server
npm start

# Development
npm run dev        # Frontend
npm run dev:server # Backend
```

## Required Environment Variables

### Server (Railway/Heroku)
- `PORT`: Automatically set by hosting platform
- `NODE_ENV`: Set to "production"

### Frontend (Netlify/Vercel)
- `VITE_SERVER_URL`: Your deployed server URL (optional, uses config.ts)

## Testing Deployment

1. **Test Server**: Visit your server URL (should show JSON with game info)
2. **Test Frontend**: Visit your frontend URL
3. **Test Multiplayer**: 
   - Create a game
   - Open another browser/device
   - Join the game with the code

---

## Troubleshooting

### Frontend can't connect to backend

**Symptoms:**
- "Connection failed" errors
- Game won't start
- Socket.IO errors in browser console

**Solutions:**
1. Verify `VITE_SERVER_URL` is set correctly in Vercel
2. Test backend health: `https://your-render-app.onrender.com/health`
3. Check browser console for CORS errors
4. Render free tier spins down after 15min - first request may take 30-60s

### Socket.IO connection fails

**Symptoms:**
- WebSocket connection refused
- 403/404 errors on Socket.IO endpoints

**Solutions:**
1. Check browser dev tools → Network tab → WS (WebSocket)
2. Verify CORS configuration in `server.cjs:119-152`
3. Ensure backend is accessible at health endpoint
4. Both Render and Vercel support WebSockets by default

### Build fails on Vercel

**Symptoms:**
- Deployment fails with build errors
- TypeScript compilation errors

**Solutions:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint

# Verify all dependencies are installed
npm install
```

### Render service spinning down

**Symptoms:**
- First request after inactivity takes 30-60 seconds
- "Service unavailable" errors

**Solutions:**
1. Upgrade to Render paid plan ($7/mo) for always-on service
2. Use UptimeRobot or similar to ping `/health` every 10 minutes
3. Accept the spin-down time for free tier usage

### CORS Issues
- Ensure `server.cjs` includes your Vercel domain in allowed origins
- Check that both HTTP and HTTPS are handled correctly
- Verify origin headers are being sent from client

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure Node.js version compatibility (18+ recommended)
- Verify build command works locally first

## Sharing with Friends

Once deployed, just share your frontend URL with friends:
- `https://your-game.netlify.app`
- They can create/join games directly in their browsers
- No downloads or setup required!

---

## Cost Comparison

### Recommended: Render + Vercel

**Render (Backend):**
- Free tier: 750 hours/month, spins down after 15min inactivity
- Starter: $7/month for always-on service
- Standard: $25/month for more resources

**Vercel (Frontend):**
- Free: Unlimited deployments, 100GB bandwidth/month
- Pro: $20/month (includes analytics and more)

### Alternatives

**Railway + Netlify:**
- Railway: $5/month hobby plan (free trial available)
- Netlify: Free for personal projects

**All-in-One Options:**
- **Heroku**: Free tier discontinued, $7/month minimum
- **Render Static Site**: Deploy both frontend and backend on Render

## Updating the Game

To update the deployed game:
1. Make changes to your code
2. Push to GitHub
3. Hosting platforms will automatically redeploy
4. Changes will be live within minutes