require("dotenv").config();

const prisma = require("../src/config/db");
const defaultValidation3ExecutionConditions = require("../src/config/validation3ExecutionConditions");
const { processExecutionValidation3ForBatch } = require("../src/services/validationService");

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

const ensureClientExeValidation3Schema = async (clientId) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, exe_validation_3: true },
  });
  if (!client) throw new Error(`Client not found: ${clientId}`);
  if (client.exe_validation_3) return;

  await prisma.client.update({
    where: { id: clientId },
    data: { exe_validation_3: defaultValidation3ExecutionConditions },
  });
};

const ensureUSBrokerDealer = async ({ clientRefId, clientId, membershipType }) => {
  const normalizedId = String(clientId ?? "").trim();
  if (!normalizedId) throw new Error("USBrokerDealer clientId is required");

  const existing = await prisma.uSBrokerDealer.findFirst({
    where: {
      clientRefId,
      clientId: normalizedId,
      membershipType: membershipType ?? null,
      activeFlag: true,
    },
    select: { id: true },
  });

  if (existing) return;

  await prisma.uSBrokerDealer.create({
    data: {
      clientRefId,
      clientId: normalizedId,
      membershipType: membershipType ?? null,
      activeFlag: true,
      firmName: `Scenario ${normalizedId}`,
    },
  });
};

const ensureAccountMapping = async ({ clientRefId, accountNo }) => {
  const acct = String(accountNo ?? "").trim();
  if (!acct) throw new Error("AccountMapping accountNo is required");

  const existing = await prisma.accountMapping.findFirst({
    where: { clientRefId, accountNo: acct },
    select: { id: true },
  });
  if (existing) return;

  await prisma.accountMapping.create({
    data: {
      clientRefId,
      clientId: String(clientRefId),
      accountNo: acct,
      active: true,
    },
  });
};

const ensureFirmEntity = async ({ clientRefId, firmId }) => {
  const existing = await prisma.firmEntity.findFirst({
    where: { clientRefId, firmId, activeFlag: true },
    select: { id: true },
  });
  if (existing) return;

  await prisma.firmEntity.create({
    data: {
      clientRefId,
      firmId,
      firmName: `Scenario Firm ${firmId}`,
      activeFlag: true,
    },
  });
};

const ensureCurrencyCode = async ({ clientRefId, code }) => {
  const c = String(code ?? "").trim();
  if (!c) throw new Error("CurrencyCode code is required");

  const existing = await prisma.currencyCode.findFirst({
    where: { clientRefId, code: c },
    select: { id: true },
  });
  if (existing) return;

  await prisma.currencyCode.create({
    data: {
      clientRefId,
      clientId: String(clientRefId),
      code: c,
      country: "Scenario",
      currency: c,
    },
  });
};

const ensureInstrumentsMapping = async ({ clientRefId, instrumentId }) => {
  const inst = String(instrumentId ?? "").trim();
  if (!inst) throw new Error("InstrumentsMapping instrumentId is required");

  const existing = await prisma.instrumentsMapping.findFirst({
    where: { clientRefId, instrumentId: inst },
    select: { id: true },
  });
  if (existing) return;

  await prisma.instrumentsMapping.create({
    data: {
      clientRefId,
      instrumentId: inst,
      symbol: `SYM-${inst}`,
      active: true,
    },
  });
};

const ensureReferenceData = async (clientRefId) => {
  const ref = {
    exchangeMarket: "XNAS",
    nonExchangeMarket: "XBRK",
    contraBroker: "CNTR",
    account1: "1",
    account2: "2",
    instrument1: "123",
    currency1: "USD",
    firmBook: 1001,
    firmTrade: 1002,
    firmExec: 1003,
  };

  await ensureUSBrokerDealer({
    clientRefId,
    clientId: ref.exchangeMarket,
    membershipType: "Exchange",
  });
  await ensureUSBrokerDealer({
    clientRefId,
    clientId: ref.nonExchangeMarket,
    membershipType: "Broker",
  });
  await ensureUSBrokerDealer({
    clientRefId,
    clientId: ref.contraBroker,
    membershipType: "Broker",
  });

  await ensureAccountMapping({ clientRefId, accountNo: ref.account1 });
  await ensureAccountMapping({ clientRefId, accountNo: ref.account2 });

  await ensureFirmEntity({ clientRefId, firmId: ref.firmBook });
  await ensureFirmEntity({ clientRefId, firmId: ref.firmTrade });
  await ensureFirmEntity({ clientRefId, firmId: ref.firmExec });

  await ensureCurrencyCode({ clientRefId, code: ref.currency1 });
  await ensureInstrumentsMapping({ clientRefId, instrumentId: ref.instrument1 });

  return ref;
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
    externalExecutionId: `EXT-${idPart}`,
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
    executionBookingEntity: 1001,
    executionTradingEntity: 1002,
    executionDeskId: null,
    executionOsi: null,
    executionInstrumentId: 123,
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
    executionExecutingEntity: 1003,
    ...(overrides || {}),
  };
};

const getErrorFieldsForExecution = async (batchId, executionRowId) => {
  const rows = await prisma.validationError.findMany({
    where: { batchId, validationLevel: 3, executionId: executionRowId },
    select: { field: true },
  });
  return new Set((rows || []).map((r) => r.field));
};

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

