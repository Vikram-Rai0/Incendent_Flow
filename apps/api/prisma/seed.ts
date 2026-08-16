import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Two fake users to act as our two "responders" racing the claim
  const userA = await prisma.user.upsert({
    where: { email: "alex@incidentflow.dev" },
    update: {},
    create: {
      email: "alex@incidentflow.dev",
      passwordHash: "placeholder", // real hashing comes with auth module
      name: "Alex",
      role: "RESPONDER",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "sam@incidentflow.dev" },
    update: {},
    create: {
      email: "sam@incidentflow.dev",
      passwordHash: "placeholder",
      name: "Sam",
      role: "RESPONDER",
    },
  });

  const incident = await prisma.incident.create({
    data: {
      title: "API latency spike",
      description: "P99 latency up 400% since 14:02 UTC",
      severity: "SEV2",
      status: "INVESTIGATING",
      createdBy: userA.id,
    },
  });

  const task = await prisma.task.create({
    data: {
      incidentId: incident.id,
      title: "Check database connection pool health",
      status: "UNCLAIMED",
    },
  });

  console.log("Seeded:");
  console.log({ userA: userA.id, userB: userB.id, incident: incident.id, task: task.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());