# Design: BPBD Risk Zone Integration

## Feature Name

bpbd-risk-integration

## Architecture Overview

This design integrates official BPBD earthquake risk zone data into the existing WebGIS evacuation system without breaking current functionality. The integration enhances the weighted overlay algorithm by combining earthquake frequency analysis with authoritative BPBD risk assessments.

### System Components Affected

1. **Database Layer**: New table for BPBD zones, updated Road table
2. **Backend Services**: New BpbdRiskService enhancements, EvacuationService updates
3. **Routing Logic**: Enhanced hazard calculation in weighted overlay
4. **Frontend**: New map layer for risk zone visualization
5. **Data Import**: Scripts for GeoJSON import and spatial processing

## Database Design

### New Table: bpbd_risk_zones

```prisma
model BpbdRiskZone {
  id          Int      @id @default(autoincrement())
  kecamatan   String
  desa        String
  name        String
  riskLevel   BpbdRiskLevel
  bahaya      String?
  iaGempa     Int?
  taGempa     Int?
  tRisk       Float?
  skorTRisk   Float?
  kodeDesa    Float?
  kodeKec     Int?
  geometry    Json
  geom        Unsupported("geometry(MultiPolygon, 4326)")?
  area        Float?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([riskLevel])
  @@index([kecamatan])
  @@index([desa])
}

enum BpbdRiskLevel {
  LOW
  MEDIUM
  HIGH
}
```

### Updated Table: Road

Add new column to store BPBD risk information:

```prisma
model Road {
  // ... existing fields ...
  bpbdRiskLevel   BpbdRiskLevel?
  bpbdRiskScore   Float?
  combinedHazard  Float?
  // ... existing fields ...
}
```

### SQL Schema Creation

```sql
-- Create enum for BPBD risk levels
CREATE TYPE "BpbdRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Create bpbd_risk_zones table
CREATE TABLE "BpbdRiskZone" (
  id SERIAL PRIMARY KEY,
  kecamatan VARCHAR(255) NOT NULL,
  desa VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "riskLevel" "BpbdRiskLevel" NOT NULL,
  bahaya VARCHAR(50),
  "iaGempa" INTEGER,
  "taGempa" INTEGER,
  "tRisk" DOUBLE PRECISION,
  "skorTRisk" DOUBLE PRECISION,
  "kodeDesa" DOUBLE PRECISION,
  "kodeKec" INTEGER,
  geometry JSONB NOT NULL,
  geom geometry(MultiPolygon, 4326),
  area DOUBLE PRECISION,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_bpbd_risk_zones_geom ON "BpbdRiskZone" USING GIST (geom);
CREATE INDEX idx_bpbd_risk_zones_level ON "BpbdRiskZone" ("riskLevel");
CREATE INDEX idx_bpbd_risk_zones_kecamatan ON "BpbdRiskZone" (kecamatan);
CREATE INDEX idx_bpbd_risk_zones_desa ON "BpbdRiskZone" (desa);

-- Add columns to Road table
ALTER TABLE "Road"
  ADD COLUMN "bpbdRiskLevel" "BpbdRiskLevel",
  ADD COLUMN "bpbdRiskScore" DOUBLE PRECISION,
  ADD COLUMN "combinedHazard" DOUBLE PRECISION;

-- Create index for faster queries
CREATE INDEX idx_roads_bpbd_risk ON "Road" ("bpbdRiskLevel");
```

## Risk Score Mapping

### BPBD Risk Level to Numeric Score

```typescript
const BPBD_RISK_SCORES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

function getBpbdRiskScore(level: BpbdRiskLevel): number {
  return BPBD_RISK_SCORES[level];
}
```

### Combined Hazard Calculation

The new hazard score combines earthquake frequency analysis with BPBD risk zones:

