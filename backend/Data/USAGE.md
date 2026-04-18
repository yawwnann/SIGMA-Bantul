# GeoJSON Data Usage

## Files Available

- `34.02_Bantul.geojson` - Batas administratif Kabupaten Bantul (MultiPolygon)
- `34.02_kecamatan.geojson` - Batas kecamatan di Kabupaten Bantul
- `34.02_kelurahan.geojson` - Batas kelurahan di Kabupaten Bantul

## API Endpoint

### Get Bantul Boundary

```
GET /api/analysis/bantul-boundary
```

Returns the complete GeoJSON FeatureCollection for Kabupaten Bantul administrative boundary.

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "kd_propinsi": "34",
          "kd_dati2": "02",
          "nm_dati2": "Bantul"
        },
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [...]
        }
      }
    ]
  }
}
```

## Caching

The boundary data is cached in Redis for 24 hours since administrative boundaries rarely change.

## Frontend Usage

The boundary is automatically loaded in the frequency analysis map component:

```typescript
import { analysisApi } from '@/api/analysis';

const boundary = await analysisApi.getBantulBoundary();
```

The map component uses this data to:

1. Display accurate administrative boundary outline
2. Create a mask layer that dims areas outside Bantul
3. Calculate proper map bounds and center
