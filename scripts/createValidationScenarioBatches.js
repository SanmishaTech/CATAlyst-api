require("dotenv").config();

const prisma = require("../src/config/db");
const {
  processValidation2ForBatch,
  processValidation3ForBatch,
} = require("../src/services/validationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--templateBatchId") out.templateBatchId = argv[i + 1];
    if (a === "--limit") out.limit = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
  }
  return out;
};

const makeScenarioId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const getExchangeDestinationSample = async () => {
  const row = await prisma.uSBrokerDealer.findFirst({
    where: {
      membershipType: "Exchange",
      clientId: { not: null },
    },
    select: { clientId: true },
    orderBy: { id: "asc" },
  });
  return row?.clientId ? String(row.clientId).trim() : null;
};

const getValidFirmIdSample = async () => {
  const row = await prisma.client.findFirst({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return row?.id ?? null;
};

const withV2SafeDefaults = (fields) => ({
  // keep V2 comparisons deterministic across template orders
  orderQuantity: "1000",
  orderLeavesQty: "0",
  orderCumQty: "0",
  orderMinimumQty: null,
  ...(fields || {}),
});

const cloneOrderData = (templateOrder, overrides) => {
  const {
    id,
    batchId,
    createdAt,
    updatedAt,
    validations,
    user,
    batch,
    ...base
  } = templateOrder;

  const scenarioId = overrides?.scenarioId ?? makeScenarioId("ORDER");

  return {
    ...base,
    uniqueID: `${String(templateOrder.uniqueID ?? "UID")}-${scenarioId}`,
    orderId: `${String(templateOrder.orderId ?? "OID")}-${scenarioId}`,
    batchId: overrides.batchId,
    userId: overrides.userId,
    ...overrides.fields,
  };
};

const getBatchReport = async (batchId, limit) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      fileType: true,
      validation_1_status: true,
      validation_2: true,
      validation_2_status: true,
      validation_3: true,
      validation_3_status: true,
      updatedAt: true,
    },
  });

  const totalOrders = await prisma.order.count({ where: { batchId } });
  const v2Errors = await prisma.validationError.count({
    where: { batchId, validationLevel: 2 },
  });
  const v3Errors = await prisma.validationError.count({
    where: { batchId, validationLevel: 3 },
  });

  const topV2 = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 2 },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const topV3 = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 3 },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const orders = await prisma.order.findMany({
    where: { batchId },
    select: { id: true, uniqueID: true, orderId: true },
    orderBy: { id: "asc" },
  });

  const v2ByOrder = await prisma.validationError.groupBy({
    by: ["orderId"],
    where: { batchId, validationLevel: 2, orderId: { not: null } },
    _count: { id: true },
  });
  const v3ByOrder = await prisma.validationError.groupBy({
    by: ["orderId"],
    where: { batchId, validationLevel: 3, orderId: { not: null } },
    _count: { id: true },
  });
  const v2Map = new Map((v2ByOrder || []).map((r) => [r.orderId, r._count.id]));
  const v3Map = new Map((v3ByOrder || []).map((r) => [r.orderId, r._count.id]));
  const perOrder = (orders || []).map((o) => ({
    orderRowId: o.id,
    uniqueID: o.uniqueID,
    orderId: o.orderId,
    v2ErrorCount: v2Map.get(o.id) ?? 0,
    v3ErrorCount: v3Map.get(o.id) ?? 0,
  }));

  return {
    batch,
    totalOrders,
    v2Errors,
    v3Errors,
    topV2: topV2.map((r) => ({ count: r._count.id, field: r.field, message: r.message })),
    topV3: topV3.map((r) => ({ count: r._count.id, field: r.field, message: r.message })),
    perOrder,
  };
};