```typescript
/**
 * Calculate combined hazard score
 * @param frequencyScore - Score from earthquake frequency analysis (1-5)
 * @param bpbdRiskScore - Score from BPBD risk zone (1-3)
 * @returns Combined hazard score (1-5)
 */
function calculateCombinedHazard(
  frequencyScore: number,
  bpbdRiskScore: number,
): number {
  // Normalize BPBD score to 1-5 scale
  const normalizedBpbd = ((bpbdRiskScore - 1) / 2) * 4 + 1; // Maps 1-3 to 1-5

  // Weighted average: 50% frequency, 50% BPBD
  const combined = frequencyScore * 0.5 + normalizedBpbd * 0.5;

  return Math.min(5, Math.max(1, combined));
}
```

## Spatial Join Logic

### Algorithm: Road-to-Risk-Zone Matching

```sql
-- Spatial join to assign BPBD risk to roads
UPDATE "Road" r
SET
  "bpbdRiskLevel" = subquery."riskLevel",
  "bpbdRiskScore" = CASE
    WHEN subquery."riskLevel" = 'LOW' THEN 1
    WHEN subquery."riskLevel" = 'MEDIUM' THEN 2
    WHEN subquery."riskLevel" = 'HIGH' THEN 3
    ELSE 1
  END,
  "updatedAt" = NOW()
FROM (
  SELECT DISTINCT ON (r2.id)
    r2.id as road_id,
    brz."riskLevel"
  FROM "Road" r2
  JOIN "BpbdRiskZone" brz ON ST_Intersects(r2.geom, brz.geom)
  ORDER BY r2.id,
    CASE brz."riskLevel"
      WHEN 'HIGH' THEN 3
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 1
    END DESC
) subquery
WHERE r.id = subquery.road_id;

-- Set default for roads not intersecting any zone
UPDATE "Road"
SET
  "bpbdRiskLevel" = 'LOW',
  "bpbdRiskScore" = 1
WHERE "bpbdRiskLevel" IS NULL;
```

### Handling Edge Cases

1. **Road intersects multiple zones**: Use highest risk level
2. **Road doesn't intersect any zone**: Default to LOW risk
3. **Partial intersection**: If >50% of road length in zone, assign that risk
4. **MultiLineString geometries**: Process each segment independently

## Weighted Overlay Enhancement

### Current Formula

```
Score = (Hazard * 0.5) + (RoadCondition * 0.3) + (Distance * 0.2)
```

### Enhanced Formula

```
Hazard = (FrequencyScore * 0.5) + (BpbdScore_normalized * 0.5)
Score = (Hazard * 0.5) + (RoadCondition * 0.3) + (Distance * 0.2)
```

### Implementation in EvacuationService

```typescript
private calculateEnhancedHazardScore(
  road: Road,
  isNearHazard: boolean,
  hazardZones: HazardZone[],
): number {
  // 1. Calculate frequency-based hazard (existing logic)
  const frequencyScore = this.calculateFrequencyHazard(
    road,
    isNearHazard,
    hazardZones
  );

  // 2. Get BPBD risk score
  const bpbdScore = road.bpbdRiskScore || 1;

  // 3. Normalize BPBD score to 1-5 scale
  const normalizedBpbd = ((bpbdScore - 1) / 2) * 4 + 1;

  // 4. Combine with 50-50 weight
  const combinedHazard = (frequencyScore * 0.5) + (normalizedBpbd * 0.5);

  return Math.min(5, Math.max(1, combinedHazard));
}
```

## Backend Service Design

### Enhanced BpbdRiskService

