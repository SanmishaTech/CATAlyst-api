require("dotenv").config();

const prisma = require("../src/config/db");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[i + 1];
    if (a === "--restoreLatestV1OrderSchema") out.restoreLatestV1OrderSchema = true;
  }
  return out;
};

const main = async () => {
  const { email, restoreLatestV1OrderSchema } = parseArgs(process.argv.slice(2));
  const targetEmail = String(email || "client1@example.com").trim();

  const user = await prisma.user.findFirst({
    where: { email: targetEmail },
    select: { id: true, email: true, role: true, clientId: true },
  });

  console.log("\n[checkClient1V1Setup] user:");
  console.table(user ? [user] : []);

  if (!user) {
    throw new Error(`User not found for email: ${targetEmail}`);
  }

  if (!user.clientId) {
    throw new Error(`User ${user.id} has no clientId`);
  }

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { id: true, name: true, validation_1: true, exe_validation_1: true },
  });

  console.log("\n[checkClient1V1Setup] client:");
  console.table([
    {
      id: client?.id ?? null,
      name: client?.name ?? null,
      hasValidation1: !!client?.validation_1,
      validation1Type: typeof client?.validation_1,
      hasExeValidation1: !!client?.exe_validation_1,
      exeValidation1Type: typeof client?.exe_validation_1,
    },
  ]);

  const latestV1OrderSchemaHistory = await prisma.validationSchemaHistory.findMany({
    where: {
      clientId: user.clientId,
      validationType: 1,
      fileType: "ORDER",
    },
    orderBy: { id: "desc" },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      changedBy: true,
      schema: true,
    },
  });

  console.log("\n[checkClient1V1Setup] latest V1 ORDER schema history (up to 5):");
  console.table(
    (latestV1OrderSchemaHistory || []).map((h) => ({
      id: h.id,
      createdAt: h.createdAt,
      changedBy: h.changedBy,
      schemaLen: (h.schema || "").length,
    }))
  );

  if (restoreLatestV1OrderSchema) {
    const latest = (latestV1OrderSchemaHistory || [])[0];
    if (!latest?.schema) {
      throw new Error(
        `[checkClient1V1Setup] Cannot restore schema: no V1 ORDER schema history found for clientId=${user.clientId}`
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(latest.schema);
    } catch (e) {
      throw new Error(
        `[checkClient1V1Setup] Cannot restore schema: latest history id=${latest.id} is not valid JSON (${e?.message ? String(e.message) : "parse error"})`
      );
    }

    await prisma.client.update({
      where: { id: user.clientId },
      data: { validation_1: parsed },
    });

    console.log(
      `\n[checkClient1V1Setup] Restored client.validation_1 from history id=${latest.id} (schemaLen=${(latest.schema || "").length})`
    );
  }

  const latestPassedOrdersBatch = await prisma.batch.findFirst({
    where: {
      userId: user.id,
      validation_1_status: "passed",
      OR: [{ fileType: null }, { fileType: { not: "execution" } }],
    },
    orderBy: { id: "desc" },
    select: { id: true, fileType: true, validation_1: true, validation_1_status: true },
  });

  console.log("\n[checkClient1V1Setup] latest passed V1 orders batch:");
  console.table(latestPassedOrdersBatch ? [latestPassedOrdersBatch] : []);

  const clientsWithAnyV1 = await prisma.client.findMany({
    where: {
      OR: [{ validation_1: { not: null } }, { exe_validation_1: { not: null } }],
    },
    select: { id: true, name: true, validation_1: true, exe_validation_1: true },
    take: 10,
    orderBy: { id: "asc" },
  });

  console.log("\n[checkClient1V1Setup] first 10 clients with any V1 schema:");
  console.table(
    (clientsWithAnyV1 || []).map((c) => ({
      id: c.id,
      name: c.name,
      hasValidation1: !!c.validation_1,
      hasExeValidation1: !!c.exe_validation_1,
    }))
  );

  console.log("\n[checkClient1V1Setup] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[checkClient1V1Setup] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
