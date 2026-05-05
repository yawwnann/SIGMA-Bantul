# Troubleshooting Monitoring Module

## Database Shows "Disconnected"

Jika database menunjukkan status "Disconnected" di monitoring dashboard, ikuti langkah-langkah berikut:

### 1. Cek Backend Logs

Jalankan backend dalam development mode dan perhatikan console logs:

```bash
cd backend
npm run start:dev
```

Cari error messages seperti:

- `Error measuring Database latency:`
- `Error getting database size:`
- `Database stats error:`

### 2. Cek Database Connection

Pastikan database PostgreSQL berjalan dan accessible:

```bash
# Cek apakah PostgreSQL running
# Windows (PowerShell)
Get-Service postgresql*

# Atau cek dengan psql
psql -U your_username -d your_database -c "SELECT 1"
```

### 3. Cek Environment Variables

Pastikan `.env` file di backend memiliki konfigurasi database yang benar:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

### 4. Test Database Connection Manually

Buat file test sederhana:

```typescript
// backend/test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');

    const result = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log('Database size:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

Jalankan:

```bash
npx ts-node test-db.ts
```

### 5. Cek PostgreSQL Permissions

Pastikan user database memiliki permission untuk query `pg_stat_activity`:

```sql
-- Login ke PostgreSQL
psql -U postgres

-- Grant permissions
GRANT pg_read_all_stats TO your_username;
GRANT pg_monitor TO your_username;
```

### 6. Restart Backend

Setelah memperbaiki konfigurasi, restart backend:

```bash
# Stop backend (Ctrl+C)
# Start again
npm run start:dev
```

### 7. Clear Cache

Kadang Redis cache bisa menyimpan data lama:

```bash
# Connect to Redis
redis-cli

# Clear monitoring cache
DEL system:metrics:latest
DEL system:requests:stats

# Or flush all (hati-hati!)
FLUSHALL
```

## Redis Shows "Disconnected"

### 1. Cek Redis Service

```bash
# Windows
# Cek apakah Redis running di Task Manager atau Services

# Test connection
redis-cli ping
# Should return: PONG
```

### 2. Cek Redis Configuration

Di `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # jika ada
```

### 3. Restart Redis

```bash
# Windows - restart Redis service dari Services.msc
# Atau restart dari command line jika installed via WSL
```

## High Latency Issues

Jika latency Redis atau Database tinggi (> 100ms):

### Database Latency

1. **Check Query Performance**

   ```sql
   -- Lihat slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Check Connections**

   ```sql
   -- Lihat active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Optimize Queries**
   - Add indexes untuk frequently queried columns
   - Use connection pooling
   - Optimize Prisma queries

### Redis Latency

1. **Check Memory Usage**

   ```bash
   redis-cli INFO memory
   ```

2. **Check Slow Commands**

   ```bash
   redis-cli SLOWLOG GET 10
   ```

3. **Optimize Redis**
   - Reduce key expiration times
   - Use Redis pipelining
   - Consider Redis clustering for high load

## Memory Usage High (> 90%)

1. **Check Node.js Memory**

   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run start:dev
   ```

2. **Monitor Memory Leaks**
   - Use Chrome DevTools for profiling
   - Check for unclosed connections
   - Review event listeners

3. **Optimize Code**
   - Clear unused variables
   - Implement proper garbage collection
   - Use streaming for large data

## Monitoring Not Updating

### Frontend Issues

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for API errors
   - Check Network tab for failed requests

2. **Check JWT Token**

   ```javascript
   // In browser console
   localStorage.getItem('token');
   ```

3. **Verify API URL**
   ```javascript
   // Check .env.local in frontend
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

### Backend Issues

1. **Check Monitoring Service**

   ```bash
   # Backend logs should show:
   # "Redis connected successfully"
   # Metrics collection running every 5 seconds
   ```

2. **Verify Module Import**
   - Check `app.module.ts` includes `MonitoringModule`
   - Verify no circular dependencies

3. **Test Endpoints Manually**

   ```bash
   # Get health status
   curl http://localhost:3000/monitoring/health \
     -H "Authorization: Bearer YOUR_TOKEN"

   # Get metrics
   curl http://localhost:3000/monitoring/metrics \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Common Error Messages

### "Cannot read property 'connected' of undefined"

**Cause**: API response tidak sesuai expected format

**Solution**:

1. Check backend logs untuk errors
2. Verify API endpoint returns correct data structure
3. Add null checks di frontend

### "401 Unauthorized"

**Cause**: JWT token expired atau invalid

**Solution**:

1. Login ulang
2. Check token expiration time
3. Verify JWT secret di backend

### "CORS Error"

**Cause**: Frontend tidak bisa akses backend API

**Solution**:

1. Check CORS configuration di `main.ts`:

   ```typescript
   app.enableCors({
     origin: 'http://localhost:5173',
     credentials: true,
   });
   ```

2. Verify API URL di frontend `.env.local`

## Performance Optimization

### Reduce Metrics Collection Frequency

Edit `monitoring.service.ts`:

```typescript
// Change from 5 seconds to 10 seconds
setInterval(async () => { ... }, 10000);
```

### Reduce History Size

```typescript
// Change from 100 to 50 data points
private readonly MAX_HISTORY = 50;
```

### Disable Auto-Refresh

Di frontend, set default auto-refresh ke OFF:

```typescript
const [autoRefresh, setAutoRefresh] = useState(false);
```

## Getting Help

Jika masalah masih berlanjut:

1. **Check Logs**
   - Backend console logs
   - Browser console logs
   - PostgreSQL logs
   - Redis logs

2. **Collect Information**
   - Error messages
   - Stack traces
   - Environment details
   - Steps to reproduce

3. **Debug Mode**

   ```typescript
   // Add debug logging in monitoring.service.ts
   console.log('Collecting metrics...');
   console.log('Redis latency:', redisLatency);
   console.log('Database latency:', databaseLatency);
   ```

4. **Test Individual Components**
   - Test Redis connection separately
   - Test Database connection separately
   - Test API endpoints with Postman/curl
   - Test frontend with mock data
