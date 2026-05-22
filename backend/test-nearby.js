const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const lat = -7.8;
    const lon = 110.3;
    const radiusMeters = 3000;
    const limit = 10;
    
    console.log("Running query...");
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        category,
        capacity,
        "currentOccupancy",
        geometry,
        address,
        condition,
        status,
        facilities,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) as distance
      FROM "EvacuationLocation"
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      LIMIT ${limit}
    `;
    console.log("Success:", result);
  } catch (err) {
    console.error("Query failed!");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
