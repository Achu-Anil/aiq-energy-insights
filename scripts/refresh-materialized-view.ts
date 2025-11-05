import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function refreshMaterializedView() {
  console.log("🔄 Refreshing state_generation_mv...");

  try {
    await prisma.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY state_generation_mv;
    `;
    console.log("✅ Materialized view refreshed successfully!");
  } catch (error) {
    console.error("❌ Error refreshing materialized view:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

refreshMaterializedView();