const main = async () => {
  const { templateBatchId, limit, skipRun } = parseArgs(process.argv.slice(2));
  const tplBatchId = Number.parseInt(String(templateBatchId ?? "47").trim(), 10);
  if (!Number.isFinite(tplBatchId)) throw new Error(`Invalid --templateBatchId: ${templateBatchId}`);
  const topN = Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10);

  const templateBatch = await prisma.batch.findUnique({
    where: { id: tplBatchId },
    select: {
      id: true,
      userId: true,
      fileType: true,
      validation_1_status: true,
    },
  });

  if (!templateBatch) throw new Error(`Template batch not found: ${tplBatchId}`);
  if (templateBatch.fileType === "execution") throw new Error("Template batch must be an orders batch");

  const templateOrder = await prisma.order.findFirst({
    where: { batchId: tplBatchId },
    orderBy: { id: "asc" },
  });

  if (!templateOrder) throw new Error(`No orders found in template batch: ${tplBatchId}`);

  if (templateBatch.validation_1_status !== "passed") {
    throw new Error(`Template batch validation_1_status must be 'passed' (got ${templateBatch.validation_1_status})`);
  }

  const exchangeDest = await getExchangeDestinationSample();
  const validFirmId = await getValidFirmIdSample();

  const scenarios = [
    {
      name: "V2_PASS",
      createOrders: (ctx) => {
        const o1 = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V2PASS-1"),
          fields: withV2SafeDefaults({}),
        });
        const o2 = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V2PASS-2"),
          fields: withV2SafeDefaults({}),
        });
        return [o1, o2];
      },
      runV3: false,
    },
    {
      name: "V2_FAIL_orderCumQty",
      createOrders: (ctx) => {
        const pass = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V2FAIL-PASS"),
          fields: withV2SafeDefaults({}),
        });

        const fail = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V2FAIL-FAIL"),
          fields: withV2SafeDefaults({
            orderCumQty: "1001",
          }),
        });

        return [pass, fail];
      },
      runV3: false,
    },
    {
      name: "V3_PASS",
      createOrders: (ctx) => {
        const dest = exchangeDest;
        const o1 = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V3PASS"),
          fields: withV2SafeDefaults({
            orderDestination: dest ?? ctx.templateOrder.orderDestination,
            orderRoutedOrderId: "ROUTE_OK",
            ...(validFirmId !== null
              ? {
                  orderExecutingEntity: validFirmId,
                  orderBookingEntity: validFirmId,
                }
              : {}),
          }),
        });
        return [o1];
      },
      runV3: true,
    },
    {
      name: "V3_FAIL_invalidDestination",
      createOrders: (ctx) => {
        const o1 = cloneOrderData(ctx.templateOrder, {
          batchId: ctx.batchId,
          userId: ctx.userId,
          scenarioId: makeScenarioId("V3FAIL"),
          fields: withV2SafeDefaults({
            orderDestination: "__INVALID_DEST__",
            orderRoutedOrderId: "ROUTE_ANY",
            ...(validFirmId !== null
              ? {
                  orderExecutingEntity: validFirmId,
                  orderBookingEntity: validFirmId,
                }
              : {}),
          }),
        });
        return [o1];
      },
      runV3: true,
    },
  ];

  console.log("\n[createValidationScenarioBatches] Template:");
  console.table([
    {
      templateBatchId: tplBatchId,
      templateOrderId: templateOrder.id,
      userId: templateBatch.userId,
      exchangeDestinationSample: exchangeDest ?? null,
      validFirmIdSample: validFirmId,
    },
  ]);

  const created = [];

  for (const s of scenarios) {
    const batch = await prisma.batch.create({
      data: {
        userId: templateBatch.userId,
        status: "pending",
        fileName: `scenario_${s.name}`,
        fileType: "orders",
        validation_1: true,
        validation_1_status: "passed",
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    const orders = s.createOrders({
      batchId: batch.id,
      userId: templateBatch.userId,
      templateOrder,
    });

    for (const o of orders) {
      await prisma.order.create({ data: o });
    }

    if (!skipRun) {
      await processValidation2ForBatch(batch.id);
      if (s.runV3) {
        await processValidation3ForBatch(batch.id);
      }
    }

    const report = await getBatchReport(batch.id, topN);

    created.push({
      scenario: s.name,
      batchId: batch.id,
      totalOrders: report.totalOrders,
      v2Status: report.batch?.validation_2_status ?? null,
      v2Passed: report.batch?.validation_2 ?? null,
      v2Errors: report.v2Errors,
      v3Status: report.batch?.validation_3_status ?? null,
      v3Passed: report.batch?.validation_3 ?? null,
      v3Errors: report.v3Errors,
    });

    console.log(`\n[createValidationScenarioBatches] Scenario ${s.name} created: batchId=${batch.id}`);
    console.log("  Per-order results (error counts):");
    console.table(report.perOrder);
    console.log("  Top V2 error groups:");
    console.table(report.topV2);
    console.log("  Top V3 error groups:");
    console.table(report.topV3);
  }

  console.log("\n[createValidationScenarioBatches] Summary (all scenarios):");
  console.table(created);

  console.log("\n[createValidationScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createValidationScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