```typescript
@Injectable()
export class BpbdRiskService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Import BPBD GeoJSON into database
   */
  async importGeoJson(filePath: string): Promise<ImportResult> {
    const geojson = await this.loadGeoJson(filePath);
    const features = geojson.features;

    let imported = 0;
    let errors = 0;

    for (const feature of features) {
      try {
        await this.prisma.bpbdRiskZone.create({
          data: {
            name: feature.properties.name || "Unknown",
            riskLevel: this.mapRiskLevel(feature.properties.risk),
            geometry: feature.geometry,
            geom: Prisma.sql`ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})`,
            area: feature.properties.area,
            description: feature.properties.description,
          },
        });
        imported++;
      } catch (error) {
        errors++;
        this.logger.error(`Failed to import feature: ${error.message}`);
      }
    }

    return { imported, errors, total: features.length };
  }

  /**
   * Perform spatial join to assign BPBD risk to roads
   */
  async assignRiskToRoads(): Promise<AssignmentResult> {
    // Execute spatial join SQL
    await this.prisma.$executeRaw`
      UPDATE "Road" r
      SET 
        "bpbdRiskLevel" = subquery."riskLevel",
        "bpbdRiskScore" = CASE 
          WHEN subquery."riskLevel" = 'LOW' THEN 1
          WHEN subquery."riskLevel" = 'MEDIUM' THEN 2
          WHEN subquery."riskLevel" = 'HIGH' THEN 3
        END
      FROM (
        SELECT DISTINCT ON (r2.id)
          r2.id as road_id,
          brz."riskLevel"
        FROM "Road" r2
        JOIN "BpbdRiskZone" brz ON ST_Intersects(r2.geom, brz.geom)
        ORDER BY r2.id, 
          CASE brz."riskLevel"
            WHEN 'HIGH' THEN 3
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 1
          END DESC
      ) subquery
      WHERE r.id = subquery.road_id
    `;

    // Set defaults
    await this.prisma.$executeRaw`
      UPDATE "Road"
      SET "bpbdRiskLevel" = 'LOW', "bpbdRiskScore" = 1
      WHERE "bpbdRiskLevel" IS NULL
    `;

    const stats = await this.getRoadRiskStatistics();
    return stats;
  }

  /**
   * Recalculate combined hazard scores for all roads
   */
  async recalculateCombinedHazard(): Promise<void> {
    // This will be called after spatial join
    // Updates combinedHazard field based on frequency + BPBD
    await this.prisma.$executeRaw`
      UPDATE "Road"
      SET "combinedHazard" = (
        COALESCE(vulnerability::int, 2) * 0.5 + 
        COALESCE("bpbdRiskScore", 1) * 0.5
      )
    `;
  }
}
```

## API Endpoints

### GET /api/bpbd-risk/zones

Get all BPBD risk zones with optional filtering

**Query Parameters:**

- `riskLevel`: Filter by risk level (LOW, MEDIUM, HIGH)
- `bounds`: Geographic bounds for spatial filtering

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Zona Risiko Tinggi Pantai Selatan",
      "riskLevel": "HIGH",
      "geometry": { "type": "Polygon", "coordinates": [...] },
      "area": 15.5,
      "description": "Area dengan risiko gempa tinggi"
    }
  ]
}
```

### POST /api/bpbd-risk/import

Import BPBD GeoJSON data (Admin only)

**Request Body:**

```json
{
  "filePath": "/path/to/geojson"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "imported": 45,
    "errors": 0,
    "total": 45
  }
}
```

### POST /api/bpbd-risk/assign-to-roads

Perform spatial join to assign risk to roads (Admin only)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRoads": 12230,
    "assigned": 11850,
    "defaulted": 380,
    "byRiskLevel": {
      "LOW": 8500,
      "MEDIUM": 2800,
      "HIGH": 930
    }
  }
}
```

### GET /api/bpbd-risk/validation

Compare BPBD zones with frequency analysis

**Response:**

```json
{
  "success": true,
  "data": {
    "correlation": 0.78,
    "agreements": 9500,
    "disagreements": 2730,
    "details": [...]
  }
}
```

## Routing Integration

### pgRouting Cost Calculation

Update road cost to use combined hazard:

```sql
-- Update safe_cost based on combined hazard
UPDATE "Road"
SET safe_cost =
  length * (1 + COALESCE("combinedHazard", 2) * 0.5)
WHERE geom IS NOT NULL;
```

### Dijkstra Query with BPBD Risk

