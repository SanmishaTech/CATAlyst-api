require("dotenv").config();

const prisma = require("../src/config/db");
const { processBatchValidation } = require("../src/services/validationService");

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
      "Missing/invalid --batchId. Example: node backend/scripts/verifyValidation1EndToEnd.js --batchId 123"
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

  console.log("\n[verifyValidation1EndToEnd] Batch before:");
  console.table([before]);

  if (!skipRun) {
    console.log(
      `\n[verifyValidation1EndToEnd] Running processBatchValidation(${bId}) ...`
    );
    await processBatchValidation(bId);
  } else {
    console.log(`\n[verifyValidation1EndToEnd] Skipping rerun (read-only report mode)`);
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

  console.log("\n[verifyValidation1EndToEnd] Batch after:");
  console.table([after]);

  const totalItems =
    before.fileType === "execution"
      ? await prisma.execution.count({ where: { batchId: bId } })
      : await prisma.order.count({ where: { batchId: bId } });

  const totalErrors = await prisma.validationError.count({
    where: {
      batchId: bId,
      validationLevel: 1,
    },
  });

  const grouped = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: {
      batchId: bId,
      validationLevel: 1,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  console.log("\n[verifyValidation1EndToEnd] Summary:");
  console.table([
    {
      batchId: bId,
      fileType: before.fileType,
      totalRecords: totalItems,
      validation1Status: after?.validation_1_status ?? null,
      validation1Passed: after?.validation_1 ?? null,
      totalValidation1Errors: totalErrors,
      topErrorGroupsShown: grouped.length,
    },
  ]);

  console.log(
    `\n[verifyValidation1EndToEnd] Top ${grouped.length} Validation 1 error groups (field + message):`
  );
  console.table(
    grouped.map((g) => ({
      count: g._count.id,
      field: g.field,
      message: g.message,
    }))
  );

  console.log("\n[verifyValidation1EndToEnd] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[verifyValidation1EndToEnd] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
