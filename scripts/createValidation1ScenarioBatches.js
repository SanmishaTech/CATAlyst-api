require("dotenv").config();

const prisma = require("../src/config/db");
const { processBatchValidation } = require("../src/services/validationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--templateBatchId") out.templateBatchId = argv[i + 1];
    if (a === "--userId") out.userId = argv[i + 1];
    if (a === "--userEmail") out.userEmail = argv[i + 1];
    if (a === "--limit") out.limit = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
    if (a === "--stormOnly") out.stormOnly = true;
    if (a === "--stormCount") out.stormCount = argv[i + 1];
  }
  return out;
};

const makeScenarioId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const cloneOrderData = (templateOrder, overrides) => {
  const { id, batchId, createdAt, updatedAt, ...base } = templateOrder;
  const scenarioId = overrides?.scenarioId ?? makeScenarioId("ORDER");

  return {
    ...base,
    uniqueID: `${String(templateOrder.uniqueID ?? "UID")}-${scenarioId}`,
    orderId: `${String(templateOrder.orderId ?? "OID")}-${scenarioId}`,
    batchId: overrides.batchId,
    userId: overrides.userId,
    ...(overrides.fields || {}),
  };
};

const pickFirstField = (schema, predicate) => {
  if (!schema || typeof schema !== "object") return null;
  for (const [field, cfg] of Object.entries(schema)) {
    if (!cfg || typeof cfg !== "object") continue;
    if (predicate(cfg, field)) return { field, cfg };
  }
  return null;
};

const computeOutOfRange = (cfg) => {
  if (typeof cfg?.min === "number") return cfg.min - 1;
  if (typeof cfg?.max === "number") return cfg.max + 1;
  return null;
};

const getBatchReport = async (batchId, topN) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      fileType: true,
      validation_1: true,
      validation_1_status: true,
      updatedAt: true,
    },
  });

  const totalOrders = await prisma.order.count({ where: { batchId } });
  const v1Errors = await prisma.validationError.count({
    where: { batchId, validationLevel: 1, orderId: { not: null } },
  });

  const topV1 = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 1, orderId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  const orders = await prisma.order.findMany({
    where: { batchId },
    select: { id: true, uniqueID: true, orderId: true },
    orderBy: { id: "asc" },
  });

  const v1ByOrder = await prisma.validationError.groupBy({
    by: ["orderId"],
    where: { batchId, validationLevel: 1, orderId: { not: null } },
    _count: { id: true },
  });

  const v1Map = new Map((v1ByOrder || []).map((r) => [r.orderId, r._count.id]));

  const perOrder = (orders || []).map((o) => ({
    orderRowId: o.id,
    uniqueID: o.uniqueID,
    orderId: o.orderId,
    v1ErrorCount: v1Map.get(o.id) ?? 0,
  }));

  return {
    batch,
    totalOrders,
    v1Errors,
    topV1: topV1.map((r) => ({
      count: r._count.id,
      field: r.field,
      message: r.message,
    })),
    perOrder,
  };
};

