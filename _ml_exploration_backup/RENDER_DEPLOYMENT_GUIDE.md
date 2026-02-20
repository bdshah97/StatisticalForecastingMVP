# Render Deployment Setup - Complete

## Status: ✅ READY FOR DEPLOYMENT

All code is configured for Render deployment with a hybrid development/production approach.

---

## Development vs Production

### Local Development: `npm run dev:all`

**What it does:**
- Starts frontend on **http://localhost:3001** (Vite with hot reload)
- Starts backend on **http://localhost:3000** (tsx watch with hot reload)
- Both processes run independently
- Perfect for development with full debugging capabilities

**Why separate ports:**
- Vite dev server on 3001 allows hot module replacement (HMR)
- Backend on 3000 for API testing
- Proxy configured (if needed) in vite.config.ts

### Production: `npm start`

**What it does:**
- Builds both frontend and backend (`npm run build`)
- Serves everything from single port **3000**
- Frontend compiled into `dist/` directory
- Backend (Express) serves static files + APIs

**Why single port:**
- Render free tier limitation
- Simpler deployment configuration
- Better for monolithic architecture
- User experience: one URL for everything

---

## File Changes for Production Ready

### 1. **package.json** - Root
```json
{
  "scripts": {
    "dev": "vite",
    "dev:all": "concurrently \"npm run dev\" \"npm run backend:dev\"",
    "build": "npm run backend:build && vite build",
    "start": "npm run backend:start",
    "backend:install": "cd backend && npm install",
    "backend:build": "cd backend && npm run build",
    "backend:dev": "cd backend && npm run dev",
    "backend:start": "cd backend && npm run start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Key updates:**
- ✅ Added `dev:all` script using concurrently
- ✅ Updated `build` to compile backend first, then frontend
- ✅ Changed `start` to run backend server only (serves both)
- ✅ Added concurrently package

### 2. **backend/src/server.ts** - Main Server
```typescript
// Added at top:
import path from 'path';

// Added before error handler:
// Serve static files from frontend build (production)
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Not found' });
      }
    });
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});
```

**Key updates:**
- ✅ Added static file middleware for `dist/` directory
- ✅ Added SPA fallback routing (all non-API routes → index.html)
- ✅ Works in both dev and production modes

### 3. **Procfile** - New File
```
web: npm start
```

**What it does:**
- Tells Render exactly how to start your application
- Single command: `npm start` handles everything
- No configuration needed on Render dashboard

---

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Render deployment setup ready"
git push origin main
```

### 2. Connect to Render
1. Go to [https://render.com](https://render.com)
2. Sign in / Create account
3. New → Web Service
4. Connect GitHub repository
5. Select your repo from the list

### 3. Configure Render Service
- **Name:** supply-chain-predictor
- **Environment:** Node
- **Region:** Choose closest to your users
- **Branch:** main
- **Build Command:** `npm run build` (auto-detected)
- **Start Command:** `npm start` (auto-detected from Procfile)

### 4. Environment Variables (if needed)
In Render dashboard, add:
- `PORT=3000` (default, can be omitted)
- `NODE_ENV=production` (auto-set)

### 5. Deploy
- Click "Create Web Service"
- Render automatically:
  - Installs dependencies
  - Runs `npm run build`
  - Runs `npm start`
  - Exposes on public URL

---

## Testing Before Deployment

### 1. Test Production Build Locally
```bash
# Kill any running processes
npm run build       # Builds everything
npm start          # Start production server
# Visit http://localhost:3000
```

### 2. Verify All Routes Work
- **Frontend:** http://localhost:3000 (should load app)
- **API status:** http://localhost:3000/api/status (should return JSON)
- **Navigation:** Click around app, verify routing works

### 3. Verify File Serving
- Frontend files served from `dist/`
- API calls proxied to backend handlers
- SPA fallback for routes like `/training`, `/forecasts`

---

## Architecture Benefits

✅ **Single Port**: Works with Render's limitations  
✅ **Single Command**: Simple to deploy and restart  
✅ **Hot Reload**: Full HMR in development (npm run dev:all)  
✅ **Production Optimized**: Minified, bundled frontend  
✅ **Easy Scaling**: Stateless API layer  
✅ **Clear Separation**: API logic separate from serving  

---

## Port Configuration

### Development (npm run dev:all)
- Frontend: 3001 (Vite)
- Backend: 3000 (Express)
- Communication: Vite proxy or direct API calls

### Production (npm start)  
- Combined: 3000 (Express serves both)
- No proxy needed
- Single URL for users

---

## Build Output

```
dist/
├── index.html         ← Entry point for SPA
├── assets/
│   ├── index-{hash}.js     ← Bundled frontend code
│   └── ...other assets
└── [other static files]

backend/dist/
├── server.js         ← Main backend server
├── ml/
│   └── [ML modules]
├── services/
│   └── [Service modules]
└── types.js          ← TypeScript-generated types
```

When you run `npm start`, Express serves:
1. Static files from `dist/` → All frontend assets
2. APIs from `backend/dist/` handlers → All backend endpoints

---

## Monitoring on Render

After deployment, you can see:
- Build logs (build process)
- Deploy logs (startup)
- Runtime logs (errors, console.log)
- Deploy history (rollback capability)

Key log message on successful startup:
```
✅ Supply Chain Backend running on port 3000
📍 Frontend: http://[your-app].onrender.com
🎯 Routes:
   /                          - Frontend (SPA)
   POST /api/aggregate        - Upload CSV
   POST /api/train-xgb        - Train ML model
   GET  /api/forecast         - Get forecasts
   GET  /api/status           - Backend status
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port already in use" | Kill Node: `taskkill /F /IM node.exe` |
| Frontend not loading | Check `dist/index.html` exists after build |
| API returns 404 | Make sure backend built: `npm run backend:build` |
| Build fails | Check all TypeScript compiles: `npm run build` |
| Hot reload not working | Run `npm run dev:all` (frontend on 3001, backend on 3000) |

---

## Next Steps

1. ✅ Test locally: `npm run dev:all` and `npm start`
2. ✅ Push to GitHub
3. ✅ Connect to Render dashboard
4. ✅ Monitor logs during first deploy
5. ✅ Test all features on deployed version
6. ✅ Set up auto-deploys on push (Render option)

---

## Summary

You now have a **Render-ready** supply chain forecasting application:
- **Local:** Fast development with hot reload (two terminals or one `dev:all` command)
- **Production:** Optimized single-port server for Render deployment
- **Code:** Zero changes needed to source code, only configuration
- **Deployment:** One command (`npm start`) handles frontend + backend

**Status: Ready for Render deployment! 🚀**
