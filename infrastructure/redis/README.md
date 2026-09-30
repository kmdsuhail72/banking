# Redis Infrastructure

- **Container Image**: `redis:8-alpine`
- **Default Port**: `6379`
- **Use Cases**:
  - JWT Session blacklist and token refresh caching
  - Rate limiting for API Gateway
  - Distributed idempotency locks
  - Short-lived OTP data

### Connection String (Local)

```env
REDIS_URL=redis://localhost:6379
```
