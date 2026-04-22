# Tasks: BPBD Risk Zone Integration

## Phase 1: Database Setup & Schema

- [x] 1. Create database migration for BPBD risk zones
  - [x] 1.1 Create BpbdRiskLevel enum (LOW, MEDIUM, HIGH)
  - [x] 1.2 Create BpbdRiskZone table with PostGIS geometry
  - [x] 1.3 Add bpbdRiskLevel, bpbdRiskScore, combinedHazard columns to Road table
  - [x] 1.4 Create spatial indexes on geometry columns
  - [x] 1.5 Test migration up and down

- [x] 2. Update Prisma schema
  - [x] 2.1 Add BpbdRiskLevel enum to schema.prisma
  - [x] 2.2 Add BpbdRiskZone model with all fields
  - [x] 2.3 Update Road model with new BPBD fields
  - [x] 2.4 Generate Prisma client
  - [x] 2.5 Verify types are generated correctly

## Phase 2: Data Import & Processing

- [x] 3. Create BPBD GeoJSON import script
  - [x] 3.1 Create scripts/import-bpbd-zones.ts
  - [x] 3.2 Implement GeoJSON file reading and parsing
  - [x] 3.3 Map risk level from properties (KETERANGAN field)
  - [x] 3.4 Insert zones into database with ST_GeomFromGeoJSON
  - [x] 3.5 Calculate and store area using ST_Area
  - [x] 3.6 Add error handling and logging
  - [x] 3.7 Add npm script: "db:import-bpbd"

- [x] 4. Create spatial join script
  - [x] 4.1 Create scripts/assign-bpbd-to-roads.ts
  - [x] 4.2 Implement ST_Intersects spatial join query
  - [x] 4.3 Handle roads intersecting multiple zones (use highest risk)
  - [x] 4.4 Set default LOW risk for roads not intersecting any zone
  - [x] 4.5 Add batch processing for large datasets
  - [x] 4.6 Add progress logging
  - [x] 4.7 Add npm script: "db:assign-bpbd"

## Phase 3: Backend Service Implementation

- [x] 5. Enhance BpbdRiskService
  - [x] 5.1 Add importGeoJson() method
  - [x] 5.2 Add assignRiskToRoads() method with spatial join
  - [x] 5.3 Add recalculateCombinedHazard() method
  - [x] 5.4 Add getRoadRiskStatistics() method
  - [x] 5.5 Add validateBpbdVsFrequency() method
  - [x] 5.6 Implement risk level mapping helper
  - [x] 5.7 Add Redis caching for zones

- [x] 6. Create BpbdRiskController
  - [x] 6.1 Add GET /api/bpbd-risk/zones endpoint
  - [x] 6.2 Add GET /api/bpbd-risk/zones/:id endpoint
  - [x] 6.3 Add POST /api/bpbd-risk/import endpoint (admin only)
  - [x] 6.4 Add POST /api/bpbd-risk/assign-to-roads endpoint (admin only)
  - [x] 6.5 Add GET /api/bpbd-risk/validation endpoint
  - [x] 6.6 Add Swagger documentation
  - [x] 6.7 Add authentication guards

- [x] 7. Update EvacuationService
  - [x] 7.1 Create calculateEnhancedHazardScore() method
  - [x] 7.2 Implement combined hazard formula (50% freq + 50% BPBD)
  - [x] 7.3 Update calculateWeightedOverlay() to use new hazard
  - [x] 7.4 Preserve backward compatibility
  - [x] 7.5 Update cache keys to include BPBD data
  - [x] 7.6 Add unit tests for new hazard calculation

## Phase 4: Routing Integration

- [x] 8. Update RoadService
  - [x] 8.1 Add method to recalculate safe_cost with combined hazard
  - [x] 8.2 Update getRoadNetwork() to include BPBD risk info
  - [x] 8.3 Invalidate cache after BPBD assignment
  - [x] 8.4 Add filtering by BPBD risk level
  - [x] 8.5 Update statistics to include BPBD breakdown

- [x] 9. Update SimpleDijkstraService
  - [x] 9.1 Update calculateEdgeCost() to use combinedHazard
  - [x] 9.2 Ensure cost calculation matches pgRouting
  - [x] 9.3 Add tests for cost calculation
  - [x] 9.4 Document cost formula in comments

- [x] 10. Update pgRouting queries
  - [x] 10.1 Update setup-pgrouting.sql to use safe_cost
  - [x] 10.2 Create script to recalculate safe_cost for all roads
  - [x] 10.3 Test routing with new costs
  - [x] 10.4 Verify routes avoid high-risk areas

