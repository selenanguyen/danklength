# ⚡ Quick Deploy Checklist

## 🎯 Goal
Deploy backend to **Render** + frontend to **Vercel** in ~10 minutes

---

## 📋 Checklist

### Before You Start
- [ ] Code pushed to GitHub
- [ ] Render account created (render.com)
- [ ] Vercel account created (vercel.com)

### Backend (Render) - 5 min
- [ ] Create new Web Service
- [ ] Connect GitHub repo
- [ ] Set: `npm install` (build) + `npm start` (start)
- [ ] Deploy and copy URL: `https://YOUR-APP.onrender.com`
- [ ] Test: Visit `/health` endpoint

### Frontend (Vercel) - 5 min
- [ ] Import GitHub repo
- [ ] Add env var: `VITE_SERVER_URL` = your Render URL
- [ ] Deploy
- [ ] Copy URL: `https://YOUR-APP.vercel.app`
- [ ] Test: Create and join a game

### Verify
- [ ] Health endpoint returns JSON
- [ ] Can create a game
- [ ] Can join from another device
- [ ] Socket.IO connects (check browser console)

---

## 🔧 Quick Commands

```bash
# Test build locally before deploying
npm run build

# Run tests
npm run test

# Local development
npm run dev:server  # Terminal 1
npm run dev        # Terminal 2
```

---

## 🆘 Quick Fixes

**Can't connect to backend?**
→ Check `VITE_SERVER_URL` in Vercel settings
→ Wait 60s for Render free tier to wake up
→ Visit `/health` endpoint to verify backend

**Build fails?**
→ Run `npm run build` locally first
→ Fix any TypeScript errors
→ Check all dependencies are installed

**Socket.IO errors?**
→ Check browser console (F12)
→ Verify CORS in `server.cjs` includes Vercel domain
→ Ensure both services are deployed

---

## 📚 Full Docs

- **Step-by-Step**: `RENDER_VERCEL_SETUP.md`
- **Comprehensive Guide**: `DEPLOYMENT.md`
- **Troubleshooting**: `DEPLOYMENT.md` → Troubleshooting section

---

## 💰 Costs

**Free Tier (Start Here):**
- Render: Free (spins down after 15min)
- Vercel: Free (unlimited)
- **Total: $0/month**

**Recommended Production:**
- Render Starter: $7/month (always-on)
- Vercel: Free
- **Total: $7/month**

---

## 🎉 Done!

Share your Vercel URL with friends and start playing!

Example: `https://danklength.vercel.app`

No downloads, no setup - just browser-based multiplayer fun! 🎮
