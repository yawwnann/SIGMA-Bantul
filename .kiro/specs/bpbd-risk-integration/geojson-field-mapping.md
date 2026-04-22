# BPBD GeoJSON Field Mapping

## Source File

`backend/Data/GeoJSon/Data Wilayah dengan tingkat resiko gempa.geojson`

## GeoJSON Structure

### Feature Properties Available

Based on the actual BPBD GeoJSON data, each feature contains the following properties:

```json
{
  "ogc_fid": 1,
  "kecamatan": "Kasihan",
  "kode_desa": 2150004.0,
  "kode_kec": 3402150,
  "desa": "Ngestiharjo",
  "luas": 495.456,
  "id_desa": 2150004.0,
  "ir": 3.0,
  "objectid": 81,
  "fid_ia_gem": 6,
  "bahaya": "Rendah",
  "ia_gempa": 1,
  "ta_gempa": 4,
  "skor_ta_ge": 2,
  "tker": 5.0,
  "skor_tker": 3.0,
  "ikap": 2,
  "tkap": 4.0,
  "skor_tkap": 2.0,
  "trisk": 5.0,
  "skor_trisk": 3.0,
  "shape_leng": 14335.112007199999,
  "shape_area": 3878078.7130800001
}
```

## Field Mapping to Database

### Primary Fields

| GeoJSON Field | Database Column | Type             | Description                           |
| ------------- | --------------- | ---------------- | ------------------------------------- |
| `kecamatan`   | `kecamatan`     | VARCHAR(255)     | Nama kecamatan                        |
| `desa`        | `desa`          | VARCHAR(255)     | Nama desa/kelurahan                   |
| `bahaya`      | `bahaya`        | VARCHAR(50)      | Tingkat bahaya (Rendah/Sedang/Tinggi) |
| `bahaya`      | `riskLevel`     | ENUM             | Mapped to LOW/MEDIUM/HIGH             |
| `ia_gempa`    | `iaGempa`       | INTEGER          | Indeks ancaman gempa                  |
| `ta_gempa`    | `taGempa`       | INTEGER          | Tingkat ancaman gempa                 |
| `trisk`       | `tRisk`         | DOUBLE PRECISION | Total risk score                      |
| `skor_trisk`  | `skorTRisk`     | DOUBLE PRECISION | Skor total risk                       |
| `kode_desa`   | `kodeDesa`      | DOUBLE PRECISION | Kode desa                             |
| `kode_kec`    | `kodeKec`       | INTEGER          | Kode kecamatan                        |
| `luas`        | `area`          | DOUBLE PRECISION | Luas wilayah (km²)                    |

### Composite Name Field

```typescript
// Combine kecamatan and desa for display name
name = `${kecamatan} - ${desa}`;
// Example: "Kasihan - Ngestiharjo"
```

## Risk Level Mapping Logic

### From `bahaya` field to `riskLevel` enum:

```typescript
function mapRiskLevel(bahaya: string): BpbdRiskLevel {
  const lower = bahaya?.toLowerCase() || "";

  if (lower.includes("tinggi") || lower.includes("high")) {
    return "HIGH";
  }

  if (
    lower.includes("sedang") ||
    lower.includes("medium") ||
    lower.includes("menengah")
  ) {
    return "MEDIUM";
  }

  // Default to LOW for 'rendah' or any other value
  return "LOW";
}
```

### Expected Values in GeoJSON:

- "Rendah" → LOW
- "Sedang" → MEDIUM
- "Tinggi" → HIGH

## Numeric Risk Scores

### Available Numeric Indicators:

1. **ia_gempa** (Indeks Ancaman Gempa): 1-5 scale
   - Lower value = lower threat
   - Higher value = higher threat

2. **ta_gempa** (Tingkat Ancaman Gempa): 1-5 scale
   - Threat level indicator

3. **trisk** (Total Risk): Composite risk score
   - Combines multiple risk factors

4. **skor_trisk** (Skor Total Risk): Normalized risk score
   - 1-5 scale typically

### Usage in System:

```typescript
// Primary: Use bahaya field for categorical risk
const riskLevel = mapRiskLevel(feature.properties.bahaya);

// Secondary: Store numeric indicators for analysis
const iaGempa = feature.properties.ia_gempa;
const taGempa = feature.properties.ta_gempa;
const tRisk = feature.properties.trisk;

// For validation and correlation analysis
const numericRisk = (iaGempa + taGempa + tRisk) / 3;
```

## Geometry Handling

### Geometry Type: MultiPolygon

```json
{
  "type": "MultiPolygon",
  "coordinates": [
    [
      [
        [110.34180970413469, -7.813429470916081],
        [110.341810000090433, -7.813419999428137],
        [110.341810000115586, -7.813419999482613],
        [110.34180970413469, -7.813429470916081]
      ]
    ]
  ]
}
```

### PostGIS Conversion:

```sql
-- Convert GeoJSON to PostGIS geometry
ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[...]}')

-- Calculate area in km²
ST_Area(ST_GeomFromGeoJSON(...)::geography) / 1000000
```

## Import Script Implementation

### Complete Field Extraction:

```typescript
async function importBpbdZones() {
  const geojson = JSON.parse(fs.readFileSync(geoJsonPath, "utf-8"));

  for (const feature of geojson.features) {
    const props = feature.properties;

    await prisma.$executeRaw`
      INSERT INTO "BpbdRiskZone" (
        kecamatan,
        desa,
        name,
        "riskLevel",
        bahaya,
        "iaGempa",
        "taGempa",
        "tRisk",
        "skorTRisk",
        "kodeDesa",
        "kodeKec",
        geometry,
        geom,
        area
      ) VALUES (
        ${props.kecamatan},
        ${props.desa},
        ${props.kecamatan + " - " + props.desa},
        ${mapRiskLevel(props.bahaya)}::"BpbdRiskLevel",
        ${props.bahaya},
        ${props.ia_gempa},
        ${props.ta_gempa},
        ${props.trisk},
        ${props.skor_trisk},
        ${props.kode_desa},
        ${props.kode_kec},
        ${JSON.stringify(feature.geometry)}::jsonb,
        ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),
        ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})::geography) / 1000000
      )
    `;
  }
}
```

## Data Quality Checks

### Validation Rules:

1. **Required Fields**:
   - `kecamatan` must not be null
   - `desa` must not be null
   - `bahaya` must be one of: Rendah, Sedang, Tinggi
   - `geometry` must be valid MultiPolygon

2. **Numeric Ranges**:
   - `ia_gempa`: 1-5
   - `ta_gempa`: 1-5
   - `trisk`: 1-5
   - `skor_trisk`: 1-5

3. **Geometry Validation**:
   ```sql
   SELECT ST_IsValid(geom) FROM "BpbdRiskZone";
   ```

## Example Query Results

### After Import:

```sql
SELECT
  id,
  name,
  "riskLevel",
  bahaya,
  "iaGempa",
  "taGempa",
  "tRisk",
  area
FROM "BpbdRiskZone"
LIMIT 5;
```

Expected output:

```
id | name                      | riskLevel | bahaya  | iaGempa | taGempa | tRisk | area
---|---------------------------|-----------|---------|---------|---------|-------|-------
1  | Kasihan - Ngestiharjo     | LOW       | Rendah  | 1       | 4       | 5.0   | 3.88
2  | Kasihan - Tirtonirmolo    | LOW       | Rendah  | 1       | 4       | 5.0   | 3.39
3  | Bantul - Palbapang        | MEDIUM    | Sedang  | 2       | 4       | 6.0   | 2.15
4  | Srandakan - Poncosari     | HIGH      | Tinggi  | 3       | 5       | 8.0   | 4.22
```

## Notes

1. **Duplicate Fields**: The GeoJSON contains many duplicate fields (e.g., `bahaya` and `bahaya_2`). We use the primary fields without suffixes.

2. **Coordinate System**: All geometries are in EPSG:4326 (WGS84) coordinate system.

3. **Area Calculation**: The `luas` field in GeoJSON may differ from calculated area. We recalculate using PostGIS for accuracy.

4. **Name Construction**: We create a composite name from kecamatan and desa for better identification.

5. **Risk Score Priority**: We prioritize the categorical `bahaya` field over numeric scores for risk level assignment, but store numeric scores for validation and analysis.
