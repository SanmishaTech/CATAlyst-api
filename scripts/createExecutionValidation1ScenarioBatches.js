require("dotenv").config();

const prisma = require("../src/config/db");
const { processBatchValidation } = require("../src/services/validationService");

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

const intFields = new Set([
  "executionAccount",
  "executionBookingAccount",
  "executionBookingEntity",
  "executionTradingEntity",
  "executionInstrumentId",
  "executionLinkedInstrumentId",
  "executionPositionId",
  "executionExecutingEntity",
]);

const decimalFields = new Set([
  "executionLastPrice",
  "executionLastQuantity",
  "executionCommisionFee",
  "executionCumQuantity",
  "executionTradeFactors",
  "executionYield",
  "executionSpread",
]);

const safeStringForConfig = (cfg) => {
  const min = typeof cfg?.min === "number" ? cfg.min : 1;
  const n = Math.max(1, Math.min(16, min));
  return "X".repeat(n);
};

const createBaseExecution = ({ userId, batchId, scenarioId, overrides }) => {
  const idPart = String(scenarioId);
  return {
    userId,
    batchId,
    clientId: null,
    uniqueID: `EXE-${idPart}`,
    executionId: `EXEID-${idPart}`,
    previousExecutionId: null,
    executionEntityId: `ENT-${idPart}`,
    executionVersion: 0,
    executionSeqNumber: "1",
    externalExecutionId: null,
    executionSide: "1",
    executionPostingSide: "1",
    executionAllocationSide: null,
    executionBrokerCapacity: "1",
    executionCapacity: "1",
    executionEventTime: "2026-01-01T00:00:00.000Z",
    executionTime: "2026-01-01T00:00:00.000Z",
    executionManualIndicator: "1",
    executionManualEventTime: null,
    isMarketExecution: "2",
    executionLastMarket: null,
    executionAccount: 1,
    executionBookingAccount: null,
    executionBookingEntity: null,
    executionTradingEntity: null,
    executionDeskId: null,
    executionOsi: null,
    executionInstrumentId: null,
    executionLinkedInstrumentId: null,
    executionSymbol: "AAPL",
    executionInstrumentReference: null,
    executionInstrumentReferenceValue: null,
    executionLastPrice: "1",
    executionLastQuantity: "1",
    executionContraBroker: null,
    linkedExecutionId: null,
    executionTransactionType: "1",
    executionIdInstance: "1",
    executionSession: null,
    executionOrderIdInstance: null,
    executionOrderIdSession: null,
    executonOrderId: "ORDER-1",
    executionOrderIdVersion: null,
    executionTradeExecutionSystem: "SYS",
    executionOmsSource: "OMS",
    executionBookingEligiblity: null,
    executionTradeDate: "2026-01-01",
    executionCurrencyId: "USD",
    executionPositionId: null,
    executionSwapIndicator: null,
    executionSettleDate: null,
    executionCommisionFee: null,
    executionRollupId: null,
    executionSecondaryOffering: "2",
    executionCumQuantity: null,
    executionTradeFactors: null,
    executionRiskDate: null,
    executionOrderComplianceId: "COM-1",
    executionInfoBarrierId: null,
    executonSessionActual: null,
    executionStrategy: null,
    executionLastLiquidityIndicator: null,
    executionWaiverIndicator: null,
    executionLifecycleType: null,
    executionPackageIndicator: null,
    executionRawLiquidityIndicator: null,
    executionPackageId: null,
    executionQuoteId: null,
    executionYield: null,
    executionSpread: null,
    executionNegotiatedIndicator: null,
    executionOpenCloseIndicator: null,
    exchangeExecId: null,
    executionAction: "1",
    executionCrossId: null,
    executionExecutingEntity: null,
    ...(overrides || {}),
  };
};

const applySchemaRequiredDefaults = (record, schema) => {
  if (!schema || typeof schema !== "object") return record;
  const out = { ...(record || {}) };

  for (const [field, cfg] of Object.entries(schema)) {
    if (!cfg || typeof cfg !== "object") continue;
    if (cfg.optional) continue;

    const current = out[field];
    const isMissing =
      current === undefined ||
      current === null ||
      (typeof current === "string" && current.trim() === "");
    if (!isMissing) continue;

    const t = String(cfg.type || "");
    if (intFields.has(field) || t === "number") {
      out[field] = 1;
      continue;
    }
    if (decimalFields.has(field) || t === "decimal") {
      out[field] = "1";
      continue;
    }
    if (t === "boolean") {
      out[field] = true;
      continue;
    }
    if (t === "date") {
      out[field] = "2026-01-01T00:00:00.000Z";
      continue;
    }
    if (t === "enum") {
      if (Array.isArray(cfg.values) && cfg.values.length > 0) {
        out[field] = cfg.values[0];
      } else {
        out[field] = safeStringForConfig(cfg);
      }
      continue;
    }
    // string/default
    out[field] = safeStringForConfig(cfg);
  }

  return out;
};