```sql
SELECT
  r.id,
  r.name,
  r.type,
  r.condition,
  r."bpbdRiskLevel",
  r."combinedHazard",
  ST_AsGeoJSON(r.geom)::json as geometry
FROM pgr_dijkstra(
  'SELECT id, source, target,
    COALESCE(safe_cost, length * 2) as cost,
    COALESCE(safe_cost, length * 2) as reverse_cost
   FROM "Road"
   WHERE source IS NOT NULL AND target IS NOT NULL',
  $1, -- start node
  $2, -- end node
  directed := false
) AS route
JOIN "Road" r ON route.edge = r.id
ORDER BY route.seq;
```

### SimpleDijkstraService Enhancement

```typescript
private calculateEdgeCost(road: Road): number {
  const baseDistance = road.length || 1;
  const combinedHazard = road.combinedHazard || 2;
  const conditionMultiplier = this.getConditionMultiplier(road.condition);

  // Cost = distance * (1 + hazard_factor + condition_factor)
  return baseDistance * (1 + combinedHazard * 0.5 + conditionMultiplier * 0.3);
}
```

## Frontend Visualization

### Map Layer Component

```typescript
// components/map/bpbd-risk-layer.tsx
interface BpbdRiskLayerProps {
  visible: boolean;
  onFeatureClick?: (feature: any) => void;
}

export function BpbdRiskLayer({ visible, onFeatureClick }: BpbdRiskLayerProps) {
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchBpbdZones().then(setZones);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {zones.map(zone => (
        <Polygon
          key={zone.id}
          positions={zone.geometry.coordinates[0]}
          pathOptions={{
            color: getRiskColor(zone.riskLevel),
            fillColor: getRiskColor(zone.riskLevel),
            fillOpacity: 0.3,
            weight: 2,
          }}
          eventHandlers={{
            click: () => onFeatureClick?.(zone),
          }}
        >
          <Popup>
            <div>
              <h3>{zone.name}</h3>
              <p>Risk Level: {zone.riskLevel}</p>
              <p>Area: {zone.area?.toFixed(2)} km²</p>
            </div>
          </Popup>
        </Polygon>
      ))}
    </>
  );
}

function getRiskColor(level: string): string {
  const colors = {
    LOW: '#10b981',    // green-500
    MEDIUM: '#f59e0b', // amber-500
    HIGH: '#ef4444',   // red-500
  };
  return colors[level] || '#6b7280';
}
```

### Map Controls

```typescript
// Add toggle in map controls
<div className="map-controls">
  <label>
    <input
      type="checkbox"
      checked={showBpbdRisk}
      onChange={(e) => setShowBpbdRisk(e.target.checked)}
    />
    BPBD Risk Zones
  </label>
</div>
```

## Data Import Script

### scripts/import-bpbd-zones.ts

