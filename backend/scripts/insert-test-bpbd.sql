-- Insert test BPBD zones for testing
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
  area,
  "createdAt",
  "updatedAt"
) VALUES 
(
  'Kasihan',
  'Ngestiharjo',
  'Kasihan - Ngestiharjo',
  'LOW',
  'Rendah',
  1,
  4,
  5.0,
  3.0,
  2150004.0,
  3402150,
  '{"type": "MultiPolygon", "coordinates": [[[[110.34180970413469, -7.813429470916081], [110.341810000090433, -7.813419999428137], [110.341810000115586, -7.813419999482613], [110.34180970413469, -7.813429470916081]]]]}',
  ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[110.34180970413469, -7.813429470916081], [110.341810000090433, -7.813419999428137], [110.341810000115586, -7.813419999482613], [110.34180970413469, -7.813429470916081]]]]}'),
  0.1,
  NOW(),
  NOW()
),
(
  'Bantul',
  'Sabdodadi',
  'Bantul - Sabdodadi',
  'MEDIUM',
  'Sedang',
  2,
  3,
  4.0,
  2.0,
  3402010,
  3402010,
  '{"type": "MultiPolygon", "coordinates": [[[[110.35, -7.82], [110.36, -7.82], [110.36, -7.83], [110.35, -7.83], [110.35, -7.82]]]]}',
  ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[110.35, -7.82], [110.36, -7.82], [110.36, -7.83], [110.35, -7.83], [110.35, -7.82]]]]}'),
  1.0,
  NOW(),
  NOW()
),
(
  'Sewon',
  'Panggungharjo',
  'Sewon - Panggungharjo',
  'HIGH',
  'Tinggi',
  3,
  2,
  3.0,
  1.0,
  3402170,
  3402170,
  '{"type": "MultiPolygon", "coordinates": [[[[110.37, -7.84], [110.38, -7.84], [110.38, -7.85], [110.37, -7.85], [110.37, -7.84]]]]}',
  ST_GeomFromGeoJSON('{"type": "MultiPolygon", "coordinates": [[[[110.37, -7.84], [110.38, -7.84], [110.38, -7.85], [110.37, -7.85], [110.37, -7.84]]]]}'),
  1.5,
  NOW(),
  NOW()
);

-- Check the inserted data
SELECT COUNT(*) as total_zones FROM "BpbdRiskZone";
SELECT "riskLevel", COUNT(*) as count FROM "BpbdRiskZone" GROUP BY "riskLevel";