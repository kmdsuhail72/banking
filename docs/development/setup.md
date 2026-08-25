# Local Development Setup Guide

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose

### 2. Install Dependencies
```powershell
pnpm install
```

### 3. Build Shared Packages
```powershell
pnpm build
```

### 4. Start Local Infrastructure
```powershell
docker compose up -d
```

### 5. Run Microservices & Gateway
```powershell
pnpm --parallel --filter './apps/*' dev
```
