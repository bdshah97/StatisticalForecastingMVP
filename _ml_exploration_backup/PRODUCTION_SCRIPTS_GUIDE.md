# Production Build & Start Scripts

## Overview

The project is configured with npm scripts that handle both development and production modes seamlessly.

---

## Script Definitions

### `npm run dev`
**Frontend only, development mode**
- Starts Vite dev server on port 3001
- Full hot module reload (HMR)
- Watches for TypeScript/React changes
- Development-optimized build

### `npm run dev:all`
**Frontend + Backend, development mode**
- Runs frontend (`npm run dev`) on port 3001
- Runs backend (`npm run backend:dev`) on port 3000
- Both with live reload
- Perfect for feature development
- **Use this for local development**

### `npm run build`
**Build both frontend and backend for production**
- Runs `npm run backend:build` first
  - TypeScript → JavaScript compilation
  - Outputs to `backend/dist/`
- Then runs `vite build`
  - Minifies frontend code
  - Outputs to `dist/`
- Total output ready for production

### `npm run start`
**Start production server**
- Runs `npm run backend:start`
- Starts `node backend/dist/server.js`
- Serves static frontend from `dist/`
- Serves APIs from backend handlers
- **Use this for production (after `npm run build`)**
- Runs on port 3000 only

---

## Backend Scripts

Located in `backend/package.json`:

### `npm run dev`
```bash
tsx watch src/server.ts
```
- Uses tsx for TypeScript runtime with auto-reload
- Watches for file changes
- Restarts server automatically
- Runs on port 3000

### `npm run build`
```bash
tsc
```
- Compiles TypeScript to JavaScript
- Outputs to `backend/dist/`
- No bundling (uses ES modules)

### `npm run start`
```bash
node backend/dist/server.js
```
- Runs compiled backend
- No TypeScript needed (already compiled)
- Fast startup
- Runs on port 3000

---

## Complete Workflow

### 1. Local Development
```bash
npm run dev:all
# Opens http://localhost:3001 (frontend)
# Backend APIs on http://localhost:3000
```

### 2. Production Build
```bash
npm run build
# Compiles everything
# Creates:
#   - backend/dist/ (compiled backend)
#   - dist/          (built frontend)
```

### 3. Production Run
```bash
npm run start
# Starts server on port 3000
# Serves everything from single URL
```

### 4. Testing Production Locally
```bash
npm run build && npm start
# Same as production on Render
# Verify before deploying
```

---

## Environment-Specific Behavior

### Development (`npm run dev:all`)

**Frontend (port 3001):**
- Source TypeScript/React
- Hot reload on changes
- Source maps for debugging
- Unminified code

**Backend (port 3000):**
- Source TypeScript
- Auto-reload on changes (tsx watch)
- Error stack traces
- Direct execution with ts-node equivalent

### Production (`npm start`)

**Combined (port 3000):**
- Compiled JavaScript only
- Minified frontend
- No source maps (smaller)
- Fast startup
- Express serves static + APIs

---

## File Structure After Build

```
Project Root
├── backend/
│   ├── dist/                    ← Compiled backend
│   │   ├── server.js           ← Entry point
│   │   ├── ml/                 ← ML modules
│   │   ├── services/           ← Backend services
│   │   └── types.js
│   ├── src/                    ← Source (not used in production)
│   ├── package.json
│   └── tsconfig.json
│
├── dist/                        ← Compiled frontend
│   ├── index.html              ← SPA entry point
│   ├── assets/
│   │   ├── index-{hash}.js     ← Bundled React app
│   │   ├── index.css           ← Styles
│   │   └── ...other assets
│   └── ...other static files
│
├── src/                        ← Frontend source (not used in production)
├── node_modules/               ← Dependencies
├── package.json
├── vite.config.ts
├── Procfile                    ← Render instruction
└── [other config files]
```

When `npm start` runs:
1. Loads `backend/dist/server.js`
2. Express starts on port 3000
3. Serves static files from `dist/` at `/`
4. Routes API calls to backend handlers at `/api/*`

---

## Port Assignment

| Mode | Frontend | Backend | Note |
|------|----------|---------|------|
| `npm run dev` | 3001 | - | Frontend only |
| `npm run dev:all` | 3001 | 3000 | Separate ports |
| `npm run backend:dev` | - | 3000 | Backend only |
| `npm run start` | 3000 | 3000 | Combined (production) |

---

## Important Notes

### Do NOT use in production:
- ❌ `npm run dev` - Vite server is for development only
- ❌ `npm run dev:all` - Both run in watch mode, not optimized
- ❌ `npm run backend:dev` - tsx watch uses more resources

### DO use in production:
- ✅ `npm run build` - Creates optimized bundles
- ✅ `npm run start` - Runs compiled code efficiently

---

## Debugging

### Development
```bash
npm run dev:all
# Check frontend at http://localhost:3001 (DevTools available)
# Check backend at http://localhost:3000/api/status
```

### Production Build
```bash
npm run build
npm start
# Visit http://localhost:3000
# Check http://localhost:3000/api/status
```

### Common Issues

**"Port 3000 already in use"**
```bash
# On Windows:
taskkill /F /IM node.exe

# On Mac/Linux:
killall node
```

**"Backend not starting"**
```bash
npm run backend:build  # Ensure compilation succeeded
npm run backend:start  # Run compiled version directly
```

**"Frontend not loading"**
```bash
npm run build  # Ensure dist/ is created
npm start      # Check if static file serving works
```

---

## Summary

| Task | Command |
|------|---------|
| **Local development** | `npm run dev:all` |
| **Production build** | `npm run build` |
| **Production server** | `npm start` |
| **Test production locally** | `npm run build && npm start` |
| **Deploy to Render** | Push to GitHub, Render auto-runs `npm run build` + `npm start` |

Everything is configured and ready! 🚀
