# Requirements: BPBD Risk Zone Integration

## Feature Name

bpbd-risk-integration

## Overview

Integrate official BPBD (Badan Penanggulangan Bencana Daerah) earthquake risk zone data into the existing WebGIS evacuation routing system to enhance hazard calculation accuracy and improve evacuation route safety recommendations.

## Background

The current system uses:

- Earthquake frequency analysis for hazard scoring
- Road condition and vulnerability assessment
- Distance-based calculations for weighted overlay

The BPBD provides official risk zone polygons with categorical risk levels (LOW, MEDIUM, HIGH) that represent authoritative disaster management data. Integrating this data will:

- Add official validation layer to the system
- Improve academic credibility
- Align with real-world disaster management practices
- Enhance weighted overlay accuracy

## User Stories

### US-1: As a GIS Engineer

**I want** the system to import BPBD risk zone GeoJSON data into the database
**So that** official risk zones are available for spatial analysis

**Acceptance Criteria:**

- AC-1.1: System can parse BPBD GeoJSON file containing polygon geometries
- AC-1.2: Risk zones are stored in PostgreSQL with PostGIS geometry support
- AC-1.3: Each zone has a risk_level field (LOW, MEDIUM, HIGH)
- AC-1.4: Spatial index is created on geometry column for performance
- AC-1.5: SRID is set to 4326 (WGS84) for consistency

### US-2: As a Backend Developer

**I want** risk levels to be converted to numeric scores
**So that** they can be used in mathematical calculations

**Acceptance Criteria:**

- AC-2.1: LOW risk maps to score 1
- AC-2.2: MEDIUM risk maps to score 2
- AC-2.3: HIGH risk maps to score 3
- AC-2.4: Mapping is consistent across the system
- AC-2.5: Score calculation is documented in code

### US-3: As a Routing Algorithm Developer

**I want** each road segment to know which BPBD risk zone it intersects
**So that** road hazard scores can be calculated accurately

**Acceptance Criteria:**

- AC-3.1: System performs spatial join between roads and risk zones
- AC-3.2: Uses ST_Intersects() for accurate spatial matching
- AC-3.3: Roads intersecting multiple zones use the highest risk level
- AC-3.4: Roads not intersecting any zone default to LOW risk
- AC-3.5: Spatial join results are stored for performance

### US-4: As a Disaster Management Analyst

**I want** the weighted overlay formula to incorporate BPBD risk zones
**So that** evacuation routes consider official risk assessments

**Acceptance Criteria:**

- AC-4.1: Hazard score combines earthquake frequency AND BPBD risk zone
- AC-4.2: Formula: Hazard = (frequency_score _ 0.5) + (bpbd_zone_score _ 0.5)
- AC-4.3: Overall weighted overlay remains: Score = (Hazard _ 0.5) + (Condition _ 0.3) + (Distance \* 0.2)
- AC-4.4: Existing system logic is preserved (no breaking changes)
- AC-4.5: New hazard calculation is documented

### US-5: As a System Administrator

**I want** road risk scores to be recalculated with BPBD data
**So that** routing uses the most accurate hazard information

**Acceptance Criteria:**

- AC-5.1: System provides script/endpoint to recalculate all road risk scores
- AC-5.2: Calculation uses updated hazard formula with BPBD zones
- AC-5.3: Process can be run manually or scheduled
- AC-5.4: Progress and results are logged
- AC-5.5: Cache is invalidated after recalculation

### US-6: As a Routing Service

**I want** pgRouting to use updated risk scores as edge costs
**So that** routes avoid high-risk areas

**Acceptance Criteria:**

- AC-6.1: pgRouting queries use risk_score or safe_cost column
- AC-6.2: Higher risk scores result in higher routing costs
- AC-6.3: Dijkstra algorithm finds safest (lowest cost) paths
- AC-6.4: Both pgRouting and fallback Dijkstra use same scoring
- AC-6.5: Route calculation performance remains acceptable (< 2s)

### US-7: As a Frontend User

**I want** to see BPBD risk zones on the map
**So that** I can understand official risk assessments visually

**Acceptance Criteria:**

