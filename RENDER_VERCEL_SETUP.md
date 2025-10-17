# Quick Setup Guide: Render + Vercel

This is a quick-start guide for deploying to Render (backend) and Vercel (frontend).

## Prerequisites

✅ GitHub account
✅ Code pushed to GitHub repository
✅ Render account (https://render.com)
✅ Vercel account (https://vercel.com)

---

## Step 1: Deploy Backend to Render (5 minutes)

1. **Go to Render Dashboard**
   - Visit: https://render.com/dashboard
   - Click **New +** → **Web Service**

2. **Connect Repository**
   - Select your GitHub repository
   - Grant access if needed

3. **Configure Service**
   ```
   Name:          danklength-server (or your choice)
   Environment:   Node
   Build Command: npm install
   Start Command: npm start
   Plan:          Free (or Starter for $7/mo)
   ```

4. **Deploy**
   - Click **Create Web Service**
   - Wait 2-3 minutes for deployment

5. **Copy Your URL**
   - You'll get: `https://danklength-server.onrender.com`
   - **SAVE THIS URL** - you need it for Step 2!

6. **Verify It Works**
   - Visit: `https://YOUR-RENDER-URL.onrender.com/health`
   - Should see: `{"status":"healthy",...}`

---

## Step 2: Deploy Frontend to Vercel (5 minutes)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click **Add New** → **Project**

2. **Import Repository**
   - Select your GitHub repository
   - Click **Import**

3. **Configure Project**
   - Framework: **Vite** (auto-detected)
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `dist` (auto-filled)

4. **Add Environment Variable**
   - Click **Environment Variables**
   - Add variable:
     ```
     Name:  VITE_SERVER_URL
     Value: https://YOUR-RENDER-URL.onrender.com
     ```
   - Select all environments (Production, Preview, Development)

5. **Deploy**
   - Click **Deploy**
   - Wait 1-2 minutes for build

6. **Get Your URL**
   - You'll get: `https://danklength.vercel.app`
   - This is your game URL!

---

## Step 3: Test It Out

1. **Visit your Vercel URL**
   - Example: `https://danklength.vercel.app`

2. **Create a game**
   - Click "Host Game"
   - Enter your name
   - Note the 4-character game code

3. **Join from another device**
   - Open the same Vercel URL on your phone or another browser
   - Click "Join Game"
   - Enter the game code
   - Test multiplayer features!

---

## Troubleshooting

### "Connection failed" error

**Problem:** Frontend can't reach backend

**Solutions:**
1. Check `VITE_SERVER_URL` in Vercel dashboard → Project → Settings → Environment Variables
2. Verify backend is running: visit `https://YOUR-RENDER-URL.onrender.com/health`
3. Render free tier spins down after 15min - first request takes 30-60s to wake up
4. Check browser console (F12) for detailed error messages

### Backend URL not updating

**Problem:** Changed `VITE_SERVER_URL` but still using old URL

**Solution:**
1. Go to Vercel dashboard
2. Select your project
3. Go to **Deployments**
4. Click **Redeploy** on the latest deployment
5. Environment variables only update on rebuild

### Socket.IO connection issues

**Problem:** WebSocket connection refused

**Solutions:**
1. Verify CORS is configured correctly (already done in `server.cjs`)
2. Check browser Network tab → WS for WebSocket errors
3. Ensure backend health endpoint is accessible
4. Both Render and Vercel support WebSockets by default

---

## Next Steps

### Share with Friends

Just send them your Vercel URL:
```
https://danklength.vercel.app
```

No setup needed - they can play directly in their browser!

### Upgrade for Better Performance

**Render Free Tier Limitations:**
- Spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds

**Upgrade to Render Starter ($7/mo) for:**
- Always-on service (no spin-down)
- Faster response times
- Better for active multiplayer games

### Custom Domain (Optional)

**Vercel:**
1. Go to Project → Settings → Domains
2. Add your custom domain (e.g., `danklength.com`)
3. Follow DNS configuration instructions

**Render:**
1. Go to your service → Settings
2. Add custom domain
3. Update DNS records as instructed

### Monitor Your App

**Render:**
- View logs: Dashboard → Your Service → Logs
- Check metrics: Dashboard → Your Service → Metrics

**Vercel:**
- View logs: Project → Deployments → [Select] → Logs
- Analytics: Available on Pro plan ($20/mo)

---

## Local Development

To run locally while deployed:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev
```

Frontend will use `http://localhost:3001` automatically in dev mode.

---

## Cost Summary

### Free Tier (Getting Started)
- **Render**: Free, 750 hours/month, spins down after 15min
- **Vercel**: Free, unlimited deployments, 100GB bandwidth/month
- **Total**: $0/month

### Recommended Production Setup
- **Render Starter**: $7/month (always-on backend)
- **Vercel Free**: $0/month (frontend)
- **Total**: $7/month

### Full Production (High Traffic)
- **Render Standard**: $25/month
- **Vercel Pro**: $20/month
- **Total**: $45/month

---

## Files Created/Modified

This setup created/modified these files:

- ✅ `render.yaml` - Render deployment configuration
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `src/config.ts` - Updated to use environment variable
- ✅ `server.cjs` - Updated CORS for Vercel domains
- ✅ `.env.example` - Example environment variables
- ✅ `DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ `RENDER_VERCEL_SETUP.md` - This quick-start guide

---

## Auto-Deployment

Both platforms support automatic deployments:

**Render:**
- Automatically redeploys when you push to `master` branch
- Can configure branch in Render dashboard

**Vercel:**
- Automatically deploys every push to any branch
- `master` branch → Production
- Other branches → Preview deployments

To update your app:
```bash
git add .
git commit -m "Update game"
git push origin master
```

Both services will automatically rebuild and deploy within 1-3 minutes!

---

## Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Issues**: Check `DEPLOYMENT.md` for detailed troubleshooting

---

## Summary Checklist

After following this guide, you should have:

- ✅ Backend deployed to Render
- ✅ Frontend deployed to Vercel
- ✅ Environment variable configured
- ✅ Game accessible via public URL
- ✅ Multiplayer functionality working
- ✅ Auto-deployment enabled

**You're ready to play!** 🎉