const cloneExecutionData = (templateExecution, overrides) => {
  const { id, batchId, createdAt, updatedAt, user, batch, ...base } =
    templateExecution;
  const scenarioId = overrides?.scenarioId ?? makeScenarioId("EXE");

  return {
    ...base,
    uniqueID: `${String(templateExecution.uniqueID ?? "UID")}-${scenarioId}`,
    executionId: `${String(templateExecution.executionId ?? "EID")}-${scenarioId}`,
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

  const totalExecutions = await prisma.execution.count({ where: { batchId } });
  const v1Errors = await prisma.validationError.count({
    where: { batchId, validationLevel: 1, executionId: { not: null } },
  });

  const topV1 = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 1, executionId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  const executions = await prisma.execution.findMany({
    where: { batchId },
    select: { id: true, uniqueID: true, executionId: true },
    orderBy: { id: "asc" },
  });

  const v1ByExecution = await prisma.validationError.groupBy({
    by: ["executionId"],
    where: { batchId, validationLevel: 1, executionId: { not: null } },
    _count: { id: true },
  });

  const v1Map = new Map((v1ByExecution || []).map((r) => [r.executionId, r._count.id]));

  const perExecution = (executions || []).map((e) => ({
    executionRowId: e.id,
    uniqueID: e.uniqueID,
    executionId: e.executionId,
    v1ErrorCount: v1Map.get(e.id) ?? 0,
  }));

  return {
    batch,
    totalExecutions,
    v1Errors,
    topV1: topV1.map((r) => ({
      count: r._count.id,
      field: r.field,
      message: r.message,
    })),
    perExecution,
  };
};

const main = async () => {
  const { templateBatchId, limit, skipRun } = parseArgs(process.argv.slice(2));
  let tplBatchId = Number.parseInt(String(templateBatchId ?? "").trim(), 10);
  if (!Number.isFinite(tplBatchId)) tplBatchId = NaN;
  const topN = Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10);

  let templateExecution = null;
  let user = null;

  if (Number.isFinite(tplBatchId)) {
    const templateBatch = await prisma.batch.findUnique({
      where: { id: tplBatchId },
      select: {
        id: true,
        userId: true,
        fileType: true,
      },
    });

    if (!templateBatch) throw new Error(`Template batch not found: ${tplBatchId}`);
    if (templateBatch.fileType !== "execution") {
      throw new Error("Template batch must be an execution batch");
    }

    templateExecution = await prisma.execution.findFirst({
      where: { batchId: tplBatchId },
      orderBy: { id: "asc" },
    });

    if (!templateExecution) {
      throw new Error(`No executions found in template batch: ${tplBatchId}`);
    }

    user = await prisma.user.findUnique({
      where: { id: templateBatch.userId },
      select: { id: true, clientId: true },
    });
  } else {
    // Fallback: pick any execution record for a user with a clientId.
    // This allows running Level-1 execution scenarios even if there are no previously passed execution batches.
    const fallbackExecution = await prisma.execution.findFirst({
      where: {
        batch: { fileType: "execution" },
        user: { clientId: { not: null } },
      },
      orderBy: { id: "desc" },
      include: {
        user: { select: { id: true, clientId: true } },
        batch: { select: { id: true, fileType: true } },
      },
    });

    if (fallbackExecution) {
      if (fallbackExecution.batch?.fileType !== "execution") {
        throw new Error("Fallback execution does not belong to an execution batch");
      }

      templateExecution = fallbackExecution;
      tplBatchId = fallbackExecution.batch.id;
      user = fallbackExecution.user;
    } else {
      // No executions exist yet in DB; pick a user with exe_validation_1 and generate a base execution record.
      user = await prisma.user.findFirst({
        where: {
          clientId: { not: null },
          client: {
            exe_validation_1: { not: null },
          },
        },
        select: { id: true, clientId: true },
        orderBy: { id: "asc" },
      });

      if (!user || !user.clientId) {
        throw new Error(
          "No user with a client exe_validation_1 schema found. Configure exe_validation_1 for a client and ensure at least one user belongs to that client."
        );
      }
    }
  }

  if (!user?.clientId) {
    throw new Error(`Template execution user ${user?.id} has no clientId`);
  }

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { id: true, exe_validation_1: true },
  });

  if (!client?.exe_validation_1 || typeof client.exe_validation_1 !== "object") {
    throw new Error(`Client ${user.clientId} has no exe_validation_1 schema configured`);
  }

  const schema = client.exe_validation_1;

  // If we didn't have an existing execution to clone, create a synthetic template that satisfies DB requirements.
  if (!templateExecution) {
    const tmpScenarioId = makeScenarioId("TEMPLATE");
    templateExecution = applySchemaRequiredDefaults(
      createBaseExecution({ userId: user.id, batchId: -1, scenarioId: tmpScenarioId }),
      schema
    );
  }

  const requiredCandidate = pickFirstField(schema, (cfg, field) => {
    if (cfg.optional) return false;
    return ["string", "enum", "date"].includes(String(cfg.type || "")) &&
      Object.prototype.hasOwnProperty.call(templateExecution, field);
  });

  const enumCandidate = pickFirstField(schema, (cfg, field) => {
    return String(cfg.type || "") === "enum" &&
      Object.prototype.hasOwnProperty.call(templateExecution, field);
  });

  const dateCandidate = pickFirstField(schema, (cfg, field) => {
    return String(cfg.type || "") === "date" &&
      Object.prototype.hasOwnProperty.call(templateExecution, field);
  });

  const rangeCandidate = pickFirstField(schema, (cfg, field) => {
    const t = String(cfg.type || "");
    if (!["number", "decimal"].includes(t)) return false;
    const out = computeOutOfRange(cfg);
    return out !== null && Object.prototype.hasOwnProperty.call(templateExecution, field);
  });

  const scenarios = [
    {
      name: "V1_EXE_PASS",
      build: () => ({
        pass: {},
        fail: null,
      }),
    },
  ];

  if (requiredCandidate) {
    scenarios.push({
      name: `V1_EXE_FAIL_required_${requiredCandidate.field}`,
      build: () => {
        const current = templateExecution[requiredCandidate.field];
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
      name: `V1_EXE_FAIL_enum_${enumCandidate.field}`,
      build: () => ({
        pass: {},
        fail: { [enumCandidate.field]: "__INVALID_ENUM__" },
      }),
    });
  }

  if (dateCandidate) {
    scenarios.push({
      name: `V1_EXE_FAIL_date_${dateCandidate.field}`,
      build: () => ({
        pass: {},
        fail: { [dateCandidate.field]: "not-a-date" },
      }),
    });
  }

  if (rangeCandidate) {
    scenarios.push({
      name: `V1_EXE_FAIL_range_${rangeCandidate.field}`,
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

  console.log("\n[createExecutionValidation1ScenarioBatches] Using:");
  console.table([
    {
      templateBatchId: tplBatchId,
      templateExecutionId: templateExecution.id ?? null,
      userId: user.id,
      clientId: user.clientId,
      scenarios: scenarios.length,
    },
  ]);

  const created = [];

  for (const s of scenarios) {
    const batch = await prisma.batch.create({
      data: {
        userId: user.id,
        status: "pending",
        fileName: `scenario_${s.name}`,
        fileType: "execution",
        validation_1: null,
        validation_1_status: null,
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    const spec = s.build();

    const passScenarioId = makeScenarioId(`${s.name}-PASS`);
    let passExe;
    if (templateExecution.id !== undefined) {
      passExe = cloneExecutionData(templateExecution, {
        batchId: batch.id,
        userId: user.id,
        scenarioId: passScenarioId,
        fields: spec.pass,
      });
    } else {
      passExe = applySchemaRequiredDefaults(
        createBaseExecution({
          userId: user.id,
          batchId: batch.id,
          scenarioId: passScenarioId,
          overrides: spec.pass,
        }),
        schema
      );
    }

    await prisma.execution.create({ data: passExe });

    if (spec.fail) {
      const failScenarioId = makeScenarioId(`${s.name}-FAIL`);
      let failExe;
      if (templateExecution.id !== undefined) {
        failExe = cloneExecutionData(templateExecution, {
          batchId: batch.id,
          userId: user.id,
          scenarioId: failScenarioId,
          fields: spec.fail,
        });
      } else {
        failExe = applySchemaRequiredDefaults(
          createBaseExecution({
            userId: user.id,
            batchId: batch.id,
            scenarioId: failScenarioId,
            overrides: spec.fail,
          }),
          schema
        );
      }

      try {
        await prisma.execution.create({ data: failExe });
      } catch (e) {
        console.error(
          `\n[createExecutionValidation1ScenarioBatches] Failed to insert fail-execution for scenario ${s.name} (field overrides may not match DB column type).`
        );
        console.error(e);
      }
    }

    if (!skipRun) {
      await processBatchValidation(batch.id);
    }

    const report = await getBatchReport(batch.id, topN);

    created.push({
      scenario: s.name,
      batchId: batch.id,
      totalExecutions: report.totalExecutions,
      v1Status: report.batch?.validation_1_status ?? null,
      v1Passed: report.batch?.validation_1 ?? null,
      v1Errors: report.v1Errors,
    });

    console.log(
      `\n[createExecutionValidation1ScenarioBatches] Scenario ${s.name} created: batchId=${batch.id}`
    );
    console.log("  Per-execution results (error counts):");
    console.table(report.perExecution);
    console.log("  Top V1 error groups:");
    console.table(report.topV1);
  }

  console.log("\n[createExecutionValidation1ScenarioBatches] Summary (all scenarios):");
  console.table(created);

  console.log("\n[createExecutionValidation1ScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createExecutionValidation1ScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
