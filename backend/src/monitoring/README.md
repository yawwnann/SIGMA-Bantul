# System Monitoring Module

Module ini menyediakan monitoring real-time untuk kinerja sistem, termasuk latency Redis, database, user access, dan system health.

## Fitur

### 1. Performance Metrics

- **Redis Latency**: Mengukur waktu response Redis dalam milliseconds
- **Database Latency**: Mengukur waktu query database dalam milliseconds
- **Memory Usage**: Monitoring penggunaan memory aplikasi
- **System Uptime**: Tracking waktu sistem berjalan

### 2. Redis Statistics

- Connection status
- Total keys stored
- Average, current, dan max latency
- Real-time monitoring

### 3. Database Statistics

- Connection status
- Database size
- Active connections
- Query latency metrics
- Top 10 tables by row count

### 4. User Access Metrics

- Active sessions
- Users by role distribution
- Total requests
- Requests per minute

### 5. System Health

- Overall system status (healthy/degraded)
- Service status (Redis, Database)
- Memory usage alerts
- Uptime tracking

## API Endpoints

### GET /monitoring/health

Mendapatkan status kesehatan sistem secara keseluruhan.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-05-01T10:00:00.000Z",
  "uptime": 86400,
  "memory": {
    "used": 150,
    "total": 512,
    "percentage": 29
  },
  "services": {
    "redis": {
      "status": "up",
      "latency": 5
    },
    "database": {
      "status": "up",
      "latency": 12
    }
  }
}
```

### GET /monitoring/metrics

Mendapatkan semua metrics monitoring secara lengkap.

**Query Parameters:**

- `minutes` (optional): Jumlah menit data historis (default: 30)

**Response:**

```json
{
  "health": { ... },
  "performance": [ ... ],
  "redis": { ... },
  "database": { ... },
  "userAccess": { ... },
  "timestamp": "2026-05-01T10:00:00.000Z"
}
```

### GET /monitoring/performance

Mendapatkan data performance metrics historis.

**Query Parameters:**

- `minutes` (optional): Jumlah menit data historis (default: 30)

### GET /monitoring/redis

Mendapatkan statistik Redis.

### GET /monitoring/database

Mendapatkan statistik Database.

### GET /monitoring/users

Mendapatkan statistik user access.

## Authorization

Semua endpoint memerlukan:

- JWT Authentication
- Role: `ADMIN`

## Data Collection

Sistem secara otomatis mengumpulkan metrics setiap 5 detik dan menyimpan:

- Last 100 data points di memory
- Latest metrics di Redis dengan TTL 5 menit

## Frontend Integration

Halaman monitoring tersedia di `/admin/monitoring` dengan fitur:

- Real-time charts menggunakan Recharts
- Auto-refresh setiap 5 detik (dapat di-toggle)
- Manual refresh button
- Responsive design

### Grafik yang Tersedia:

1. **Line Chart**: Redis & Database Latency
2. **Area Chart**: Memory Usage
3. **Pie Chart**: User Distribution by Role
4. **Bar Chart**: Top Database Tables

## Usage Example

```typescript
// Di service lain, inject MonitoringService
constructor(private monitoringService: MonitoringService) {}

// Track custom metrics
await this.monitoringService.trackRequest();

// Get current metrics
const metrics = await this.monitoringService.collectCurrentMetrics();
```

## Performance Considerations

- Metrics collection berjalan di background thread
- Tidak memblokir request handling
- Data disimpan di memory dengan limit 100 entries
- Redis digunakan untuk persistence dengan TTL

## Monitoring Thresholds

Sistem dianggap **degraded** jika:

- Redis latency > 100ms
- Database latency > 100ms
- Memory usage > 90%
- Redis atau Database disconnected

## Future Enhancements

- [ ] Alert notifications untuk threshold violations
- [ ] Export metrics ke external monitoring tools (Prometheus, Grafana)
- [ ] Custom metrics tracking
- [ ] Historical data persistence ke database
- [ ] API response time tracking per endpoint
- [ ] Error rate monitoring
