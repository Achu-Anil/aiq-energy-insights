# Redis Setup Guide for Windows

## Option 1: Using Docker (Recommended - Easiest)

### Prerequisites

- Docker Desktop for Windows installed

### Steps

1. **Start Redis with Docker:**

   ```powershell
   docker run -d --name redis-aiq -p 6379:6379 redis:latest
   ```

2. **Verify Redis is running:**

   ```powershell
   docker ps | Select-String redis
   ```

3. **Test connection:**

   ```powershell
   docker exec -it redis-aiq redis-cli ping
   ```

   Should return: `PONG`

4. **Stop Redis:**

   ```powershell
   docker stop redis-aiq
   ```

5. **Start Redis again:**

   ```powershell
   docker start redis-aiq
   ```

6. **Remove Redis (when needed):**
   ```powershell
   docker stop redis-aiq
   docker rm redis-aiq
   ```

---

## Option 2: Using Memurai (Native Windows Redis)

Memurai is a Redis-compatible server for Windows.

### Steps

1. **Download Memurai:**

   - Visit: https://www.memurai.com/get-memurai
   - Download the free Developer Edition

2. **Install Memurai:**

   - Run the installer
   - Follow the installation wizard
   - Memurai will start automatically as a Windows service

3. **Verify installation:**

   ```powershell
   memurai-cli ping
   ```

   Should return: `PONG`

4. **Check service status:**

   ```powershell
   Get-Service Memurai
   ```

5. **Start/Stop service:**

   ```powershell
   # Start
   Start-Service Memurai

   # Stop
   Stop-Service Memurai
   ```

---

## Option 3: Using WSL2 (Windows Subsystem for Linux)

### Prerequisites

- WSL2 installed and configured

### Steps

1. **Open WSL2 terminal (Ubuntu):**

   ```powershell
   wsl
   ```

2. **Install Redis in WSL:**

   ```bash
   sudo apt update
   sudo apt install redis-server -y
   ```

3. **Start Redis:**

   ```bash
   sudo service redis-server start
   ```

4. **Verify:**

   ```bash
   redis-cli ping
   ```

   Should return: `PONG`

5. **Configure Redis to start on boot:**
   ```bash
   echo "sudo service redis-server start" >> ~/.bashrc
   ```

---

## Verify Connection from Node.js

After setting up Redis, run our test script:

```powershell
npm run test:redis
```

Or manually test:

```powershell
npx ts-node src/scripts/test-redis.ts
```

---

## Configuration

Your `.env` file should have:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=    # Leave empty for local development
REDIS_DB=0
```

---

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port 6379
netstat -ano | findstr :6379

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Connection Refused

- Ensure Redis/Memurai service is running
- Check firewall settings
- Verify port 6379 is not blocked

### Docker Issues

```powershell
# Check Docker is running
docker info

# Check Redis container logs
docker logs redis-aiq

# Restart Docker Desktop if needed
```

---

## Recommended: Docker Compose (Advanced)

Create `docker-compose.yml` in project root:

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    container_name: redis-aiq
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  redis-data:
```

Then run:

```powershell
docker-compose up -d
```

---

## Quick Start Commands

```powershell
# Docker (Recommended)
docker run -d --name redis-aiq -p 6379:6379 redis:latest

# Test connection
npm run test:redis

# Run ingestion
npm run ingest
```
