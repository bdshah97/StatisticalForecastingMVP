# Deployment Guide

## 🎯 Local Development (Current - Recommended for ML)

### Quick Start

```bash
# Terminal 1: Start Backend
cd backend
npm install
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Start Frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Pros:**
- Full system resources (RAM, CPU)
- XGBoost training works (30-120 seconds)
- Instant development feedback
- Full debugging capabilities
- No network overhead

**Cons:**
- Not accessible from other machines
- Requires Node.js + npm
- Manual process to start

**Best For:**
- Development
- Testing
- Learning
- Proof of concept

---

## 🐳 Docker Compose (Local Containerized)

### Setup

```bash
docker-compose up
```

This runs:
- Frontend on http://localhost:5173
- Backend on http://localhost:3000

### Files

**docker-compose.yml** - Orchestrates both services
**backend/Dockerfile** - Backend container image

### Pros:
- Simulates production environment
- Easy to share/reproduce
- Can test deployment locally

### Cons:
- Docker Desktop required
- Slightly slower than native
- Docker resource limits

---

## ☁️ Deployment Options

### Option 1: Render (Simple, Free)

**Cost:** Free tier (512 MB RAM, 0.5 vCPU)
**Best For:** Demo, small datasets, no ML training

#### Setup Frontend Only

1. Create repo on GitHub
2. Connect to Render
3. Build command: `npm run build`
4. Start command: `npm run start`

#### Backend (Statistical Only)

If deploying backend:
- Remove XGBoost training endpoint
- Use only statistical methods (HW, Prophet, ARIMA, Linear)
- Keep model sizes small
- Use pre-trained models loaded from URL

```typescript
// In backend for Render:
export const trainXGBModel = async () => {
  // Disabled on Render - use pre-trained only
  console.log('XGBoost training not available on Render free tier');
  return null;
};
```

#### environment.yml for Render

```yaml
FRONTEND_URL: https://your-app.onrender.com
NODE_ENV: production
```

---

### Option 2: Vercel (Frontend Only, Fast)

**Cost:** Free tier includes
**Best For:** Frontend deployment with backend elsewhere

#### Setup

1. Create repo on GitHub
2. Import to Vercel
3. Auto-detects framework (Vite/React)
4. Set environment variables:
   ```
   VITE_API_URL=https://your-backend-api.com
   VITE_USE_BACKEND=true
   ```

#### Vercel.json

```json
{
  "build": {
    "env": {
      "VITE_API_URL": "@api_url",
      "VITE_USE_BACKEND": "true"
    }
  }
}
```

**Pros:**
- Fastest deployment
- Free tier generous
- Automatic deployments on git push
- Global CDN

**Cons:**
- Frontend only
- Need separate backend

---

### Option 3: Railway (Full Stack, Affordable)

**Cost:** $5/month credit, then pay-as-you-go
**Best For:** Full ML pipeline with resources

#### Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to github repo
railway link

# Deploy
railway up
```

#### railway.json

```json
{
  "buildPacks": [
    "nixpacks"
  ],
  "build": {
    "builder": "nixpacks"
  }
}
```

**Pros:**
- Good pricing
- Supports full stack
- Good resource allocation
- Easy deployments

**Cons:**
- Smaller community than Heroku
- Paid tier required for production

---

### Option 4: DigitalOcean (Self-Hosted, Full Control)

**Cost:** $4-6/month (App Platform) or $5+/month (Droplet)
**Best For:** Production system with full ML

#### Using DigitalOcean App Platform

1. Push code to GitHub
2. Create app on DigitalOcean
3. Connect GitHub repo
4. Configure services:

```yaml
# app.yaml
name: supply-chain-forecaster

services:
  - name: backend
    github:
      repo: username/supply-chain-repo
      branch: main
    build_command: cd backend && npm run build
    run_command: cd backend && npm run start
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "3000"
    http_port: 3000

  - name: frontend
    github:
      repo: username/supply-chain-repo
      branch: main
    build_command: npm run build
    run_command: npm run start
    http_port: 5173
    routes:
      - path: /
```

5. Deploy

**Pros:**
- Full control
- Reliable uptime
- Good documentation
- Auto-scaling available
- Can add database (PostgreSQL, MongoDB)

**Cons:**
- Requires DevOps knowledge
- More expensive than Render
- Need to manage infrastructure

---

### Option 5: AWS (Enterprise, Scalable)

**Cost:** $50+/month
**Best For:** Large-scale production

#### Using Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

**Pros:**
- Unlimited scalability
- Auto-scaling
- Global infrastructure
- Enterprise support

**Cons:**
- Steep learning curve
- Complex configuration
- Expensive
- Overkill for small projects

---

## 📊 Comparison Table

