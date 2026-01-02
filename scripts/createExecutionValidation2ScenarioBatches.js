require("dotenv").config();

const prisma = require("../src/config/db");
const defaultValidation2ExecutionConditions = require("../src/config/validation2ExecutionConditions");
const { processValidation2ForBatch } = require("../src/services/validationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
  }
  return out;
};

const makeScenarioId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const getOrPickUserWithClient = async () => {
  const user = await prisma.user.findFirst({
    where: { clientId: { not: null } },
    select: { id: true, clientId: true },
    orderBy: { id: "asc" },
  });
  if (!user || !user.clientId) {
    throw new Error("No user with clientId found. Create a client user first.");
  }
  return user;
};

const ensureClientExeValidation2Schema = async (clientId) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, exe_validation_2: true },
  });
  if (!client) throw new Error(`Client not found: ${clientId}`);
  if (client.exe_validation_2) return;

  await prisma.client.update({
    where: { id: clientId },
    data: { exe_validation_2: defaultValidation2ExecutionConditions },
  });
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

const getBatchReport = async (batchId, topN) => {
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
      userId: true,
    },
  });

  const executions = await prisma.execution.findMany({
    where: { batchId },
    select: { id: true, uniqueID: true, executionId: true },
    orderBy: { id: "asc" },
  });

  const totalExecutions = await prisma.execution.count({ where: { batchId } });
  const v2Errors = await prisma.validationError.count({
    where: { batchId, validationLevel: 2, executionId: { not: null } },
  });

  const topV2 = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 2, executionId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: topN,
  });

  const v2ByExecution = await prisma.validationError.groupBy({
    by: ["executionId"],
    where: { batchId, validationLevel: 2, executionId: { not: null } },
    _count: { id: true },
  });

  const v2Map = new Map((v2ByExecution || []).map((r) => [r.executionId, r._count.id]));
  const perExecution = (executions || []).map((e) => ({
    executionRowId: e.id,
    uniqueID: e.uniqueID,
    executionId: e.executionId,
    v2ErrorCount: v2Map.get(e.id) ?? 0,
  }));

  return {
    batch,
    totalExecutions,
    v2Errors,
    topV2: topV2.map((r) => ({ count: r._count.id, field: r.field, message: r.message })),
    perExecution,
  };
};

const main = async () => {
  const { limit, skipRun } = parseArgs(process.argv.slice(2));
  const topN = Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10);

  const user = await getOrPickUserWithClient();
  await ensureClientExeValidation2Schema(user.clientId);

  const scenarios = [
    {
      name: "V2_EXE_PASS",
      createExecutions: (ctx) => [
        createBaseExecution({
          userId: ctx.userId,
          batchId: ctx.batchId,
          scenarioId: makeScenarioId("V2EXEPASS"),
        }),
      ],
    },
    {
      name: "V2_EXE_FAIL_executionManualIndicator",
      createExecutions: (ctx) => {
        const pass = createBaseExecution({
          userId: ctx.userId,
          batchId: ctx.batchId,
          scenarioId: makeScenarioId("V2EXEFAIL-PASS"),
        });
        const fail = createBaseExecution({
          userId: ctx.userId,
          batchId: ctx.batchId,
          scenarioId: makeScenarioId("V2EXEFAIL-FAIL"),
          overrides: {
            executionManualIndicator: "9",
          },
        });
        return [pass, fail];
      },
    },
  ];

  console.log("\n[createExecutionValidation2ScenarioBatches] Using:");
  console.table([
    {
      userId: user.id,
      clientId: user.clientId,
      exe_validation_2_seeded: true,
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
        validation_1: true,
        validation_1_status: "passed",
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    const executions = s.createExecutions({ batchId: batch.id, userId: user.id });
    for (const e of executions) {
      await prisma.execution.create({ data: e });
    }

    if (!skipRun) {
      await processValidation2ForBatch(batch.id);
    }

    const report = await getBatchReport(batch.id, topN);

    created.push({
      scenario: s.name,
      batchId: batch.id,
      totalExecutions: report.totalExecutions,
      v2Status: report.batch?.validation_2_status ?? null,
      v2Passed: report.batch?.validation_2 ?? null,
      v2Errors: report.v2Errors,
    });

    console.log(`\n[createExecutionValidation2ScenarioBatches] Scenario ${s.name} created: batchId=${batch.id}`);
    console.log("  Per-execution results (error counts):");
    console.table(report.perExecution);
    console.log("  Top V2 error groups:");
    console.table(report.topV2);
  }

  console.log("\n[createExecutionValidation2ScenarioBatches] Summary (all scenarios):");
  console.table(created);

  console.log("\n[createExecutionValidation2ScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createExecutionValidation2ScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