const main = async () => {
  const {
    templateBatchId,
    userId,
    userEmail,
    limit,
    skipRun,
    stormOnly,
    stormCount,
  } = parseArgs(process.argv.slice(2));
  let tplBatchId = Number.parseInt(String(templateBatchId ?? "").trim(), 10);
  if (!Number.isFinite(tplBatchId)) tplBatchId = NaN;
  const topN = Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10);

  const stormNRaw = Number.parseInt(String(stormCount ?? "25"), 10);
  const stormN = Number.isFinite(stormNRaw) ? Math.max(1, stormNRaw) : 25;

  let preferredUserId = Number.parseInt(String(userId ?? "").trim(), 10);
  if (!Number.isFinite(preferredUserId)) preferredUserId = NaN;
  if (!Number.isFinite(preferredUserId) && userEmail) {
    const byEmail = await prisma.user.findFirst({
      where: { email: String(userEmail).trim() },
      select: { id: true },
    });
    if (!byEmail) {
      throw new Error(`User not found for --userEmail ${String(userEmail).trim()}`);
    }
    preferredUserId = byEmail.id;
  }

  let templateBatch = null;
  if (Number.isFinite(tplBatchId)) {
    templateBatch = await prisma.batch.findUnique({
      where: { id: tplBatchId },
      select: {
        id: true,
        userId: true,
        fileType: true,
        validation_1: true,
        validation_1_status: true,
      },
    });
  }

  if (!templateBatch) {
    const fallback = await prisma.batch.findFirst({
      where: {
        OR: [{ fileType: null }, { fileType: { not: "execution" } }],
        validation_1: true,
        validation_1_status: "passed",
        ...(Number.isFinite(preferredUserId) ? { userId: preferredUserId } : {}),
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        userId: true,
        fileType: true,
        validation_1: true,
        validation_1_status: true,
      },
    });
    if (!fallback) {
      throw new Error(
        `No passed orders template batch found${Number.isFinite(preferredUserId) ? ` for userId=${preferredUserId}` : ""}. Provide --templateBatchId (or --userId/--userEmail) pointing to an orders batch that already passed Level 1.`
      );
    }
    templateBatch = fallback;
    tplBatchId = fallback.id;
  }

  if (templateBatch.fileType === "execution") {
    throw new Error("Template batch must be an orders batch");
  }

  const user = await prisma.user.findUnique({
    where: { id: templateBatch.userId },
    select: { id: true, clientId: true },
  });

  if (!user?.clientId) {
    throw new Error(`Template batch user ${templateBatch.userId} has no clientId`);
  }

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { id: true, validation_1: true },
  });

  if (!client?.validation_1 || typeof client.validation_1 !== "object") {
    throw new Error(`Client ${user.clientId} has no validation_1 schema configured`);
  }

  const templateOrder = await prisma.order.findFirst({
    where: { batchId: tplBatchId },
    orderBy: { id: "asc" },
  });

  if (!templateOrder) throw new Error(`No orders found in template batch: ${tplBatchId}`);

  const schema = client.validation_1;

  const requiredCandidate = pickFirstField(schema, (cfg, field) => {
    if (cfg.optional) return false;
    return ["string", "enum", "date"].includes(String(cfg.type || "")) &&
      Object.prototype.hasOwnProperty.call(templateOrder, field);
  });

  const enumCandidate = pickFirstField(schema, (cfg, field) => {
    return String(cfg.type || "") === "enum" &&
      Object.prototype.hasOwnProperty.call(templateOrder, field);
  });

  const dateCandidate = pickFirstField(schema, (cfg, field) => {
    return String(cfg.type || "") === "date" &&
      Object.prototype.hasOwnProperty.call(templateOrder, field);
  });

  const rangeCandidate = pickFirstField(schema, (cfg, field) => {
    const t = String(cfg.type || "");
    if (![
      "number",
      "decimal",
    ].includes(t)) {
      return false;
    }
    const out = computeOutOfRange(cfg);
    return out !== null && Object.prototype.hasOwnProperty.call(templateOrder, field);
  });

  const scenarios = [
    {
      name: "V1_PASS",
      build: () => ({
        pass: {},
        fail: null,
      }),
    },
  ];

  scenarios.push({
    name: "V1_ERROR_STORM",
    build: () => ({
      pass: {},
      fail: {
        // Required strings (min 1) -> empty string triggers schema violation
        orderId: "",
        orderAction: "",
        orderCapacity: "",
        orderSide: "",
        orderType: "",
        orderComplianceId: "",
        orderOmsSource: "",
        orderPublishingTime: "",
        orderOriginationSystem: "",

        // Numbers/decimals (min 0) -> -1 triggers out-of-range
        orderBookingEntity: -1,
        orderClearingAccount: -1,
        orderExecutingAccount: -1,
        orderExecutingEntity: -1,
        orderInstrumentId: -1,
        orderLinkedInstrumentId: -1,
        orderPositionAccount: -1,
        orderTradingOwner: -1,

        orderAskPrice: "-1",
        orderAskSize: "-1",
        orderBidPrice: "-1",
        orderBidSize: "-1",
        orderCumQty: "-1",
        orderDiscretionPrice: "-1",
        orderDisplayPrice: "-1",
        orderDisplayQty: "-1",
        orderLeavesQty: "-1",
        orderLegRatio: "-1",
        orderMinimumQty: "-1",
        orderNetPrice: "-1",
        orderOptionStrikePrice: "-1",
        orderPrice: "-1",
        orderQuantity: "-1",
        orderSpread: "-1",
        orderStopPrice: "-1",
        orderWorkingPrice: "-1",
      },
    }),
  });

  if (requiredCandidate) {
    scenarios.push({
      name: `V1_FAIL_required_${requiredCandidate.field}`,
      build: () => {
        const current = templateOrder[requiredCandidate.field];
        const missing = typeof current === "string" ? "" : null;
        return {
          pass: {},
          fail: { [requiredCandidate.field]: missing },
        };
      },
    });
  }

  if (enumCandidate) {
    scenarios.push({
      name: `V1_FAIL_enum_${enumCandidate.field}`,
      build: () => ({
        pass: {},
        fail: { [enumCandidate.field]: "__INVALID_ENUM__" },
      }),
    });
  }

  if (dateCandidate) {
    scenarios.push({
      name: `V1_FAIL_date_${dateCandidate.field}`,
      build: () => ({
        pass: {},
        fail: { [dateCandidate.field]: "not-a-date" },
      }),
    });
  }

  if (rangeCandidate) {
    scenarios.push({
      name: `V1_FAIL_range_${rangeCandidate.field}`,
      build: () => {
        const cfg = rangeCandidate.cfg;
        const out = computeOutOfRange(cfg);
        const t = String(cfg.type || "");
        const v = t === "decimal" ? String(out) : out;
        return {
          pass: {},
          fail: { [rangeCandidate.field]: v },
        };
      },
    });
  }

  const effectiveScenarios = stormOnly
    ? scenarios.filter((s) => s.name === "V1_ERROR_STORM")
    : scenarios;

  console.log("\n[createValidation1ScenarioBatches] Using:");
  console.table([
    {
      templateBatchId: tplBatchId,
      templateOrderId: templateOrder.id,
      userId: user.id,
      clientId: user.clientId,
      scenarios: effectiveScenarios.length,
    },
  ]);

  const created = [];

  for (const s of effectiveScenarios) {
    const batch = await prisma.batch.create({
      data: {
        userId: user.id,
        status: "pending",
        fileName: `scenario_${s.name}`,
        fileType: "orders",
        validation_1: null,
        validation_1_status: null,
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    const spec = s.build();

    const passOrder = cloneOrderData(templateOrder, {
      batchId: batch.id,
      userId: user.id,
      scenarioId: makeScenarioId(`${s.name}-PASS`),
      fields: spec.pass,
    });

    await prisma.order.create({ data: passOrder });

    if (spec.fail) {
      const n = s.name === "V1_ERROR_STORM" ? stormN : 1;
      for (let i = 0; i < n; i++) {
        const failOrder = cloneOrderData(templateOrder, {
          batchId: batch.id,
          userId: user.id,
          scenarioId: makeScenarioId(`${s.name}-FAIL-${i + 1}`),
          fields: spec.fail,
        });

        try {
          await prisma.order.create({ data: failOrder });
        } catch (e) {
          console.error(
            `\n[createValidation1ScenarioBatches] Failed to insert fail-order for scenario ${s.name} (field overrides may not match DB column type).`
          );
          console.error(e);
        }
      }
    }

    if (!skipRun) {
      await processBatchValidation(batch.id);
    }

    const report = await getBatchReport(batch.id, topN);

    created.push({
      scenario: s.name,
      batchId: batch.id,
      totalOrders: report.totalOrders,
      v1Status: report.batch?.validation_1_status ?? null,
      v1Passed: report.batch?.validation_1 ?? null,
      v1Errors: report.v1Errors,
    });

    console.log(`\n[createValidation1ScenarioBatches] Scenario ${s.name} created: batchId=${batch.id}`);
    console.log("  Per-order results (error counts):");
    console.table(report.perOrder);
    console.log("  Top V1 error groups:");
    console.table(report.topV1);
  }

  console.log("\n[createValidation1ScenarioBatches] Summary (all scenarios):");
  console.table(created);

  console.log("\n[createValidation1ScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createValidation1ScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
