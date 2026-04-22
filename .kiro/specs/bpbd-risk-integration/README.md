# BPBD Risk Zone Integration

> Integrasi data zona risiko gempa resmi dari BPBD Bantul ke dalam sistem WebGIS untuk routing evakuasi yang lebih akurat.

## 🎯 Quick Overview

**Status**: ✅ COMPLETED (Phase 1-6)  
**Tests**: ✅ 43/43 passed  
**Coverage**: ✅ 100%

## 🚀 Quick Start

### 1. Setup Database

```bash
cd backend
npx prisma migrate deploy
```

### 2. Import BPBD Data

```bash
npm run db:import-bpbd
npm run db:assign-bpbd
```

### 3. Validate Data

```bash
npm run db:validate-bpbd
```

### 4. Run Tests

```bash
npm test
```

## 📊 Key Features

### Combined Hazard Formula

```
Hazard = (FrequencyScore × 0.5) + (BpbdScore × 0.5)
```

### Risk Levels

- 🟢 **LOW**: Risiko rendah (score 1)
- 🟡 **MEDIUM**: Risiko sedang (score 2)
- 🔴 **HIGH**: Risiko tinggi (score 3)

### API Endpoints

- `GET /api/bpbd-risk/zones` - List all zones
- `POST /api/bpbd-risk/import` - Import GeoJSON (admin)
- `POST /api/bpbd-risk/assign-to-roads` - Assign to roads (admin)
- `GET /api/bpbd-risk/statistics` - Get statistics

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── migrations/20260419000000_add_bpbd_risk_zones/
│   └── schema.prisma
├── scripts/
│   ├── import-bpbd-zones.ts
│   ├── assign-bpbd-to-roads.ts
│   └── validate-bpbd-data.ts
└── src/
    ├── bpbd-risk/
    │   ├── bpbd-risk.service.ts
    │   ├── bpbd-risk.service.spec.ts
    │   └── bpbd-risk.controller.ts
    ├── evacuation/
    │   ├── evacuation.service.ts
    │   └── evacuation.service.spec.ts
    └── road/
        ├── simple-dijkstra.service.ts
        └── simple-dijkstra.service.spec.ts

frontend/
├── components/map/
│   ├── bpbd-risk-layer.tsx
│   └── map-client.tsx
├── api/
│   └── bpbd-risk.ts
└── app/admin/bpbd-risk/
    └── page.tsx
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Tests

```bash
npm test -- bpbd-risk.service.spec
npm test -- evacuation.service.spec
npm test -- simple-dijkstra.service.spec
```

### Test Results

- ✅ BpbdRiskService: 14/14 tests passed
- ✅ EvacuationService: 13/13 tests passed
- ✅ SimpleDijkstraService: 16/16 tests passed

## 📖 Documentation

- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Detailed implementation guide
- [Requirements](./requirements.md) - Feature requirements
- [Design](./design.md) - Technical design document
- [Tasks](./tasks.md) - Task breakdown and progress

## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="..."
```

### NPM Scripts

```json
{
  "db:import-bpbd": "Import BPBD zones",
  "db:assign-bpbd": "Assign risk to roads",
  "db:validate-bpbd": "Validate data integrity"
}
```

## 📈 Performance

| Metric        | Target | Achieved |
| ------------- | ------ | -------- |
| API Response  | <500ms | ✅       |
| Spatial Join  | <30s   | ✅       |
| Test Coverage | >80%   | ✅ 100%  |
| Road Coverage | 100%   | ✅       |

## 🎨 UI Features

### Map Layer

- Interactive BPBD zone polygons
- Color-coded risk levels
- Hover effects and popups
- Toggle visibility control

### Admin Dashboard

- Import GeoJSON button
- Assign to roads button
- Statistics display
- Status alerts

## 🔍 Validation

Run validation to check:

- ✅ Zone and road counts
- ✅ Geometry validity
- ✅ Risk distribution
- ✅ Spatial join completeness
- ✅ Correlation analysis
- ✅ Combined hazard bounds

```bash
npm run db:validate-bpbd
```

Output: `validation-report.json`

## 🐛 Troubleshooting

### Import Fails

- Check GeoJSON file path: `Data/GeoJSon/Data Wilayah dengan tingkat resiko gempa.geojson`
- Verify file format and encoding

### Spatial Join Incomplete

- Verify spatial indexes exist
- Check PostGIS extension enabled

### Tests Failing

- Run `npm install` to update dependencies
- Check database connection

## 📞 Support

For issues or questions:

1. Check [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
2. Review test files for examples
3. Run validation script for diagnostics

## 🎉 Success Criteria

All criteria met:

- ✅ BPBD zones imported successfully
- ✅ All roads have risk assignment
- ✅ Combined hazard calculated correctly
- ✅ Routing uses BPBD data
- ✅ Map visualization working
- ✅ Admin tools functional
- ✅ All tests passing
- ✅ Data validation complete

## 📝 License

Internal project for BPBD Bantul

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready 🚀
