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

const normalizeHeader = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const makeScenarioId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const parseList = (vals) =>
  String(vals || "")
    .split(",")
    .map((v) => v.replace(/['"()]/g, "").trim())
    .filter(Boolean);

const intFields = new Set([
  "executionVersion",
  "executionAccount",
  "executionBookingAccount",
  "executionBookingEntity",
  "executionTradingEntity",
  "executionInstrumentId",
  "executionLinkedInstrumentId",
  "executionPositionId",
  "executionExecutingEntity",
]);

const coerceValueForField = (field, value) => {
  if (!intFields.has(field)) return value;
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return value;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : value;
};

const pickInvalidNotInList = (list, opts = {}) => {
  const { preferNumber } = opts;
  const s = new Set((list || []).map((x) => String(x).trim()));
  const common = preferNumber
    ? ["999", "0", "9", "-1"]
    : ["Z", "999", "__INVALID__", "0", "9"];
  for (const c of common) {
    if (!s.has(c)) return preferNumber ? Number.parseInt(c, 10) : c;
  }
  return preferNumber ? 999 : "__INVALID__";
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
    executionManualIndicator: "2",
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

const deriveFailOverrides = (schemaField, rule, baseExecution) => {
  const condRaw = String(rule?.condition || "");
  const cond = condRaw.toLowerCase();

  // match target field as implemented in evaluateLevel2Rules
  const targetMatch = /^\s*(?<target>[a-z0-9_]+)\b/i.exec(condRaw);
  const target = targetMatch?.groups?.target || schemaField;

  // 1) should not be null when <dep> in (...)
  const whenInNotNull = /\bshould\s+not\s+be\s+null\s+when\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
    condRaw
  );
  if (whenInNotNull?.groups?.dep && whenInNotNull?.groups?.vals) {
    const dep = whenInNotNull.groups.dep;
    const list = parseList(whenInNotNull.groups.vals);
    const depVal = list[0] ?? "1";
    return {
      schemaField,
      target,
      overrides: { [dep]: depVal, [target]: null },
      expectedEnforced: true,
      note: `Set ${dep}=${depVal} and ${target}=null`,
    };
  }

  // 2) must be in (...)
  const mustIn = /\bmust\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
  if (mustIn?.groups?.vals) {
    const list = parseList(mustIn.groups.vals);
    const invalid = pickInvalidNotInList(list, { preferNumber: intFields.has(target) });
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, invalid) },
      expectedEnforced: true,
      note: `Set ${target}=${invalid} (not in list)`,
    };
  }

  // 3) greater than or equal to <num>
  const gte = /\bgreater\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(
    condRaw
  );
  if (gte?.groups?.num) {
    const rhs = Number.parseFloat(gte.groups.num);
    const badNum = Number.isFinite(rhs) ? rhs - 1 : -1;
    const bad = intFields.has(target) ? Math.trunc(badNum) : String(badNum);
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, bad) },
      expectedEnforced: true,
      note: `Set ${target}=${bad} (< ${rhs})`,
    };
  }

  // 4) greater than <num>
  const gt = /\bgreater\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(condRaw);
  if (gt?.groups?.num) {
    const rhs = Number.parseFloat(gt.groups.num);
    const badNum = Number.isFinite(rhs) ? rhs : 0;
    const bad = intFields.has(target) ? Math.trunc(badNum) : String(badNum);
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, bad) },
      expectedEnforced: true,
      note: `Set ${target}=${bad} (not > ${rhs})`,
    };
  }

  // 5) not equal to <otherField>
  const neq = /\bnot\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(cond);
  if (neq?.groups?.other) {
    const other = neq.groups.other;
    const otherVal = baseExecution[other];
    if (otherVal !== undefined) {
      return {
        schemaField,
        target,
        overrides: { [target]: otherVal },
        expectedEnforced: true,
        note: `Set ${target} equal to ${other}`,
      };
    }
  }

  // 6) externalExecutionId is required when ... (unsupported wording)
  if (cond.includes("is required when")) {
    return {
      schemaField,
      target,
      overrides: {},
      expectedEnforced: false,
      note: "Unsupported wording: 'is required when'",
    };
  }

  // 7) other free-text rules (lookup table, nano seconds, same throughout lifecycle)
  if (cond.includes("lookup table") || cond.includes("nano") || cond.includes("throughout")) {
    return {
      schemaField,
      target,
      overrides: {},
      expectedEnforced: false,
      note: "Rule text not machine-parseable by current Validation 2 evaluator",
    };
  }

  return {
    schemaField,
    target,
    overrides: {},
    expectedEnforced: false,
    note: "No supported mutation pattern for this rule",
  };
};

