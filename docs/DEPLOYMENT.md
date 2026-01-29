# Deployment Guide for SmartTaskTracker

This guide will help you deploy SmartTaskTracker to **Netlify (frontend)** and **Render (backend)** for **FREE**.

## Environment Variables Template

Use this as reference for **local** (`.env` in project root, not committed) and **production** (set in Render / Netlify dashboards).

**Local development:**
- **Frontend** — `.env` (root): `VITE_API_URL=http://localhost:5000/api`
- **Backend** — `backend/SmartTaskTracker.API/appsettings.Development.json` (JWT only; not committed). One place for backend secrets, no duplicate with .env.

**Production (set in Render):**
- `DATABASE_URL` — auto-set when you add PostgreSQL
- `JWT_KEY` — set manually (min 32 chars)
- `JWT_ISSUER`, `JWT_AUDIENCE` — optional (defaults in code)
- `FRONTEND_URL` — your Netlify URL (after frontend deploys)
- `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS` — auto-set by render.yaml

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
5. Render will automatically detect the `render.yaml` file

### 2.2 Configure Service

Render will read `render.yaml` and:
- ✅ Create web service (backend API)
- ✅ Create PostgreSQL database (free tier)
- ✅ Set up environment variables
- ✅ Configure build and start commands

**Important:** After the service is created, you need to:

1. **Set JWT_KEY** (if not auto-generated):
   - Go to your service → **Environment** tab
   - Add: `JWT_KEY` = `your-super-secret-key-minimum-32-characters-long`
   - Generate a secure random string (you can use: `openssl rand -base64 32`)

2. **Note your backend URL:**
   - Your backend will be at: `https://smarttasktracker-api.onrender.com`
   - (Or whatever name Render assigns)

### 2.3 Wait for Deployment

- First deployment takes 5-10 minutes
- Render builds your .NET app
- Creates PostgreSQL database
- Starts the service

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

## Step 4: Update CORS on Backend

After frontend is deployed:

1. Go back to **Render** → Your backend service
2. Go to **Environment** tab
3. Add/Update:
   - **Key:** `FRONTEND_URL`
   - **Value:** `https://your-app-name.netlify.app`
   - (Replace with your actual Netlify URL)

4. **Redeploy** the backend (Render will auto-redeploy when env vars change)

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
| `FRONTEND_URL` | Your Netlify URL | Set after frontend deploys |
| `ASPNETCORE_ENVIRONMENT` | Production | Auto-set by render.yaml |
| `ASPNETCORE_URLS` | http://0.0.0.0:$PORT | Auto-set by render.yaml |

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