- AC-7.1: Map has toggleable layer for BPBD risk zones
- AC-7.2: LOW zones display in green (#10b981)
- AC-7.3: MEDIUM zones display in yellow (#f59e0b)
- AC-7.4: HIGH zones display in red (#ef4444)
- AC-7.5: Zones have appropriate opacity (0.3-0.5) to not obscure other layers
- AC-7.6: Clicking a zone shows risk level and area name
- AC-7.7: Layer loads efficiently without blocking map interaction

### US-8: As a Data Quality Analyst

**I want** validation tools to compare BPBD zones with frequency analysis
**So that** I can ensure data consistency and identify discrepancies

**Acceptance Criteria:**

- AC-8.1: System provides endpoint to compare BPBD zones vs frequency analysis
- AC-8.2: Report shows areas where BPBD and frequency data disagree
- AC-8.3: Statistics show correlation between both datasets
- AC-8.4: Results help identify data quality issues
- AC-8.5: Validation can be run on-demand

## Technical Requirements

### TR-1: Database Schema

- New table: `bpbd_risk_zones`
- Columns: id, name, risk_level (enum), geom (PostGIS Polygon), area, created_at, updated_at
- Spatial index on geom column
- Foreign key constraints where applicable

### TR-2: Data Import

- Script to import GeoJSON: `scripts/import-bpbd-zones.ts`
- Validates GeoJSON structure before import
- Handles MultiPolygon and Polygon geometries
- Logs import progress and errors
- Idempotent (can be run multiple times safely)

### TR-3: Spatial Operations

- Use PostGIS ST_Intersects for road-zone matching
- Use ST_Area for zone area calculation
- Use ST_AsGeoJSON for API responses
- Optimize queries with spatial indexes

### TR-4: API Endpoints

- GET /api/bpbd-risk/zones - List all risk zones
- GET /api/bpbd-risk/zones/:id - Get specific zone
- POST /api/bpbd-risk/recalculate-roads - Trigger road score recalculation
- GET /api/bpbd-risk/validation - Compare BPBD vs frequency data

### TR-5: Performance

- Spatial join should complete in < 30 seconds for ~12,000 roads
- API responses should return in < 500ms
- Map layer should load in < 2 seconds
- Use Redis caching for frequently accessed data

### TR-6: Backward Compatibility

- Existing evacuation routes continue to work
- Old weighted overlay formula remains available
- System gracefully handles missing BPBD data
- No breaking changes to existing APIs

## Non-Functional Requirements

### NFR-1: Data Integrity

- BPBD data source is documented
- Import process is auditable
- Data versioning is tracked
- Backup before major operations

### NFR-2: Maintainability

- Code is well-documented with comments
- SQL scripts are version controlled
- Configuration is externalized
- Logging is comprehensive

### NFR-3: Scalability

- System handles additional risk zones efficiently
- Spatial queries are optimized
- Caching strategy is implemented
- Database indexes are properly maintained

### NFR-4: Testability

- Unit tests for risk score calculations
- Integration tests for spatial joins
- API endpoint tests
- Validation tests for data quality

## Out of Scope

- Real-time BPBD data synchronization (manual import only)
- Predictive risk modeling
- Historical risk zone changes tracking
- Multi-hazard integration (only earthquake risk)
- Mobile app integration
- Public API for external systems

## Dependencies

- PostgreSQL 14+ with PostGIS 3.3+
- pgRouting extension installed
- NestJS backend framework
- Prisma ORM
- Redis for caching
- Next.js frontend with Leaflet

## Success Metrics

- All 12,230+ road segments have BPBD risk scores assigned
- Spatial join completes successfully
- Weighted overlay produces different (improved) routes
- Map visualization displays correctly
- API response times meet performance targets
- Zero data corruption or loss
- System passes validation tests

## Risks and Mitigations

### Risk 1: BPBD GeoJSON format incompatibility

**Mitigation:** Validate GeoJSON structure before import, provide clear error messages

### Risk 2: Performance degradation with spatial joins

**Mitigation:** Use spatial indexes, optimize queries, implement caching

### Risk 3: Conflicting risk assessments (BPBD vs frequency)

**Mitigation:** Use weighted average, provide validation tools, document methodology

### Risk 4: Breaking existing functionality

**Mitigation:** Comprehensive testing, backward compatibility, feature flags

## Timeline Estimate

- Phase 1 (Database & Import): 2-3 days
- Phase 2 (Spatial Join & Scoring): 2-3 days
- Phase 3 (Weighted Overlay Integration): 1-2 days
- Phase 4 (Frontend Visualization): 2-3 days
- Phase 5 (Testing & Validation): 2-3 days
- **Total: 9-14 days**

## References

- BPBD GeoJSON file: `backend/Data/GeoJSon/Data Wilayah dengan tingkat resiko gempa.geojson`
- Existing hazard zone implementation: `backend/src/hazard-zone/`
- Evacuation service: `backend/src/evacuation/evacuation.service.ts`
- Road service: `backend/src/road/road.service.ts`
