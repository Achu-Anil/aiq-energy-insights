# Quick Start: Setting Up Redis for This Project

## ⚡ TL;DR - Fastest Option

### Option 1: Memurai (Easiest for Windows)

1. Download: https://www.memurai.com/get-memurai
2. Install and it runs automatically
3. Run `npm run test:redis` to verify
4. Done! ✅

---

## 📋 Step-by-Step Setup

### Choose Your Method:

## 🐳 Method 1: Docker (Recommended if you have Docker)

**Check if Docker is installed:**

```powershell
docker --version
```

**If not installed:**

- Download Docker Desktop: https://www.docker.com/products/docker-desktop/

**Start Redis with Docker:**

```powershell
docker run -d --name redis-aiq -p 6379:6379 redis:latest
```

**Verify it's running:**

```powershell
npm run test:redis
```

---

## 🪟 Method 2: Memurai (Native Windows - EASIEST)

**Step 1:** Download Memurai Developer Edition

- Visit: https://www.memurai.com/get-memurai
- Click "Download Developer Edition" (Free)

**Step 2:** Install

- Run the installer (.msi file)
- Accept defaults
- Memurai installs as a Windows service and starts automatically

**Step 3:** Verify

```powershell
npm run test:redis
```

**Manage Memurai Service:**

```powershell
# Check status
Get-Service Memurai

# Start
Start-Service Memurai

# Stop
Stop-Service Memurai

# Restart
Restart-Service Memurai
```

---

## 🐧 Method 3: WSL2 (If you have Windows Subsystem for Linux)

**Step 1:** Open WSL

```powershell
wsl
```

**Step 2:** Install Redis in Ubuntu

```bash
sudo apt update
sudo apt install redis-server -y
```

**Step 3:** Start Redis

```bash
sudo service redis-server start
```

**Step 4:** Exit WSL and test from Windows

```bash
exit
```

```powershell
npm run test:redis
```

---

## ✅ Verify Setup

After installation, run:

```powershell
npm run test:redis
```

**Expected output:**

```
=== Redis Connection Test ===

Configuration:
  Host: localhost
  Port: 6379
  Database: 0
  Password: (none)

Attempting to connect...
✓ Successfully connected to Redis

Test 1: PING
  Result: PONG
  ✓ PING test passed

Test 2: SET/GET operations
  ...
  ✓ SET/GET test passed

...

✓ All Redis tests passed!
```

---

## 🚀 Run the Ingestion Pipeline

Once Redis is running:

```powershell
# Run the transactional ingestion with cache management
npm run ingest:tx
```

This will:

1. ✅ Ingest data in a transaction
2. ✅ Refresh materialized view concurrently
3. ✅ Invalidate Redis cache (states:_, state:_)
4. ✅ Rebuild hot payloads

---

## 🔧 Troubleshooting

### "Connection Refused"

- Redis is not running
- **Memurai:** Check Windows Services, start "Memurai" service
- **Docker:** Run `docker ps` to check if container is running
- **WSL:** Run `wsl` then `sudo service redis-server status`

### Port Already in Use

```powershell
# Find what's using port 6379
netstat -ano | findstr :6379

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Test Without Redis

The script will gracefully skip cache operations if Redis is unavailable:

```powershell
npm run ingest
```

---

## 📝 Configuration

Your `.env` already has Redis configuration:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=       # Leave commented for local dev
REDIS_DB=0
```

---

## 🎯 Recommended: Memurai

For Windows development, **Memurai is the easiest option**:

- ✅ Native Windows application
- ✅ Runs as Windows service
- ✅ Redis 6.2 compatible
- ✅ No Docker required
- ✅ Automatic startup
- ✅ GUI management tool included

Download: https://www.memurai.com/get-memurai

---

## Next Steps

After Redis is running:

1. Test connection: `npm run test:redis`
2. Run ingestion: `npm run ingest:tx`
3. Check the output for cache statistics
4. Verify data in database: `npm run prisma:studio`

Need help? Check `REDIS_SETUP.md` for more details.
