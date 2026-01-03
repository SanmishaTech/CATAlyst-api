require("dotenv").config();

const prisma = require("../src/config/db");

const main = async () => {
  const clientCount = await prisma.client.count({
    where: { exe_validation_1: { not: null } },
  });

  const clients = await prisma.client.findMany({
    where: { exe_validation_1: { not: null } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
    take: 20,
  });

  const userCountWithClient = await prisma.user.count({
    where: { clientId: { not: null } },
  });

  const usersWithExeSchema = await prisma.user.findMany({
    where: {
      clientId: { not: null },
      client: { exe_validation_1: { not: null } },
    },
    select: { id: true, email: true, clientId: true },
    orderBy: { id: "asc" },
    take: 20,
  });

  const executionCount = await prisma.execution.count();
  const executionBatchCount = await prisma.batch.count({
    where: { fileType: "execution" },
  });

  console.log("\n[precheckExecutionValidation1]");
  console.table([
    {
      clientsWithExeValidation1: clientCount,
      usersWithClientId: userCountWithClient,
      usersWhoseClientHasExeValidation1: usersWithExeSchema.length,
      executionRows: executionCount,
      executionBatches: executionBatchCount,
    },
  ]);

  if (clients.length) {
    console.log("\nClients with exe_validation_1 (top 20):");
    console.table(clients);
  }

  if (usersWithExeSchema.length) {
    console.log("\nUsers whose client has exe_validation_1 (top 20):");
    console.table(usersWithExeSchema);
  }

  // Also show if there exists at least one execution batch that already passed V1
  const passedExecutionBatch = await prisma.batch.findFirst({
    where: {
      fileType: "execution",
      validation_1_status: "passed",
    },
    select: { id: true, userId: true, validation_1: true, validation_1_status: true },
    orderBy: { id: "desc" },
  });

  console.log("\nLatest execution batch with validation_1_status='passed':");
  console.table([passedExecutionBatch || { batch: null }]);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[precheckExecutionValidation1] Error:");
    console.error(err);
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  });
