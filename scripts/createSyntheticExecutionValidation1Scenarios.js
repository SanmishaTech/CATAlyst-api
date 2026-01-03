require("dotenv").config();

const prisma = require("../src/config/db");
const { processBatchValidation } = require("../src/services/validationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
  }
  return out;
};

const makeId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const createClientAndUser = async () => {
  const clientName = `synthetic-exe-v1-${makeId("client")}`;
  const client = await prisma.client.create({
    data: {
      name: clientName,
      catEnabled: false,
      sixZeroFiveEnabled: false,
      loprEnabled: false,
      active: true,
    },
    select: { id: true, name: true },
  });

  const email = `synthetic-exe-v1-${makeId("user")}@example.com`.toLowerCase();
  const user = await prisma.user.create({
    data: {
      name: "Synthetic Execution V1",
      email,
      password: "test",
      role: "USER",
      clientId: client.id,
      active: true,
    },
    select: { id: true, email: true, clientId: true },
  });

  return { client, user };
};

const createExecutionBatch = async (userId, name) => {
  return prisma.batch.create({
    data: {
      userId,
      status: "pending",
      fileName: `scenario_${name}`,
      fileType: "execution",
      validation_1: null,
      validation_1_status: null,
      validation_2: null,
      validation_2_status: null,
      validation_3: null,
      validation_3_status: null,
    },
    select: { id: true, userId: true, fileType: true },
  });
};

const sanitizeEntIdPart = (v) => {
  const s = String(v ?? "");
  const cleaned = s.replace(/[^A-Za-z0-9-]/g, "-");
  const collapsed = cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed.length > 0 ? collapsed : "X";
};