```typescript
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function importBpbdZones() {
  console.log("Starting BPBD risk zones import...");

  const geoJsonPath = path.join(
    process.cwd(),
    "Data",
    "GeoJSon",
    "Data Wilayah dengan tingkat resiko gempa.geojson",
  );

  const fileData = fs.readFileSync(geoJsonPath, "utf-8");
  const geojson = JSON.parse(fileData);

  let imported = 0;
  let errors = 0;

  for (const feature of geojson.features) {
    try {
      const riskLevel = mapRiskLevel(feature.properties.KETERANGAN);

      await prisma.$executeRaw`
        INSERT INTO "BpbdRiskZone" (name, "riskLevel", geometry, geom, area)
        VALUES (
          ${feature.properties.KECAMATAN || "Unknown"},
          ${riskLevel}::\"BpbdRiskLevel\",
          ${JSON.stringify(feature.geometry)}::jsonb,
          ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),
          ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})::geography) / 1000000
        )
      `;

      imported++;
      console.log(`Imported: ${feature.properties.KECAMATAN} (${riskLevel})`);
    } catch (error) {
      errors++;
      console.error(`Error importing feature:`, error.message);
    }
  }

  console.log(`Import complete: ${imported} imported, ${errors} errors`);
}

function mapRiskLevel(keterangan: string): string {
  const lower = keterangan?.toLowerCase() || "";
  if (lower.includes("tinggi") || lower.includes("high")) return "HIGH";
  if (lower.includes("sedang") || lower.includes("medium")) return "MEDIUM";
  return "LOW";
}

importBpbdZones()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Validation Strategy

### Comparison Logic

```typescript
async validateBpbdVsFrequency(): Promise<ValidationReport> {
  // 1. Get roads with both BPBD and frequency scores
  const roads = await this.prisma.road.findMany({
    where: {
      bpbdRiskLevel: { not: null },
      vulnerability: { not: null },
    },
  });

  let agreements = 0;
  let disagreements = 0;
  const details: any[] = [];

  for (const road of roads) {
    const bpbdScore = this.getBpbdScore(road.bpbdRiskLevel);
    const freqScore = this.getVulnerabilityScore(road.vulnerability);

    const diff = Math.abs(bpbdScore - freqScore);

    if (diff <= 1) {
      agreements++;
    } else {
      disagreements++;
      details.push({
        roadId: road.id,
        roadName: road.name,
        bpbdLevel: road.bpbdRiskLevel,
        bpbdScore,
        frequencyLevel: road.vulnerability,
        freqScore,
        difference: diff,
      });
    }
  }

  const correlation = agreements / (agreements + disagreements);

  return {
    totalRoads: roads.length,
    agreements,
    disagreements,
    correlation,
    details: details.slice(0, 100), // Top 100 disagreements
  };
}
```

### Validation Metrics

1. **Correlation Score**: Percentage of roads where BPBD and frequency agree
2. **Disagreement Analysis**: Roads with significant differences
3. **Spatial Patterns**: Geographic distribution of disagreements
4. **Confidence Intervals**: Statistical significance of differences

## Performance Optimization

### Spatial Indexing

```sql
-- Ensure spatial indexes exist
CREATE INDEX IF NOT EXISTS idx_bpbd_zones_geom
  ON "BpbdRiskZone" USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_roads_geom
  ON "Road" USING GIST (geom);

-- Analyze tables for query optimization
ANALYZE "BpbdRiskZone";
ANALYZE "Road";
```

### Caching Strategy

```typescript
// Cache BPBD zones for 1 hour
const CACHE_KEY = 'bpbd:zones:all';
const CACHE_TTL = 3600;