const main = async () => {
  const { limit, skipRun } = parseArgs(process.argv.slice(2));
  const topN = Math.max(1, Number.parseInt(String(limit ?? "10"), 10) || 10);

  const user = await getOrPickUserWithClient();
  await ensureClientExeValidation3Schema(user.clientId);
  const ref = await ensureReferenceData(user.clientId);

  const baseValid = {
    executionLastMarket: ref.exchangeMarket,
    externalExecutionId: "EXT-OK",
    executionAccount: Number(ref.account1),
    executionBookingAccount: null,
    executionBookingEntity: ref.firmBook,
    executionTradingEntity: ref.firmTrade,
    executionExecutingEntity: ref.firmExec,
    executionInstrumentId: Number(ref.instrument1),
    executionCurrencyId: ref.currency1,
    executionContraBroker: ref.contraBroker,
  };

  const scenarios = [
    {
      name: "V3_EXE_PASS_all",
      rows: [{ label: "pass", overrides: {}, expect: [] }],
    },
    {
      name: "V3_EXE_FAIL_executionLastMarket_missing",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionLastMarket: null }, expect: ["executionLastMarket"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionLastMarket_not_in_USBD",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionLastMarket: "BADMKT" }, expect: ["executionLastMarket"] },
      ],
    },
    {
      name: "V3_EXE_PASS_nonExchange_externalExecutionId_not_required",
      rows: [
        {
          label: "pass",
          overrides: { executionLastMarket: ref.nonExchangeMarket, externalExecutionId: null },
          expect: [],
        },
      ],
    },
    {
      name: "V3_EXE_FAIL_externalExecutionId_required_for_exchange",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { externalExecutionId: null }, expect: ["externalExecutionId"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionAccount_not_in_account_mapping",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionAccount: 9999 }, expect: ["executionAccount"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionBookingAccount_invalid_when_present",
      rows: [
        { label: "pass", overrides: { executionBookingAccount: Number(ref.account2) }, expect: [] },
        { label: "fail", overrides: { executionBookingAccount: 9999 }, expect: ["executionBookingAccount"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionBookingEntity_invalid",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionBookingEntity: 9999 }, expect: ["executionBookingEntity"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionTradingEntity_invalid",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionTradingEntity: 9999 }, expect: ["executionTradingEntity"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionExecutingEntity_invalid",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionExecutingEntity: 9999 }, expect: ["executionExecutingEntity"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionInstrumentId_missing",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionInstrumentId: null }, expect: ["executionInstrumentId"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionInstrumentId_not_in_mapping",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionInstrumentId: 9999 }, expect: ["executionInstrumentId"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionContraBroker_not_in_USBD",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionContraBroker: "BADCON" }, expect: ["executionContraBroker"] },
      ],
    },
    {
      name: "V3_EXE_FAIL_executionCurrencyId_not_in_currency_codes",
      rows: [
        { label: "pass", overrides: {}, expect: [] },
        { label: "fail", overrides: { executionCurrencyId: "ZZZ" }, expect: ["executionCurrencyId"] },
      ],
    },
  ];

  console.log("\n[createExecutionValidation3ScenarioBatches] Using:");
  console.table([
    {
      userId: user.id,
      clientId: user.clientId,
      exchangeMarket: ref.exchangeMarket,
      nonExchangeMarket: ref.nonExchangeMarket,
      contraBroker: ref.contraBroker,
      instrumentId: ref.instrument1,
      currency: ref.currency1,
    },
  ]);

  const summary = [];
  let anyFailed = false;

  for (const s of scenarios) {
    const batch = await prisma.batch.create({
      data: {
        userId: user.id,
        status: "pending",
        fileName: `scenario_${s.name}`,
        fileType: "execution",
        validation_1: true,
        validation_1_status: "passed",
        validation_2: true,
        validation_2_status: "passed",
        validation_3: null,
        validation_3_status: null,
      },
    });

    const created = [];
    for (const r of s.rows) {
      const exe = createBaseExecution({
        userId: user.id,
        batchId: batch.id,
        scenarioId: makeScenarioId(`${s.name}-${r.label}`),
        overrides: { ...baseValid, ...(r.overrides || {}) },
      });
      const inserted = await prisma.execution.create({ data: exe });
      created.push({ label: r.label, expected: new Set(r.expect || []), exeId: inserted.id });
    }

    if (!skipRun) {
      await processExecutionValidation3ForBatch(batch.id);
    }

    const results = [];
    for (const c of created) {
      const actual = await getErrorFieldsForExecution(batch.id, c.exeId);
      const ok = setsEqual(actual, c.expected);
      if (!ok) anyFailed = true;
      results.push({
        row: c.label,
        ok,
        expected: Array.from(c.expected).sort().join(",") || "(none)",
        actual: Array.from(actual).sort().join(",") || "(none)",
      });
    }

    const topV3 = await prisma.validationError.groupBy({
      by: ["field"],
      where: { batchId: batch.id, validationLevel: 3, executionId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: topN,
    });

    console.log(`\n[createExecutionValidation3ScenarioBatches] Scenario ${s.name} created: batchId=${batch.id}`);
    console.table(results);
    if (topV3.length) {
      console.log("Top V3 error fields:");
      console.table(topV3.map((r) => ({ field: r.field, count: r._count.id })));
    }

    summary.push({
      scenario: s.name,
      batchId: batch.id,
      allRowsOk: results.every((r) => r.ok),
    });
  }

  console.log("\n[createExecutionValidation3ScenarioBatches] Summary:");
  console.table(summary);

  if (anyFailed) {
    throw new Error("One or more scenarios did not match expected Validation-3 outcomes.");
  }

  console.log("\n[createExecutionValidation3ScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createExecutionValidation3ScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