const createBaseExecution = ({ userId, batchId, scenarioId, overrides }) => {
  const idPart = String(scenarioId);
  const entPart = sanitizeEntIdPart(idPart);
  return {
    userId,
    batchId,
    clientId: null,
    uniqueID: `EXE-${idPart}`,
    executionId: `EXEID-${idPart}`,
    previousExecutionId: null,
    executionEntityId: `ENT-${entPart}`,
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

const seedExecutionValidationSchema = async (clientId) => {
  const exeSchema = {
    executionEntityId: {
      type: "string",
      optional: false,
      nullable: false,
      regex: "^ENT-[A-Za-z0-9\\-]+$",
      regexMessage: "invalid format",
    },
    executionSide: {
      type: "enum",
      optional: false,
      nullable: false,
      values: ["1", "2"],
    },
    executionSeqNumber: {
      // DB column is string, but validation expects a number (tests numeric coercion + invalid format)
      type: "number",
      optional: false,
      nullable: false,
      int: true,
      min: 1,
      max: 9999,
      minMessage: "value out of range",
      maxMessage: "value out of range",
    },
    executionAccount: {
      type: "number",
      optional: false,
      nullable: false,
      int: true,
      min: 1,
      max: 9999,
      minMessage: "value out of range",
      maxMessage: "value out of range",
    },
    executionEventTime: {
      type: "date",
      optional: false,
      nullable: false,
      datetimeMessage: "invalid format",
    },
    executionManualEventTime: {
      type: "date",
      optional: false,
      nullable: true,
      datetimeMessage: "invalid format",
    },
    executionSymbol: {
      type: "string",
      optional: false,
      nullable: false,
      max: 5,
      maxMessage: "invalid format",
    },
    executionTradeExecutionSystem: {
      type: "string",
      optional: false,
      nullable: false,
      min: 3,
      minMessage: "invalid format",
    },
    executionLastPrice: {
      type: "decimal",
      optional: false,
      nullable: false,
      min: 0,
      max: 1000,
    },
    executionDeskId: {
      type: "string",
      optional: true,
      nullable: true,
      min: 1,
      minMessage: "required",
    },
  };

  await prisma.client.update({
    where: { id: clientId },
    data: { exe_validation_1: exeSchema },
  });

  return exeSchema;
};

const summarizeBatch = async (batchId, limit) => {
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
  const totalErrors = await prisma.validationError.count({
    where: { batchId, validationLevel: 1, executionId: { not: null } },
  });

  const grouped = await prisma.validationError.groupBy({
    by: ["field", "message"],
    where: { batchId, validationLevel: 1, executionId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return {
    batch,
    totalExecutions,
    totalErrors,
    grouped: grouped.map((g) => ({
      count: g._count.id,
      field: g.field,
      message: g.message,
    })),
  };
};

const assertScenario = ({ scenario, report, expected }) => {
  const status = report.batch?.validation_1_status ?? null;
  const passed = report.batch?.validation_1 ?? null;

  if (expected.status && status !== expected.status) {
    throw new Error(
      `[${scenario}] Expected validation_1_status=${expected.status} but got ${status}`
    );
  }
  if (typeof expected.passed === "boolean" && passed !== expected.passed) {
    throw new Error(`[${scenario}] Expected validation_1=${expected.passed} but got ${passed}`);
  }

  if (expected.mustHaveField) {
    const found = (report.grouped || []).some((g) => g.field === expected.mustHaveField);
    if (!found) {
      throw new Error(
        `[${scenario}] Expected at least one ValidationError for field=${expected.mustHaveField} but none found.`
      );
    }
  }

  if (expected.mustHaveMessageIncludes) {
    const found = (report.grouped || []).some((g) =>
      String(g.message || "").toLowerCase().includes(expected.mustHaveMessageIncludes.toLowerCase())
    );
    if (!found) {
      throw new Error(
        `[${scenario}] Expected at least one ValidationError message including '${expected.mustHaveMessageIncludes}' but none found.`
      );
    }
  }
};

const main = async () => {
  const { limit, skipRun } = parseArgs(process.argv.slice(2));
  const topN = Math.max(1, Number.parseInt(String(limit ?? "20"), 10) || 20);

  const { client, user } = await createClientAndUser();
  const exeSchema = await seedExecutionValidationSchema(client.id);

  const scenarios = [
    {
      name: "EXE_V1_PASS",
      failOverrides: null,
      expected: { status: "passed", passed: true },
    },
    {
      name: "EXE_V1_PASS_optionalBlank_executionDeskId",
      passOverrides: { executionDeskId: "" },
      failOverrides: null,
      expected: { status: "passed", passed: true },
    },
    {
      name: "EXE_V1_FAIL_required_executionEntityId",
      failOverrides: { executionEntityId: "" },
      expected: { status: "failed", passed: false, mustHaveField: "executionEntityId" },
    },
    {
      name: "EXE_V1_FAIL_regex_executionEntityId",
      failOverrides: { executionEntityId: "BAD" },
      expected: { status: "failed", passed: false, mustHaveField: "executionEntityId" },
    },
    {
      name: "EXE_V1_FAIL_enum_executionSide",
      failOverrides: { executionSide: "9" },
      expected: { status: "failed", passed: false, mustHaveField: "executionSide", mustHaveMessageIncludes: "enum" },
    },
    {
      name: "EXE_V1_FAIL_invalidFormat_executionSeqNumber",
      failOverrides: { executionSeqNumber: "abc" },
      expected: {
        status: "failed",
        passed: false,
        mustHaveField: "executionSeqNumber",
        mustHaveMessageIncludes: "invalid",
      },
    },
    {
      name: "EXE_V1_FAIL_range_executionAccount",
      failOverrides: { executionAccount: 0 },
      expected: { status: "failed", passed: false, mustHaveField: "executionAccount" },
    },
    {
      name: "EXE_V1_FAIL_date_executionEventTime",
      failOverrides: { executionEventTime: "not-a-date" },
      expected: { status: "failed", passed: false, mustHaveField: "executionEventTime" },
    },
    {
      name: "EXE_V1_FAIL_date_nullable_executionManualEventTime",
      failOverrides: { executionManualEventTime: "not-a-date" },
      expected: { status: "failed", passed: false, mustHaveField: "executionManualEventTime" },
    },
    {
      name: "EXE_V1_FAIL_max_executionSymbol",
      failOverrides: { executionSymbol: "TOO-LONG" },
      expected: { status: "failed", passed: false, mustHaveField: "executionSymbol" },
    },
    {
      name: "EXE_V1_FAIL_min_executionTradeExecutionSystem",
      failOverrides: { executionTradeExecutionSystem: "A" },
      expected: {
        status: "failed",
        passed: false,
        mustHaveField: "executionTradeExecutionSystem",
      },
    },
    {
      name: "EXE_V1_FAIL_range_executionLastPrice",
      failOverrides: { executionLastPrice: "1001" },
      expected: { status: "failed", passed: false, mustHaveField: "executionLastPrice" },
    },
  ];

  console.log("\n[createSyntheticExecutionValidation1Scenarios] Created synthetic fixtures:");
  console.table([
    {
      clientId: client.id,
      clientName: client.name,
      userId: user.id,
      userEmail: user.email,
      seededExeSchemaFields: Object.keys(exeSchema).length,
      scenarios: scenarios.length,
    },
  ]);

  const results = [];

  for (const s of scenarios) {
    const batch = await createExecutionBatch(user.id, s.name);

    const passScenarioId = makeId(`${s.name}-PASS`);
    const passExe = createBaseExecution({
      userId: user.id,
      batchId: batch.id,
      scenarioId: passScenarioId,
      overrides: {
        ...(s.passOverrides || {}),
      },
    });

    await prisma.execution.create({ data: passExe });

    if (s.failOverrides) {
      const failScenarioId = makeId(`${s.name}-FAIL`);
      const failExe = createBaseExecution({
        userId: user.id,
        batchId: batch.id,
        scenarioId: failScenarioId,
        overrides: {
          ...(s.failOverrides || {}),
        },
      });
      await prisma.execution.create({ data: failExe });
    }

    if (!skipRun) {
      await processBatchValidation(batch.id);
    }

    const report = await summarizeBatch(batch.id, topN);

    if (!skipRun) {
      assertScenario({ scenario: s.name, report, expected: s.expected });
    }

    results.push({
      scenario: s.name,
      batchId: batch.id,
      totalExecutions: report.totalExecutions,
      v1Status: report.batch?.validation_1_status ?? null,
      v1Passed: report.batch?.validation_1 ?? null,
      v1Errors: report.totalErrors,
    });

    console.log(`\n[createSyntheticExecutionValidation1Scenarios] Scenario ${s.name}: batchId=${batch.id}`);
    console.table([
      {
        batchId: batch.id,
        validation_1_status: report.batch?.validation_1_status ?? null,
        validation_1: report.batch?.validation_1 ?? null,
        totalExecutions: report.totalExecutions,
        totalErrors: report.totalErrors,
      },
    ]);
    console.log("Top error groups:");
    console.table(report.grouped);
  }

  console.log("\n[createSyntheticExecutionValidation1Scenarios] Summary:");
  console.table(results);

  console.log("\n[createSyntheticExecutionValidation1Scenarios] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createSyntheticExecutionValidation1Scenarios] Error:");
    console.error(err);
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  });
