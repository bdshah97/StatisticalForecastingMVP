# Render Deployment Checklist

## Pre-Deployment Testing (Local)

- [ ] **Kill all processes**
  ```bash
  taskkill /F /IM node.exe  # Windows
  killall node               # Mac/Linux
  ```

- [ ] **Test development mode**
  ```bash
  npm run dev:all
  # Verify:
  # - Frontend loads at http://localhost:3001
  # - Backend running on port 3000
  # - Both show console output
  ```

- [ ] **Test production build**
  ```bash
  npm run build
  # Verify:
  # - No compilation errors
  # - backend/dist/ created
  # - dist/index.html created
  # - dist/assets/ contains JS/CSS files
  ```

- [ ] **Test production server**
  ```bash
  npm start
  # Verify:
  # - Server starts on port 3000
  # - Visit http://localhost:3000 → app loads
  # - Visit http://localhost:3000/api/status → JSON response
  # - Click around app → routing works
  ```

- [ ] **Test data flow**
  - [ ] Upload CSV file → aggregates
  - [ ] Select SKUs → shows data
  - [ ] Train model → trains and reports
  - [ ] Generate forecasts → shows results

---

## Code Cleanup

- [ ] **Remove temporary files**
  - [ ] Test files (testClaude.js, test-forecast.ts if not needed)
  - [ ] Backup CSVs (keep only sample data)
  - [ ] Debug console.logs (use logging library if needed)

- [ ] **Update README.md**
  - [ ] Add deployment instructions
  - [ ] Add feature list
  - [ ] Add API endpoint documentation

- [ ] **Verify environment variables**
  - [ ] Check .env is in .gitignore
  - [ ] Document required env vars for Render:
    - GEMINI_API_KEY (optional - for AI features)

- [ ] **Check package.json versions**
  - [ ] All dependencies specified
  - [ ] No conflicting versions
  - [ ] concurrently added ✅

---

## GitHub Preparation

- [ ] **Review files to commit**
  ```bash
  git status
  ```

- [ ] **Create/update .gitignore**
  ```
  node_modules/
  dist/
  backend/dist/
  .env
  .env.local
  *.log
  ```

- [ ] **Commit changes**
  ```bash
  git add .
  git commit -m "Render deployment setup - production ready"
  ```

- [ ] **Push to GitHub**
  ```bash
  git push origin main
  ```

- [ ] **Verify on GitHub**
  - [ ] All files present
  - [ ] Procfile visible
  - [ ] package.json shows new scripts

---

## Render Setup

- [ ] **Create Render account** (if needed)
  - Go to https://render.com
  - Sign up with GitHub

- [ ] **Create Web Service**
  - Dashboard → New → Web Service
  - Connect GitHub account
  - Select repository

- [ ] **Service Configuration**
  - [ ] **Name:** supply-chain-predictor (or your choice)
  - [ ] **Environment:** Node
  - [ ] **Region:** (closest to users or default)
  - [ ] **Branch:** main
  - [ ] **Build Command:** (auto-detected: `npm run build`)
  - [ ] **Start Command:** (auto-detected: `npm start`)
  - [ ] **Plan:** Free tier (or upgrade if needed)

- [ ] **Environment Variables**
  - [ ] `NODE_ENV`: production (auto-set)
  - [ ] `GEMINI_API_KEY`: (paste your key if using AI)
  - [ ] Any other API keys needed

- [ ] **Deploy**
  - [ ] Click "Create Web Service"
  - [ ] Watch deploy logs
  - [ ] Wait for "Live" status

---

## Post-Deployment Verification

Once deployed on Render:

- [ ] **Check deploy logs**
  - [ ] No build errors
  - [ ] `npm run build` completed
  - [ ] `npm start` shows startup message
  - [ ] `✅ Supply Chain Backend running on port 3000`

- [ ] **Test public URL**
  - [ ] Render gives you: https://[your-app].onrender.com
  - [ ] Visit that URL → app loads
  - [ ] Check API: https://[your-app].onrender.com/api/status

- [ ] **Test full workflow**
  - [ ] Upload CSV
  - [ ] Select SKUs
  - [ ] Train model
  - [ ] Generate forecast
  - [ ] View results

- [ ] **Check performance**
  - [ ] App loads reasonably fast
  - [ ] API responses under 5 seconds
  - [ ] No console errors (DevTools → Console)

- [ ] **Monitor logs**
  - [ ] Render dashboard → Logs tab
  - [ ] No critical errors
  - [ ] Response times acceptable

---

## Common Issues & Solutions

### Build Fails
**Error:** "npm ERR! code EWORKDIR"
- Solution: Check all files are committed and pushed
- Check backend/package.json exists and has correct scripts

### Port Already in Use
**Error:** "listen EADDRINUSE: address already in use :::3000"
- Solution: Kill existing Node processes
- Windows: `taskkill /F /IM node.exe`
- Render: Restart dyno from dashboard

### Frontend Not Serving
**Error:** White screen or 404 on root path
- Check: `dist/index.html` exists after build
- Check: `backend/src/server.ts` has static middleware
- Check: Express routes are correct

### API Returns 404
**Error:** `/api/status` returns "Not found"
- Check: Backend compiled to `backend/dist/`
- Check: `npm run backend:build` succeeded
- Check: API routes defined in server.ts

### Environment Variables Not Found
**Error:** "Cannot find GEMINI_API_KEY"
- Add to Render dashboard → Environment
- Reload application
- Render → Logs should show vars loaded

---

## Optimization Options

Once deployed and working:

- [ ] **Enable auto-deploys**
  - Render → Settings → Auto-Deploy
  - Deploy when pushing to main

- [ ] **Set up monitoring**
  - Render → Analytics tab
  - Track uptime and errors

- [ ] **Upgrade from free tier** (when needed)
  - More reliable uptime
  - Better performance
  - Custom domain support

- [ ] **Add CI/CD checks**
  - GitHub Actions to test before Render
  - Ensure build succeeds before deploy

---

## Rollback Plan

If deployment breaks:

- [ ] **Recent commits available?**
  - `git log` to see history

- [ ] **Rollback on Render**
  - Dashboard → Deploys tab
  - Select previous successful deploy
  - Click "Redeploy"

- [ ] **Local testing before redeploying**
  - `npm run build && npm start`
  - Verify locally first

---

## Post-Deployment Maintenance

- [ ] **Monitor dashboard regularly**
  - Check for errors in logs
  - Watch resource usage

- [ ] **Update dependencies** (monthly)
  ```bash
  npm update
  npm audit
  ```

- [ ] **Test full workflow** (weekly)
  - Upload CSV → forecast → verify

- [ ] **Backup important data**
  - Export results regularly
  - Version control CSVs

---

## Documentation for Users

Create a user guide with:
- How to upload CSV
- Expected date formats
- How to train models
- How to generate forecasts
- How to interpret results
- Support contact

---

## Deployment Summary

**You're ready to deploy when:**
- ✅ `npm run build` completes without errors
- ✅ `npm start` runs on http://localhost:3000
- ✅ All features work locally
- ✅ All files committed and pushed to GitHub
- ✅ Procfile created
- ✅ Render service configured

**After deployment:**
- ✅ App accessible at public URL
- ✅ All APIs respond
- ✅ Full workflow tested
- ✅ Logs monitored for errors

---

**Status: Ready for Render deployment! 🚀**

Next step: Push to GitHub and connect Render dashboard.