const main = async () => {
  const { limit, skipRun } = parseArgs(process.argv.slice(2));
  const topN = Math.max(1, Number.parseInt(String(limit ?? "25"), 10) || 25);

  const user = await getOrPickUserWithClient();
  await ensureClientExeValidation2Schema(user.clientId);

  const rules = defaultValidation2ExecutionConditions;
  const enabledFields = Object.entries(rules)
    .filter(([, r]) => r && typeof r === "object" && r.enabled)
    .map(([f, r]) => ({ field: f, rule: r }));

  const batch = await prisma.batch.create({
    data: {
      userId: user.id,
      status: "pending",
      fileName: "scenario_exe_v2_all_fields",
      fileType: "execution",
      validation_1: true,
      validation_1_status: "passed",
      validation_2: null,
      validation_2_status: null,
      validation_3: null,
      validation_3_status: null,
    },
  });

  const baseScenarioId = makeScenarioId("EXEBASE");
  const base = createBaseExecution({
    userId: user.id,
    batchId: batch.id,
    scenarioId: baseScenarioId,
  });

  const derived = enabledFields.map(({ field, rule }) =>
    deriveFailOverrides(field, rule, base)
  );

  const executionsToCreate = [
    {
      kind: "BASE",
      schemaField: "__BASE__",
      target: "__BASE__",
      condition: "",
      expectedEnforced: false,
      note: "Baseline execution",
      execution: base,
    },
    ...derived.map((d) => {
      const rule = rules[d.schemaField];
      const scenarioId = makeScenarioId(`FAIL-${d.schemaField}`);
      const execution = createBaseExecution({
        userId: user.id,
        batchId: batch.id,
        scenarioId,
        overrides: d.overrides,
      });

      // Special-case: for not-equal rules we need access to executionId, so set after idPart known
      if (d.schemaField === "linkedExecutionId") {
        execution.linkedExecutionId = execution.executionId;
      }

      // Special-case: trigger some conditional rules if they exist
      if (d.schemaField === "previousExecutionId") {
        execution.executionAction = "3";
        execution.previousExecutionId = null;
      }
      if (d.schemaField === "executionLastMarket") {
        execution.isMarketExecution = "1";
        execution.executionLastMarket = null;
      }

      return {
        kind: "FAIL",
        schemaField: d.schemaField,
        target: d.target,
        condition: String(rule?.condition || ""),
        expectedEnforced: d.expectedEnforced,
        note: d.note,
        execution,
      };
    }),
  ];

  for (const e of executionsToCreate) {
    await prisma.execution.create({ data: e.execution });
  }

  if (!skipRun) {
    await processValidation2ForBatch(batch.id);
  }

  const allErrors = await prisma.validationError.findMany({
    where: { batchId: batch.id, validationLevel: 2, executionId: { not: null } },
    select: { executionId: true, field: true, message: true },
  });

  const errorsByExecution = new Map();
  for (const e of allErrors) {
    const key = e.executionId;
    if (!errorsByExecution.has(key)) errorsByExecution.set(key, []);
    errorsByExecution.get(key).push(e);
  }

  const createdExecutions = await prisma.execution.findMany({
    where: { batchId: batch.id },
    select: { id: true, uniqueID: true, executionId: true },
    orderBy: { id: "asc" },
  });

  const byUnique = new Map(createdExecutions.map((e) => [e.uniqueID, e]));

  const rows = executionsToCreate
    .filter((e) => e.kind === "FAIL")
    .map((sc) => {
      const created = byUnique.get(sc.execution.uniqueID);
      const exeRowId = created?.id;
      const errs = exeRowId ? errorsByExecution.get(exeRowId) || [] : [];
      const fieldErrs = errs.filter((x) => normalizeHeader(x.field) === normalizeHeader(sc.schemaField));
      return {
        field: sc.schemaField,
        condition: sc.condition,
        expectedEnforced: sc.expectedEnforced,
        gotErrorForField: fieldErrs.length > 0,
        totalErrorsOnRecord: errs.length,
        note: sc.note,
      };
    });

  // Summary counts
  const enforced = rows.filter((r) => r.gotErrorForField).length;
  const expected = rows.filter((r) => r.expectedEnforced).length;
  const unsupported = rows.filter((r) => !r.expectedEnforced).length;

  console.log("\n[coverExecutionValidation2AllFields] Batch:");
  console.table([
    {
      batchId: batch.id,
      totalExecutionsCreated: executionsToCreate.length,
      enabledFieldsTested: enabledFields.length,
      expectedEnforcedRules: expected,
      unsupportedOrUnknownRules: unsupported,
      fieldsThatActuallyProducedErrors: enforced,
    },
  ]);

  console.log(`\n[coverExecutionValidation2AllFields] Per-field results (${rows.length} rows):`);
  console.table(rows.slice(0, topN));

  if (rows.length > topN) {
    console.log(`\n[coverExecutionValidation2AllFields] Note: output truncated to --limit ${topN}. Re-run with --limit ${rows.length} to see all.`);
  }

  const notWorking = rows.filter((r) => r.expectedEnforced && !r.gotErrorForField);
  if (notWorking.length) {
    console.log("\n[coverExecutionValidation2AllFields] Expected-to-be-enforced rules that did NOT produce errors (investigate):");
    console.table(notWorking.slice(0, topN));
  }

  const unsupportedRows = rows.filter((r) => !r.expectedEnforced);
  if (unsupportedRows.length) {
    console.log("\n[coverExecutionValidation2AllFields] Rules marked unsupported/not-parseable by current engine:");
    console.table(unsupportedRows.slice(0, topN));
  }

  console.log("\n[coverExecutionValidation2AllFields] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[coverExecutionValidation2AllFields] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
