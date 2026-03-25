# Deployment Guide for SmartTaskTracker

Documentation index: [docs.md](docs.md). Implementation agreement: [ia.md](ia.md) (optional local file; see `.gitignore` if omitted from clone).

Deploy the SmartTaskTracker **frontend** to Netlify and **backend** to Render using each platform’s free tier where applicable.

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

1. **GitHub** — repository containing this project
2. **Netlify** — [netlify.com](https://netlify.com)
3. **Render** — [render.com](https://render.com)

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

**Backend deployment:** complete when the service shows **Live** and health checks pass.

---

## Step 3: Deploy Frontend to Netlify

### 3.1 Create Site

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Select your **SmartTaskTracker** repository
5. Netlify will detect `netlify.toml`

### 3.2 Configure Build Settings

Netlify reads `netlify.toml` and applies:
- Base directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`

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

**Frontend deployment:** complete when the site build succeeds and the URL loads.

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

1. Open the Netlify URL (e.g. `https://your-app-name.netlify.app`).
2. Register a user and sign in.
3. Create and edit a task.
4. Run through [testing.md](testing.md) scenarios as needed.

---

## Troubleshooting

**Diagnostic order:** (1) Render service logs, (2) Netlify build/deploy logs, (3) browser network and console, (4) environment variables on both platforms (redeploy after changes).

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
- **App behavior:** Banner "Server is waking up" + auto-retry every 10s; login/register check health first so no "invalid credentials"
- **Mitigation:** Expected on the free tier; use a paid instance for always-on behavior (see Render pricing).

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

### Render (backend)
- Free PostgreSQL (1GB storage) on eligible plans
- **Service sleeps** after ~15 minutes of inactivity (free tier)
- **Cold start:** first request after sleep may take ~30–50 seconds
- Deployment and monthly hour limits per Render’s current free-tier policy

### Netlify (frontend)
- Bandwidth, build minutes, and feature limits per Netlify’s current free tier
- Custom domains and CDN supported on standard plans

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

## Next steps

After deployment:
- Record the production frontend and backend URLs in your runbook or README fork.
- Run smoke tests in production ([testing.md](testing.md)); verify AI features if API keys are configured ([ai.md](ai.md)).
