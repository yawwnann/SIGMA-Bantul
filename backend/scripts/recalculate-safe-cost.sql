-- Recalculate safe_cost for all roads using combined hazard
-- This script should be run after BPBD risk assignment

-- 1. Recalculate safe_cost with combined hazard
-- Formula: safe_cost = length * (1 + combinedHazard * 0.5)
UPDATE "Road"
SET 
  safe_cost = length_m * (1 + COALESCE("combinedHazard", 2) * 0.5),
  "updatedAt" = NOW()
WHERE geom IS NOT NULL;

-- 2. Show statistics before and after
SELECT 
  'After Recalculation' as status,
  COUNT(*) as total_roads,
  COUNT(CASE WHEN safe_cost IS NOT NULL THEN 1 END) as roads_with_safe_cost,
  AVG(safe_cost) as avg_safe_cost,
  MIN(safe_cost) as min_safe_cost,
  MAX(safe_cost) as max_safe_cost,
  AVG("combinedHazard") as avg_combined_hazard
FROM "Road";

-- 3. Show distribution by BPBD risk level
SELECT 
  "bpbdRiskLevel",
  COUNT(*) as count,
  AVG(safe_cost) as avg_safe_cost,
  AVG("combinedHazard") as avg_hazard,
  MIN(safe_cost) as min_cost,
  MAX(safe_cost) as max_cost
FROM "Road"
WHERE "bpbdRiskLevel" IS NOT NULL
GROUP BY "bpbdRiskLevel"
ORDER BY 
  CASE "bpbdRiskLevel"
    WHEN 'LOW' THEN 1
    WHEN 'MEDIUM' THEN 2
    WHEN 'HIGH' THEN 3
  END;

-- Done!
SELECT '✅ Safe cost recalculation complete!' as status;