| Platform | Cost | Resources | ML Support | Ease | Best For |
|----------|------|-----------|-----------|------|----------|
| Local Dev | Free | Full | ✅ Full | Easy | Development |
| Docker | Free | System | ✅ Full | Medium | Testing |
| Render | Free | 512MB RAM | ❌ No training | Very Easy | Demo |
| Vercel | Free | - | - | Very Easy | Frontend only |
| Railway | $5+/mo | 512MB | ✅ Limited | Easy | MVP |
| DigitalOcean | $4-6/mo | 1GB+ | ✅ Full | Medium | Production |
| AWS | $50+/mo | Unlimited | ✅ Full | Hard | Enterprise |

---

## 🚀 Recommended Setup Progression

### Phase 1: Development
- Use **Local** (npm run dev)
- Train XGBoost locally
- Full system resources
- Fast feedback loop

### Phase 2: Demo/MVP
- Deploy **Frontend to Vercel** (free, fast)
- Deploy **Backend to Railway** ($5/mo)
- Full ML capabilities
- Shareable URL

### Phase 3: Production
- Keep **Frontend on Vercel** or **CDN**
- Move **Backend to DigitalOcean App Platform** or **AWS**
- Add database (PostgreSQL/MongoDB)
- Add monitoring and logging
- Set up CI/CD pipelines

---

## 🔐 Environment Variables

### Frontend (.env.production)

```env
VITE_API_URL=https://api.yourdomain.com
VITE_USE_BACKEND=true
```

### Backend (.env.production)

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
ML_MODEL_PATH=/tmp/models/xgboost-model.json
```

---

## 🛠️ CI/CD Pipeline

### GitHub Actions (Free)

**.github/workflows/deploy.yml**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install && cd backend && npm install
      
      - name: Build
        run: npm run build && cd backend && npm run build
      
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl https://api.render.com/deploy/svc/${{ secrets.RENDER_SERVICE_ID }}?key=${{ secrets.RENDER_API_KEY }} \
            -H "Content-Type: application/json" \
            -X POST
```

---

## 📈 Scaling Considerations

### When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response time | >2 seconds | Add caching |
| Memory usage | >80% | Add more RAM or split services |
| CPU usage | >80% | Add more vCPUs or optimize |
| Requests/sec | >100 | Add load balancer |
| Data size | >1GB | Add database |

### Optimization Strategies

1. **Caching**
   - Cache aggregated data
   - Cache trained models
   - Use Redis for session data

2. **Database**
   - PostgreSQL for raw data
   - MongoDB for flexibility
   - Cache layer (Redis)

3. **Load Balancing**
   - AWS ALB or NGINX
   - Round-robin across instances

4. **Model Optimization**
   - Quantize XGBoost models
   - Use model compression
   - Batch predictions

---

## 🔍 Monitoring & Logging

### Application Monitoring

```typescript
// In backend/src/server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.errorHandler());
```

### Logging Service

```typescript
// Create logger utility
const logger = {
  info: (msg: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ℹ️ ${msg}`, data || '');
  },
  error: (msg: string, error: any) => {
    console.error(`[${new Date().toISOString()}] ❌ ${msg}`, error);
  },
  warn: (msg: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] ⚠️ ${msg}`, data || '');
  }
};
```

---

## ✅ Pre-Deployment Checklist

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations completed (if using DB)
- [ ] API endpoints tested
- [ ] Frontend can reach backend
- [ ] CORS configured correctly
- [ ] Security headers set (Helmet)
- [ ] Monitoring/logging configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## 🚨 Common Issues

### Backend returns 503 (Service Unavailable)
- Check memory/CPU usage
- Verify database connection
- Check environment variables
- Restart service

### Long forecast times (>5 seconds)
- Reduce number of SKUs
- Reduce horizon
- Check backend performance
- Add caching

### Frontend can't reach backend
- Check CORS configuration
- Verify backend URL in frontend .env
- Check firewall rules
- Verify both services running

### XGBoost training fails on Render
- Expected - Render free tier RAM limited
- Use pre-trained model instead
- Deploy to better-resourced platform
- Use statistical methods only

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] All code committed
- [ ] Tests passing
- [ ] Build succeeding locally
- [ ] Environment variables set
- [ ] API documented
- [ ] Security reviewed

### During Deployment
- [ ] Monitor build logs
- [ ] Verify environment variables
- [ ] Check health endpoints
- [ ] Monitor error rates
- [ ] Test key features

### Post-Deployment
- [ ] Verify all endpoints responding
- [ ] Check performance metrics
- [ ] Monitor error logs
- [ ] Get user feedback
- [ ] Plan rollback if needed

---

## 🔗 Quick Links

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://railway.app/docs)
- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [Docker Documentation](https://docs.docker.com/)

---

**Recommended for NOW:** Local development with `npm run backend:dev`
**Recommended for DEMO:** Vercel (frontend) + Railway (backend)
**Recommended for PRODUCTION:** DigitalOcean App Platform or AWS
