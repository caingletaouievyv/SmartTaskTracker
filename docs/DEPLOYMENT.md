# Deployment Guide for SmartTaskTracker

This guide will help you deploy SmartTaskTracker to **Netlify (frontend)** and **Render (backend)** for **FREE**.

---

## Quick reference (for AI / automation)

- **Stack:** Frontend = React + Vite (Netlify). Backend = ASP.NET Core 9 (Render, Docker). DB = PostgreSQL (Render free).
- **Backend (Render):** Build/run via **Docker** (`backend/SmartTaskTracker.API/Dockerfile`). **Root Directory** = `backend/SmartTaskTracker.API`. **Environment** = Docker. Leave build/start command empty. **Env vars (set in Render dashboard, not from render.yaml for manual deploy):** `JWT_KEY` (required, min 32 chars), `FRONTEND_URL` = Netlify origin with `https://` (no trailing slash; required for CORS). `DATABASE_URL` auto-set when PostgreSQL is linked.
- **Frontend (Netlify):** **Base directory** = `frontend`, **publish** = `dist`. **Env var:** `VITE_API_URL` = Render API URL (e.g. `https://xxx.onrender.com/api`).
- **CORS:** Backend allows only origins from `FRONTEND_URL` (and localhost). `FRONTEND_URL` must match Netlify URL exactly (e.g. `https://smarttasktracker.netlify.app`). Redeploy backend after setting.
- **Optional:** `SEED_DATABASE=true` on Render resets the seed user and runs `DbSeeder` on every startup; set to `false` when done so it stops.

---

## Environment Variables Template

Use this as reference for **local** (`.env` in project root, not committed) and **production** (set in Render / Netlify dashboards).

**Local development:**
- **Frontend** — `.env` (root): `VITE_API_URL=http://localhost:5000/api`
- **Backend** — `backend/SmartTaskTracker.API/appsettings.Development.json` (JWT only; not committed). One place for backend secrets, no duplicate with .env.

**Production (set in Render dashboard — manual deploy does not apply env from render.yaml):**
- `DATABASE_URL` — auto-set when you link PostgreSQL to the service
- `JWT_KEY` — **required**, set manually (min 32 chars)
- `FRONTEND_URL` — **required for CORS**, your Netlify URL with `https://`, no trailing slash (e.g. `https://smarttasktracker.netlify.app`)
- `JWT_ISSUER`, `JWT_AUDIENCE` — optional (defaults in code)
- `SEED_DATABASE` — optional; `true` = reset seed user and run seed every startup; `false` = do nothing (set false when done)

**Production (set in Netlify):**
- `VITE_API_URL` — your Render backend URL, e.g. `https://your-api.onrender.com/api`

---

## Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Netlify Account** - Sign up at [netlify.com](https://netlify.com) (free)
3. **Render Account** - Sign up at [render.com](https://render.com) (free)

---

## Step 1: Push Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/SmartTaskTracker.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### 2.1 Create Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your **SmartTaskTracker** repository

### 2.2 Configure Service (manual deploy)

**Environment:** **Docker** (backend uses `backend/SmartTaskTracker.API/Dockerfile`; no native .NET build).

**Root Directory:** `backend/SmartTaskTracker.API`

**Build command:** Leave empty (Dockerfile handles build).

**Start command:** Leave empty (Dockerfile `ENTRYPOINT` handles start).

**Environment variables (set in Render → your service → Environment tab):**  
*(For manual deploy, env vars from `render.yaml` are not applied; set these in the dashboard.)*

| Key | Value | Required |
|-----|-------|----------|
| `JWT_KEY` | Your secret key (min 32 chars) | Yes |
| `FRONTEND_URL` | Your Netlify URL, e.g. `https://smarttasktracker.netlify.app` (no trailing slash) | Yes (for CORS) |
| `DATABASE_URL` | Auto-set when you link a PostgreSQL database (see below) | Yes (if using DB) |

Optional: `SEED_DATABASE=true` to run `DbSeeder` in production once; remove or set to `false` after.

**Add PostgreSQL (free):** Render doesn’t show a separate “Databases” page for free tier — you add the DB when creating the service or later:
1. **New +** (top right) → **PostgreSQL** (not “Web Service”). Create it; note the **Internal Database URL** on its dashboard.
2. **New +** → **Web Service** → connect repo, set Root Directory = `backend/SmartTaskTracker.API`, Environment = Docker.
3. In the **Web Service** → **Environment** tab → **Add from Render PostgreSQL** (or paste the DB’s Internal URL as `DATABASE_URL`). Save and deploy.

**Reseed:** With `SEED_DATABASE=true`, the app resets the seed user and runs the seeder on every startup. Set to `false` when done so it stops.

### 2.3 Wait for Deployment

- First deployment takes 5–10 minutes (Docker build)
- Backend will be at e.g. `https://your-service-name.onrender.com`

**✅ Backend is now live!**

---

## Step 3: Deploy Frontend to Netlify

### 3.1 Create Site

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Select your **SmartTaskTracker** repository
5. Netlify will detect `netlify.toml`

### 3.2 Configure Build Settings

Netlify will read `netlify.toml` and:
- ✅ Set base directory: `frontend`
- ✅ Set build command: `npm install && npm run build`
- ✅ Set publish directory: `dist`

### 3.3 Set Environment Variable

**Before deploying**, set the API URL:

1. In Netlify, go to **Site settings** → **Environment variables**
2. Add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://smarttasktracker-api.onrender.com/api`
   - (Replace with your actual Render backend URL)

3. Click **"Deploy site"**

### 3.4 Wait for Deployment

- First deployment takes 2-5 minutes
- Netlify installs dependencies
- Builds your React app
- Deploys to CDN

**✅ Frontend is now live!**

---

## Step 4: Set CORS (FRONTEND_URL) on Backend

After frontend is deployed:

1. Go to **Render** → Your backend service → **Environment** tab
2. Add or update:
   - **Key:** `FRONTEND_URL`
   - **Value:** Your Netlify URL **with `https://`** and **no trailing slash**, e.g. `https://smarttasktracker.netlify.app`
3. **Save** and **redeploy** the backend (env vars apply on next deploy)

CORS allows only origins from `FRONTEND_URL` (and localhost). Wrong or missing `FRONTEND_URL` causes "blocked by CORS policy" in the browser.

---

## Step 5: Test Your Deployment

1. **Visit your Netlify URL:** `https://your-app-name.netlify.app`
2. **Register a new account**
3. **Create a task**
4. **Test all features!**

---

## Troubleshooting

### Backend Issues

**Problem:** Backend won't start
- **Check:** Render logs (click on your service → Logs tab)
- **Common issues:**
  - JWT_KEY not set → Add it in Environment variables
  - Database connection failed → Check DATABASE_URL is set automatically

**Problem:** CORS errors
- **Check:** FRONTEND_URL environment variable matches your Netlify URL exactly
- **Solution:** Update FRONTEND_URL and redeploy

**Problem:** Cold start (30-50 second delay)
- **This is normal** on Render free tier
- Service sleeps after 15 min inactivity
- First request wakes it up (takes time)
- **Solution:** Accept it for free tier, or upgrade to paid ($7/month)

### Frontend Issues

**Problem:** Can't connect to backend
- **Check:** VITE_API_URL is set correctly in Netlify
- **Check:** Backend URL is correct (no trailing slash)
- **Check:** Backend is running (visit backend URL in browser)

**Problem:** Build fails
- **Check:** Netlify build logs
- **Common issues:**
  - Missing dependencies → Check `package.json`
  - Build errors → Fix TypeScript/JS errors

---

## Environment Variables Summary

### Backend (Render)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Auto-set | PostgreSQL connection (from database) |
| `JWT_KEY` | Your secret key | Min 32 chars, set manually |
| `JWT_ISSUER` | SmartTaskTracker | Optional, defaults in code |
| `JWT_AUDIENCE` | SmartTaskTracker | Optional, defaults in code |
| `FRONTEND_URL` | Your Netlify URL (e.g. `https://smarttasktracker.netlify.app`) | **Required** for CORS; no trailing slash |
| `SEED_DATABASE` | `true` / `false` | Optional; `true` = reset seed user and seed every startup; `false` = stop |

### Frontend (Netlify)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | Your Render backend URL | e.g., `https://smarttasktracker-api.onrender.com/api` |

---

## Free Tier Limitations

### Render (Backend)
- ✅ Free PostgreSQL (1GB storage)
- ⚠️ **Service sleeps after 15 min inactivity**
- ⚠️ **Cold start: 30-50 seconds** (first request after sleep)
- ✅ Unlimited deployments
- ✅ 750 hours/month free

### Netlify (Frontend)
- ✅ 100GB bandwidth/month
- ✅ Unlimited builds
- ✅ Custom domain support
- ✅ CDN included
- ✅ **No limitations for your use case!**

---

## Updating Your App

After making changes:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. **Auto-deployment:**
   - Render and Netlify auto-deploy on push to `main` branch
   - Wait 2-10 minutes for deployment

3. **Manual deployment:**
   - Render: Click "Manual Deploy" → "Deploy latest commit"
   - Netlify: Click "Trigger deploy" → "Deploy site"

---

## Next Steps

Once deployed:
- ✅ Share your app URL with employers/friends
- ✅ Add to your portfolio
- ✅ Test all features in production
- ✅ Then implement AI features (Phase 3)

---

## Support

If you run into issues:
1. Check Render logs (backend)
2. Check Netlify build logs (frontend)
3. Check browser console (frontend errors)
4. Verify environment variables are set correctly

**Good luck with deployment! 🚀**