## Phase 5: Frontend Implementation

- [x] 11. Create BPBD risk layer component
  - [x] 11.1 Create components/map/bpbd-risk-layer.tsx
  - [x] 11.2 Implement Polygon rendering with Leaflet
  - [x] 11.3 Add color mapping (LOW=green, MEDIUM=yellow, HIGH=red)
  - [x] 11.4 Add hover effects (opacity change)
  - [x] 11.5 Add click handler with Popup
  - [x] 11.6 Implement visibility toggle
  - [x] 11.7 Add loading state

- [x] 12. Create BPBD API client
  - [x] 12.1 Add getBpbdZones() to api/bpbd-risk.ts
  - [x] 12.2 Add getBpbdZoneById() method
  - [x] 12.3 Add importBpbdZones() method (admin)
  - [x] 12.4 Add assignRiskToRoads() method (admin)
  - [x] 12.5 Add getValidation() method
  - [x] 12.6 Export from api/index.ts

- [x] 13. Integrate into map page
  - [x] 13.1 Add BpbdRiskLayer to map-client.tsx
  - [x] 13.2 Add toggle control in sidebar
  - [x] 13.3 Add legend for risk levels
  - [x] 13.4 Update layer controls UI
  - [x] 13.5 Test layer visibility toggle
  - [x] 13.6 Ensure performance with many polygons

- [x] 14. Create admin management page
  - [x] 14.1 Create app/admin/bpbd-risk/page.tsx
  - [x] 14.2 Add import button and status display
  - [x] 14.3 Add assign-to-roads button
  - [x] 14.4 Show statistics (zones by risk level)
  - [x] 14.5 Add validation report display
  - [x] 14.6 Add error handling and notifications

## Phase 6: Testing & Validation

- [x] 15. Write unit tests
  - [x] 15.1 Test risk level mapping function
  - [x] 15.2 Test combined hazard calculation
  - [x] 15.3 Test BPBD score normalization
  - [x] 15.4 Test cost calculation with combined hazard
  - [x] 15.5 Achieve >80% code coverage

- [ ] 16. Write integration tests
  - [ ] 16.1 Test GeoJSON import process
  - [ ] 16.2 Test spatial join execution
  - [ ] 16.3 Test API endpoints (GET zones, POST import)
  - [ ] 16.4 Test routing with BPBD data
  - [ ] 16.5 Test cache invalidation

- [ ] 17. Write property-based tests
  - [ ] 17.1 Property: Risk scores are bounded (1-3 for BPBD)
  - [ ] 17.2 Property: Combined hazard is bounded (1-5)
  - [ ] 17.3 Property: All roads have BPBD risk after join
  - [ ] 17.4 Property: Higher risk means higher cost
  - [ ] 17.5 Property: All geometries are valid

- [x] 18. Perform data validation
  - [x] 18.1 Run validation endpoint
  - [x] 18.2 Check correlation between BPBD and frequency
  - [x] 18.3 Identify and document disagreements
  - [x] 18.4 Verify spatial join completeness
  - [x] 18.5 Check geometry validity

## Phase 7: Documentation & Deployment

- [ ] 19. Update documentation
  - [ ] 19.1 Document BPBD integration in README
  - [ ] 19.2 Add API documentation (Swagger)
  - [ ] 19.3 Document weighted overlay formula changes
  - [ ] 19.4 Create user guide for BPBD layer
  - [ ] 19.5 Document import and assignment process

- [ ] 20. Performance optimization
  - [ ] 20.1 Verify spatial indexes are used
  - [ ] 20.2 Test API response times (<500ms)
  - [ ] 20.3 Test spatial join performance (<30s)
  - [ ] 20.4 Optimize frontend layer rendering
  - [ ] 20.5 Implement Redis caching strategy

- [ ] 21. Deployment preparation
  - [ ] 21.1 Create database migration files
  - [ ] 21.2 Prepare import scripts for production
  - [ ] 21.3 Update environment variables if needed
  - [ ] 21.4 Create rollback plan
  - [ ] 21.5 Test in staging environment

- [ ] 22. Final validation
  - [ ] 22.1 Run all tests (unit, integration, e2e)
  - [ ] 22.2 Verify all 12,230 roads have BPBD risk
  - [ ] 22.3 Test routing produces different results
  - [ ] 22.4 Verify map visualization works correctly
  - [ ] 22.5 Check performance metrics
  - [ ] 22.6 Get stakeholder approval