async getBpbdZones() {
  const cached = await this.redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const zones = await this.prisma.bpbdRiskZone.findMany();
  await this.redis.set(CACHE_KEY, JSON.stringify(zones), CACHE_TTL);

  return zones;
}
```

### Batch Processing

For large datasets, process roads in batches:

```typescript
async assignRiskToRoadsInBatches(batchSize = 1000) {
  const totalRoads = await this.prisma.road.count();
  const batches = Math.ceil(totalRoads / batchSize);

  for (let i = 0; i < batches; i++) {
    const skip = i * batchSize;
    console.log(`Processing batch ${i + 1}/${batches}...`);

    await this.prisma.$executeRaw`
      UPDATE "Road" r
      SET "bpbdRiskLevel" = subquery."riskLevel"
      FROM (
        SELECT DISTINCT ON (r2.id)
          r2.id as road_id,
          brz."riskLevel"
        FROM "Road" r2
        JOIN "BpbdRiskZone" brz ON ST_Intersects(r2.geom, brz.geom)
        WHERE r2.id >= ${skip} AND r2.id < ${skip + batchSize}
        ORDER BY r2.id, brz."riskLevel" DESC
      ) subquery
      WHERE r.id = subquery.road_id
    `;
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("BpbdRiskService", () => {
  it("should map risk levels correctly", () => {
    expect(mapRiskLevel("Tinggi")).toBe("HIGH");
    expect(mapRiskLevel("Sedang")).toBe("MEDIUM");
    expect(mapRiskLevel("Rendah")).toBe("LOW");
  });

  it("should calculate combined hazard score", () => {
    const score = calculateCombinedHazard(4, 2);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });
});
```

### Integration Tests

```typescript
describe("BPBD Risk Integration", () => {
  it("should import GeoJSON successfully", async () => {
    const result = await bpbdService.importGeoJson(testFilePath);
    expect(result.imported).toBeGreaterThan(0);
    expect(result.errors).toBe(0);
  });

  it("should assign risk to roads via spatial join", async () => {
    const result = await bpbdService.assignRiskToRoads();
    expect(result.assigned).toBeGreaterThan(0);
  });

  it("should update routing costs", async () => {
    const route = await evacuationService.calculateRoute(
      startLat,
      startLon,
      endLat,
      endLon,
    );
    expect(route.segments).toBeDefined();
  });
});
```

### Validation Tests

```typescript
describe("Data Validation", () => {
  it("should have valid geometries", async () => {
    const zones = await prisma.bpbdRiskZone.findMany();
    for (const zone of zones) {
      expect(zone.geom).toBeDefined();
      expect(zone.geometry).toBeDefined();
    }
  });

  it("should have correlation > 0.6", async () => {
    const validation = await bpbdService.validateBpbdVsFrequency();
    expect(validation.correlation).toBeGreaterThan(0.6);
  });
});
```

## Migration Strategy

### Phase 1: Database Setup

1. Create BpbdRiskLevel enum
2. Create BpbdRiskZone table
3. Add columns to Road table
4. Create spatial indexes

### Phase 2: Data Import

1. Run import script for BPBD GeoJSON
2. Verify data integrity
3. Check geometry validity

### Phase 3: Spatial Processing

1. Execute spatial join (assign risk to roads)
2. Calculate combined hazard scores
3. Update routing costs
4. Invalidate caches

### Phase 4: Service Integration

1. Update EvacuationService
2. Update RoadService
3. Add new API endpoints
4. Update documentation

### Phase 5: Frontend Integration

1. Add BPBD risk layer component
2. Update map controls
3. Add legend
4. Test visualization

### Phase 6: Validation & Testing

1. Run validation tests
2. Compare with frequency analysis
3. Performance testing
4. User acceptance testing

## Rollback Plan

If issues occur:

1. Revert database migrations
2. Remove BPBD columns from Road table
3. Restore original weighted overlay logic
4. Clear Redis cache
5. Redeploy previous version

## Monitoring

### Key Metrics

- Import success rate
- Spatial join execution time
- API response times
- Cache hit rates
- Routing performance
- Data correlation scores

### Logging

```typescript
this.logger.log("BPBD import started");
this.logger.log(`Imported ${count} zones`);
this.logger.log(`Spatial join completed in ${duration}ms`);
this.logger.warn(`Low correlation detected: ${correlation}`);
this.logger.error("Import failed", error.stack);
```

## Correctness Properties

### Property 1: Risk Score Consistency

**Validates: Requirements US-2**

All BPBD risk levels must map to valid numeric scores:

- LOW → 1
- MEDIUM → 2
- HIGH → 3

```typescript
property("all risk levels map to valid scores", () => {
  fc.assert(
    fc.property(fc.constantFrom("LOW", "MEDIUM", "HIGH"), (level) => {
      const score = getBpbdRiskScore(level);
      return score >= 1 && score <= 3;
    }),
  );
});
```

### Property 2: Spatial Join Completeness

**Validates: Requirements US-3**

Every road must have a BPBD risk assignment after spatial join:

```typescript
property("all roads have BPBD risk after spatial join", async () => {
  const roads = await prisma.road.findMany();
  const roadsWithoutRisk = roads.filter((r) => !r.bpbdRiskLevel);
  return roadsWithoutRisk.length === 0;
});
```

### Property 3: Combined Hazard Bounds

**Validates: Requirements US-4**

Combined hazard score must always be between 1 and 5:

```typescript
property("combined hazard is bounded", () => {
  fc.assert(
    fc.property(
      fc.float({ min: 1, max: 5 }), // frequency score
      fc.integer({ min: 1, max: 3 }), // BPBD score
      (freqScore, bpbdScore) => {
        const combined = calculateCombinedHazard(freqScore, bpbdScore);
        return combined >= 1 && combined <= 5;
      },
    ),
  );
});
```

### Property 4: Routing Cost Monotonicity

**Validates: Requirements US-6**

Higher risk roads must have higher routing costs:

```typescript
property("higher risk means higher cost", () => {
  fc.assert(
    fc.property(
      fc.record({
        length: fc.float({ min: 0.1, max: 10 }),
        hazard1: fc.float({ min: 1, max: 5 }),
        hazard2: fc.float({ min: 1, max: 5 }),
      }),
      ({ length, hazard1, hazard2 }) => {
        const cost1 = length * (1 + hazard1 * 0.5);
        const cost2 = length * (1 + hazard2 * 0.5);

        if (hazard1 > hazard2) {
          return cost1 > cost2;
        } else if (hazard1 < hazard2) {
          return cost1 < cost2;
        }
        return true;
      },
    ),
  );
});
```

### Property 5: Geometry Validity

**Validates: Requirements AC-1.5**

All imported geometries must be valid PostGIS geometries:

```typescript
property("all BPBD zones have valid geometries", async () => {
  const zones = await prisma.$queryRaw`
    SELECT id, ST_IsValid(geom) as is_valid
    FROM "BpbdRiskZone"
  `;
  return zones.every((z) => z.is_valid);
});
```

## Security Considerations

### Access Control

- Import and spatial join operations require ADMIN role
- Public endpoints (GET zones) are rate-limited
- Validation endpoints require authentication

### Data Validation

- GeoJSON structure validation before import
- Geometry validation using ST_IsValid
- Risk level enum validation
- SQL injection prevention via parameterized queries

### Error Handling

```typescript
try {
  await bpbdService.importGeoJson(filePath);
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestException("Invalid GeoJSON format");
  }
  if (error instanceof DatabaseError) {
    throw new InternalServerErrorException("Database operation failed");
  }
  throw error;
}
```

## Documentation Requirements

### API Documentation (Swagger)

```typescript
@ApiTags("BPBD Risk")
@Controller("bpbd-risk")
export class BpbdRiskController {
  @Get("zones")
  @ApiOperation({ summary: "Get all BPBD risk zones" })
  @ApiQuery({ name: "riskLevel", required: false })
  @ApiResponse({ status: 200, description: "Risk zones retrieved" })
  async getZones(@Query("riskLevel") riskLevel?: string) {
    // ...
  }
}
```

### Code Comments

- Document all spatial operations
- Explain weighted overlay formula
- Describe risk score mapping logic
- Note performance considerations

### User Guide

- How to interpret BPBD risk zones on map
- Understanding combined hazard scores
- Evacuation route recommendations
- Data sources and methodology

## Summary

This design integrates BPBD official risk zone data into the existing evacuation routing system through:

1. **Database Layer**: New BpbdRiskZone table with PostGIS support
2. **Spatial Processing**: ST_Intersects-based spatial join to assign risk to roads
3. **Enhanced Algorithm**: Combined hazard score (50% frequency + 50% BPBD)
4. **Routing Integration**: Updated cost calculation in pgRouting and Dijkstra
5. **Visualization**: New map layer with color-coded risk zones
6. **Validation**: Tools to compare BPBD data with frequency analysis

### Key Benefits

- ✅ Academically stronger (uses official data)
- ✅ More realistic routing recommendations
- ✅ Validation layer for frequency analysis
- ✅ Backward compatible (no breaking changes)
- ✅ Performance optimized (spatial indexes, caching)

### Implementation Complexity

- **Database**: Medium (new table, spatial operations)
- **Backend**: Medium (service enhancements, spatial logic)
- **Frontend**: Low (new layer component)
- **Testing**: Medium (spatial validation, integration tests)

### Estimated Timeline

- Database & Import: 2-3 days
- Spatial Join & Scoring: 2-3 days
- Weighted Overlay Integration: 1-2 days
- Frontend Visualization: 2-3 days
- Testing & Validation: 2-3 days
- **Total: 9-14 days**
