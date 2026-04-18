# PRD — Earthquake Frequency Analysis Module

## Sistem SIG Manajemen Krisis Bencana Gempa Bumi Kabupaten Bantul

---

# 1. Tujuan Fitur

## Objective

Modul Earthquake Frequency Analysis bertujuan untuk:

- Memberikan insight spasial tentang area rawan gempa berdasarkan frekuensi historis
- Mendukung perencanaan mitigasi bencana berbasis data
- Meningkatkan kualitas pengambilan keputusan untuk strategi evakuasi
- Mengidentifikasi pola spasial kejadian gempa di Kabupaten Bantul dan sekitarnya

## Use Cases

- BPBD dapat mengidentifikasi area prioritas untuk penempatan shelter
- Pemerintah daerah dapat merencanakan pembangunan infrastruktur tahan gempa
- Masyarakat dapat memahami tingkat risiko area tempat tinggal mereka
- Peneliti dapat menganalisis pola temporal-spasial gempa bumi

---

# 2. Sumber Data

## Data Source

### Primary Data:

- Historical earthquake data dari BMKG (stored in local database)

### Database Table:

`earthquakes`

### Fields Used:

- `id` - Primary key
- `latitude` - Koordinat lintang episentrum
- `longitude` - Koordinat bujur episentrum
- `magnitude` - Kekuatan gempa (SR)
- `depth` - Kedalaman gempa (km)
- `occurred_at` - Timestamp kejadian
- `coordinates` - PostGIS GEOMETRY(POINT, 4326)

### Data Range:

- Configurable time range (default: 1 year, 5 years, 10 years)
- Minimum magnitude filter (optional, default: all magnitudes)

---

# 3. Metode Analisis Spasial

## 3.1 Spatial Aggregation Approach

### Method: Grid-Based Analysis (Recommended)

**Grid Specification:**

- Default grid size: 5km × 5km
- Configurable grid sizes: 2km, 5km, 10km
- Coordinate system: EPSG:4326 (WGS84)
- Coverage area: Kabupaten Bantul + buffer 20km

**Rationale:**

- Grid-based lebih fleksibel dibanding batas administratif
- Memungkinkan analisis lintas wilayah
- Lebih mudah untuk visualisasi choropleth

### Alternative Method (Optional):

- Administrative boundaries (Kecamatan level)
- Dapat diaktifkan sebagai layer tambahan

---

## 3.2 Frequency Calculation

### Algorithm:

```
FOR each grid cell:
  count = COUNT(earthquakes WHERE ST_Contains(grid_geometry, earthquake_point)
                AND occurred_at BETWEEN start_date AND end_date)
  frequency_level = CLASSIFY(count)
END FOR
```

### Time Range Options:

- Last 1 year
- Last 5 years
- Last 10 years
- Custom range (start_date to end_date)

### Filters:

- Minimum magnitude (e.g., M ≥ 3.0)
- Maximum depth (e.g., depth ≤ 100 km)

---

## 3.3 Classification Rules

### Frequency Levels:

| Level      | Count Range  | Color            | Description          |
| ---------- | ------------ | ---------------- | -------------------- |
| **Low**    | 0 - 2 events | Green (#10b981)  | Jarang terjadi gempa |
| **Medium** | 3 - 5 events | Yellow (#f59e0b) | Frekuensi sedang     |
| **High**   | > 5 events   | Red (#ef4444)    | Sering terjadi gempa |

### Configurable Thresholds:

Admin dapat mengatur threshold via config:

```typescript
{
  low: { min: 0, max: 2 },
  medium: { min: 3, max: 5 },
  high: { min: 6, max: Infinity }
}
```

---

# 4. Backend Design (NestJS)

## 4.1 Module Structure

### New Module: `earthquake-analysis`

```
src/earthquake-analysis/
├── earthquake-analysis.module.ts
├── earthquake-analysis.controller.ts
├── earthquake-analysis.service.ts
├── frequency-analysis.service.ts
├── dto/
│   ├── frequency-query.dto.ts
│   └── frequency-response.dto.ts
└── interfaces/
    └── grid-cell.interface.ts
```

---

## 4.2 Service Layer

### `frequency-analysis.service.ts`

**Methods:**

```typescript
// Generate grid cells
generateGrid(bounds: BoundingBox, gridSize: number): GridCell[]

// Calculate frequency per grid
calculateFrequency(
  startDate: Date,
  endDate: Date,
  gridSize: number,
  minMagnitude?: number
): Promise<FrequencyResult[]>

// Classify frequency level
classifyFrequency(count: number): FrequencyLevel

// Get statistics
getStatistics(startDate: Date, endDate: Date): Promise<AnalysisStats>
```

---

## 4.3 API Endpoints

### 1. Get Frequency Analysis

```
GET /api/analysis/frequency
```

**Query Parameters:**

- `start_date` (required) - ISO 8601 format
- `end_date` (required) - ISO 8601 format
- `grid_size` (optional) - default: 5 (km)
- `min_magnitude` (optional) - default: 0
- `max_depth` (optional) - default: null

**Response:**

```json
{
  "success": true,
  "data": {
    "metadata": {
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2024-01-01T00:00:00Z",
      "grid_size": 5,
      "total_grids": 150,
      "total_earthquakes": 234
    },
    "grids": [
      {
        "grid_id": "cell_1",
        "count": 7,
        "level": "high",
        "center": {
          "lat": -7.888,
          "lon": 110.330
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[...]]
        }
      }
    ],
    "statistics": {
      "low_count": 120,
      "medium_count": 25,
      "high_count": 5
    }
  }
}
```

### 2. Get Analysis Statistics

```
GET /api/analysis/statistics
```

**Query Parameters:**

- `start_date` (required)
- `end_date` (required)

**Response:**

```json
{
  "success": true,
  "data": {
    "total_earthquakes": 234,
    "avg_magnitude": 4.2,
    "max_magnitude": 6.5,
    "most_active_area": {
      "grid_id": "cell_45",
      "count": 12,
      "center": { "lat": -7.9, "lon": 110.35 }
    },
    "distribution": {
      "low": 120,
      "medium": 25,
      "high": 5
    }
  }
}
```

---

## 4.4 PostGIS Processing

### Grid Generation Query:

```sql
-- Generate 5km x 5km grid
WITH bounds AS (
  SELECT
    ST_SetSRID(ST_MakeBox2D(
      ST_Point(110.1, -8.2),  -- min lon, min lat
      ST_Point(110.6, -7.6)   -- max lon, max lat
    ), 4326) AS geom
),
grid AS (
  SELECT
    row_number() OVER () AS grid_id,
    ST_MakeEnvelope(
      x, y,
      x + 0.045, y + 0.045,  -- ~5km in degrees
      4326
    ) AS geom
  FROM
    generate_series(110.1, 110.6, 0.045) AS x,
    generate_series(-8.2, -7.6, 0.045) AS y
)
SELECT * FROM grid;
```

### Frequency Count Query:

```sql
-- Count earthquakes per grid
SELECT
  g.grid_id,
  COUNT(e.id) AS earthquake_count,
  ST_AsGeoJSON(g.geom) AS geometry,
  ST_X(ST_Centroid(g.geom)) AS center_lon,
  ST_Y(ST_Centroid(g.geom)) AS center_lat
FROM grid g
LEFT JOIN earthquakes e
  ON ST_Contains(g.geom, e.coordinates)
  AND e.occurred_at BETWEEN $1 AND $2
  AND e.magnitude >= $3
GROUP BY g.grid_id, g.geom
ORDER BY earthquake_count DESC;
```

---

# 5. Database Considerations

## 5.1 Indexing

### Required Indexes:

```sql
-- Spatial index on earthquakes
CREATE INDEX idx_earthquakes_coordinates
ON earthquakes USING GIST (coordinates);

-- Temporal index
CREATE INDEX idx_earthquakes_occurred_at
ON earthquakes (occurred_at);

-- Composite index for filtered queries
CREATE INDEX idx_earthquakes_time_magnitude
ON earthquakes (occurred_at, magnitude);
```

---

## 5.2 Materialized View (Optional)

### For Performance Optimization:

```sql
-- Materialized view for 1-year frequency
CREATE MATERIALIZED VIEW mv_frequency_1year AS
SELECT
  g.grid_id,
  COUNT(e.id) AS count,
  CASE
    WHEN COUNT(e.id) <= 2 THEN 'low'
    WHEN COUNT(e.id) <= 5 THEN 'medium'
    ELSE 'high'
  END AS level,
  g.geom
FROM grid g
LEFT JOIN earthquakes e
  ON ST_Contains(g.geom, e.coordinates)
  AND e.occurred_at >= NOW() - INTERVAL '1 year'
GROUP BY g.grid_id, g.geom;

-- Refresh strategy
CREATE INDEX ON mv_frequency_1year (grid_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_frequency_1year;
```

**Refresh Schedule:**

- Daily via cron job
- On-demand via admin trigger

---

# 6. Caching Strategy (Redis)

## 6.1 Cache Keys

### Pattern:

```
analysis:frequency:{start_date}:{end_date}:{grid_size}:{min_mag}
```

### Example:

```
analysis:frequency:2023-01-01:2024-01-01:5:3.0
```

---

## 6.2 Cache Configuration

### TTL (Time To Live):

- Default: 30 minutes (1800 seconds)
- Configurable per environment

### Cache Strategy:

- Cache-aside pattern
- Invalidate on new earthquake data

### Implementation:

```typescript
async getFrequencyAnalysis(query: FrequencyQueryDto) {
  const cacheKey = `analysis:frequency:${query.start_date}:${query.end_date}:${query.grid_size}`;

  // Try cache first
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Calculate if not cached
  const result = await this.calculateFrequency(query);

  // Store in cache
  await this.redis.setex(cacheKey, 1800, JSON.stringify(result));

  return result;
}
```

---

# 7. Frontend Design (Next.js)

## 7.1 Page Structure

### New Page: `/analysis`

**Route:** `app/analysis/page.tsx`

**Purpose:** Earthquake Frequency Analysis Dashboard

---

## 7.2 Components

### Main Components:

```
app/analysis/
├── page.tsx                    # Main page
└── components/
    ├── frequency-map.tsx       # Choropleth map
    ├── analysis-filters.tsx    # Date range & filters
    ├── statistics-panel.tsx    # Stats summary
    └── legend.tsx              # Color legend
```

---

## 7.3 Visualization

### Primary: Choropleth Map

**Library:** Leaflet + React Leaflet

**Features:**

- Grid cells colored by frequency level
- Smooth color transitions
- Interactive hover effects

**Color Scale:**

- Low: `#10b981` (green-500)
- Medium: `#f59e0b` (amber-500)
- High: `#ef4444` (red-500)

### Alternative: Heatmap Layer

**Library:** Leaflet.heat

**Use Case:**

- Toggle between choropleth and heatmap
- Better for dense data visualization

---

## 7.4 UI Features

### Filter Panel:

```typescript
interface AnalysisFilters {
  startDate: Date;
  endDate: Date;
  gridSize: 5 | 10 | 20; // km
  minMagnitude: number;
  maxDepth?: number;
}
```

**Components:**

- Date range picker
- Grid size selector (radio buttons)
- Magnitude slider
- Apply/Reset buttons

### Statistics Panel:

**Display:**

- Total earthquakes analyzed
- Average magnitude
- Most active grid cell
- Distribution chart (low/medium/high)

### Interactive Tooltip:

**On Grid Hover:**

```
Grid Cell #45
━━━━━━━━━━━━━━━
Earthquakes: 7
Level: High
Center: -7.888, 110.330
Period: Jan 2023 - Jan 2024
```

---

## 7.5 Page Layout

```
┌─────────────────────────────────────────────┐
│  Header: Earthquake Frequency Analysis      │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌────────────────────┐   │
│  │  Filters    │  │   Statistics       │   │
│  │  Panel      │  │   Panel            │   │
│  └─────────────┘  └────────────────────┘   │
├─────────────────────────────────────────────┤
│                                             │
│           Choropleth Map                    │
│           (Full Width)                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Legend: Low | Medium | High        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

# 8. UI/UX Requirements

## 8.1 Color Scale

### Frequency Levels:

| Level  | Color  | Hex     | Tailwind  |
| ------ | ------ | ------- | --------- |
| Low    | Green  | #10b981 | green-500 |
| Medium | Yellow | #f59e0b | amber-500 |
| High   | Red    | #ef4444 | red-500   |

### Opacity:

- Grid fill: 0.6
- Grid stroke: 0.8
- Hover: 0.8

---

## 8.2 Interactive Elements

### Grid Cell Interaction:

**On Hover:**

- Increase opacity
- Show tooltip
- Highlight border

**On Click:**

- Show detailed modal
- List earthquakes in that cell
- Show magnitude distribution chart

### Legend:

**Features:**

- Always visible
- Click to toggle layer visibility
- Show count per category

---

## 8.3 Responsive Design

### Desktop (≥1024px):

- Side-by-side filters and stats
- Full-width map

### Tablet (768px - 1023px):

- Stacked filters and stats
- Full-width map

### Mobile (<768px):

- Collapsible filters
- Simplified stats
- Touch-optimized map controls

---

## 8.4 Loading States

### Skeleton Loaders:

- Map loading: spinner overlay
- Filters: skeleton inputs
- Stats: skeleton cards

### Progress Indicator:

- Show "Analyzing X earthquakes..."
- Progress bar for large datasets

---

# 9. Performance Considerations

## 9.1 Optimization Strategies

### Backend:

1. **Spatial Indexing**
   - GiST index on `coordinates`
   - Ensure index is used in queries

2. **Query Optimization**
   - Limit grid generation to visible bounds
   - Use prepared statements
   - Batch processing for large datasets

3. **Caching**
   - Redis cache for common queries
   - Materialized views for frequent ranges

### Frontend:

1. **Map Rendering**
   - Limit grid cells to viewport
   - Use canvas renderer for large datasets
   - Debounce zoom/pan events

2. **Data Loading**
   - Lazy load grid data
   - Progressive rendering
   - Virtual scrolling for lists

---

## 9.2 Performance Targets

| Metric            | Target | Critical |
| ----------------- | ------ | -------- |
| API Response Time | < 2s   | < 5s     |
| Map Initial Load  | < 3s   | < 7s     |
| Grid Rendering    | < 1s   | < 3s     |
| Filter Apply      | < 1s   | < 2s     |

---

## 9.3 Scalability

### Data Volume Limits:

- Max grid cells: 500
- Max earthquakes per query: 10,000
- Max time range: 20 years

### Handling Large Datasets:

- Pagination for earthquake lists
- Clustering for dense areas
- Aggregation for old data

---

# 10. Future Enhancements (Optional)

## Phase 2 Features:

### 10.1 Advanced Clustering

**Method:** DBSCAN or K-means

**Purpose:**

- Identify earthquake clusters
- Detect spatial patterns
- Group related events

### 10.2 Time-Series Animation

**Features:**

- Animated playback of earthquake frequency over time
- Monthly/yearly progression
- Slider control for timeline

**Use Case:**

- Visualize temporal patterns
- Identify seasonal trends
- Educational purposes

### 10.3 Predictive Modeling

**Approach:**

- Machine learning models
- Poisson process modeling
- Spatial-temporal prediction

**Output:**

- Probability maps
- Risk forecasting
- Early warning indicators

### 10.4 Comparative Analysis

**Features:**

- Compare multiple time periods
- Side-by-side visualization
- Trend analysis

### 10.5 Export & Reporting

**Formats:**

- PDF report generation
- GeoJSON export
- CSV data export
- Shareable links

---

# 11. Success Metrics

## KPIs:

- Analysis completes in < 2 seconds
- Map renders smoothly (60 FPS)
- Cache hit rate > 70%
- User engagement > 5 minutes per session
- Zero data accuracy errors

## User Feedback:

- Easy to understand visualization
- Useful for decision making
- Responsive and fast
- Clear color coding

---

# 12. Implementation Phases

## Phase 1: Core Functionality (Week 1-2)

- [ ] Backend module setup
- [ ] Grid generation algorithm
- [ ] Frequency calculation
- [ ] Basic API endpoints
- [ ] Database indexing

## Phase 2: Frontend Basic (Week 3)

- [ ] Analysis page setup
- [ ] Choropleth map integration
- [ ] Filter components
- [ ] Basic statistics display

## Phase 3: Enhancement (Week 4)

- [ ] Redis caching
- [ ] Interactive tooltips
- [ ] Detailed modals
- [ ] Export functionality

## Phase 4: Optimization (Week 5)

- [ ] Performance tuning
- [ ] Materialized views
- [ ] Mobile optimization
- [ ] Testing & QA

---

# 13. Testing Requirements

## Unit Tests:

- Grid generation logic
- Frequency calculation
- Classification rules
- Cache operations

## Integration Tests:

- API endpoints
- Database queries
- Redis caching
- PostGIS functions

## E2E Tests:

- User workflow
- Filter interactions
- Map rendering
- Data accuracy

---

# 14. Documentation

## Required Docs:

- API documentation (Swagger)
- User guide (how to use analysis)
- Admin guide (configuration)
- Technical documentation (architecture)

---

# 15. Risks & Mitigation

## Risks:

1. **Performance degradation with large datasets**
   - Mitigation: Implement pagination, caching, materialized views

2. **Inaccurate grid classification**
   - Mitigation: Configurable thresholds, validation with domain experts

3. **High memory usage**
   - Mitigation: Stream processing, limit grid size

4. **Cache invalidation issues**
   - Mitigation: Clear cache strategy, TTL management

---

# 16. Dependencies

## Backend:

- NestJS >= 10.0
- PostgreSQL >= 14 with PostGIS >= 3.3
- Redis >= 7.0
- Prisma >= 5.0

## Frontend:

- Next.js >= 14.0
- Leaflet >= 1.9
- React Leaflet >= 4.2
- Chart.js (for statistics)

---

# 17. Acceptance Criteria

## Must Have:

✅ Grid-based frequency analysis working
✅ Choropleth map visualization
✅ Date range filtering
✅ Color-coded legend
✅ Interactive tooltips
✅ Statistics panel
✅ API response < 2s
✅ Mobile responsive

## Nice to Have:

⭐ Heatmap toggle
⭐ Export to PDF
⭐ Comparative analysis
⭐ Animation timeline

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** System Analyst & GIS Engineer  
**Status:** Ready for Implementation

---
