# Deployment Guide

This guide explains how to deploy the Wavelength game so your friends can access it online.

## Quick Deploy Options

### Option 1: Use Railway + Netlify (Recommended)

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

### Option 2: Use Vercel (Frontend + Backend)

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com)
2. **Deploy Full Stack**: Vercel can host both frontend and serverless functions
3. **Configure**: Update the server URL in `src/config.ts`

### Option 3: Use Heroku

1. **Create Heroku Account**: Go to [heroku.com](https://heroku.com)
2. **Deploy Backend**: Deploy `server.cjs` as a Node.js app
3. **Deploy Frontend**: Use Heroku static sites or separate service

## Environment Configuration

### Development
- Server: `http://localhost:3001`
- Client: `http://localhost:5173`

### Production
- Update `src/config.ts` with your deployed server URL
- Update `server.cjs` CORS settings with your deployed frontend URL

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

## Troubleshooting

### CORS Issues
- Make sure server.cjs includes your frontend domain in CORS origins
- Check that both HTTP and HTTPS are handled correctly

### WebSocket Connection Issues
- Ensure your hosting platform supports WebSockets
- Railway and Heroku support WebSockets by default
- Some hosting platforms may require additional configuration

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure Node.js version compatibility (18+ recommended)
- Verify build command works locally first

## Sharing with Friends

Once deployed, just share your frontend URL with friends:
- `https://your-game.netlify.app`
- They can create/join games directly in their browsers
- No downloads or setup required!

## Cost

Most hosting options have generous free tiers:
- **Netlify**: Free for personal projects
- **Railway**: $5/month for hobby plan (free trial available)
- **Vercel**: Free for personal projects
- **Heroku**: Free tier discontinued, $7/month minimum

## Updating the Game

To update the deployed game:
1. Make changes to your code
2. Push to GitHub
3. Hosting platforms will automatically redeploy
4. Changes will be live within minutes