require("dotenv").config();

const prisma = require("../src/config/db");
const { processValidation2ForBatch } = require("../src/services/validationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batchId") out.batchId = argv[i + 1];
    if (a === "--limit") out.limit = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
  }
  return out;
};

const main = async () => {
  const { batchId, limit, skipRun } = parseArgs(process.argv.slice(2));
  const bId = Number.parseInt(String(batchId ?? "").trim(), 10);
  if (!Number.isFinite(bId)) {
    throw new Error(
      "Missing/invalid --batchId. Example: node scripts/verifyValidation2EndToEnd.js --batchId 123"
    );
  }
  const topN = Math.max(1, Number.parseInt(String(limit ?? "25"), 10) || 25);

  const before = await prisma.batch.findUnique({
    where: { id: bId },
    select: {
      id: true,
      fileType: true,
      validation_1: true,
      validation_1_status: true,
      validation_2: true,
      validation_2_status: true,
      validation_3: true,
      validation_3_status: true,
      userId: true,
    },
  });

  if (!before) throw new Error(`Batch not found: ${bId}`);

  console.log("\n[verifyValidation2EndToEnd] Batch before:");
  console.table([before]);

  if (!skipRun) {
    console.log(`\n[verifyValidation2EndToEnd] Running processValidation2ForBatch(${bId}) ...`);
    await processValidation2ForBatch(bId);
  } else {
    console.log(`\n[verifyValidation2EndToEnd] Skipping rerun (read-only report mode)`);
  }

  const after = await prisma.batch.findUnique({
    where: { id: bId },
    select: {
      id: true,
      fileType: true,
      validation_1: true,
      validation_1_status: true,
      validation_2: true,
      validation_2_status: true,
      validation_3: true,
      validation_3_status: true,
      updatedAt: true,
    },
  });

  console.log("\n[verifyValidation2EndToEnd] Batch after:");
  console.table([after]);

  const totalItems =
    before.fileType === "execution"
      ? await prisma.execution.count({ where: { batchId: bId } })
      : await prisma.order.count({ where: { batchId: bId } });

  const totalErrors = await prisma.validationError.count({
    where: {
      batchId: bId,
      validationLevel: 2,
    },
  });

  const grouped = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: {
      batchId: bId,
      validationLevel: 2,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  console.log("\n[verifyValidation2EndToEnd] Summary:");
  console.table([
    {
      batchId: bId,
      fileType: before.fileType,
      totalRecords: totalItems,
      validation2Status: after?.validation_2_status ?? null,
      validation2Passed: after?.validation_2 ?? null,
      totalValidation2Errors: totalErrors,
      topErrorGroupsShown: grouped.length,
    },
  ]);

  console.log(`\n[verifyValidation2EndToEnd] Top ${grouped.length} Validation 2 error groups (field + message):`);
  console.table(
    grouped.map((g) => ({
      count: g._count.id,
      field: g.field,
      message: g.message,
    }))
  );

  console.log("\n[verifyValidation2EndToEnd] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[verifyValidation2EndToEnd] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
