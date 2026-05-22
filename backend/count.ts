import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.road.count();
  console.log('Total roads:', count);
}
main().finally(() => prisma.$disconnect());
