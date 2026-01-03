require("dotenv").config();

const prisma = require("../src/config/db");
const defaultValidation2OrderConditions = require("../src/config/validation2OrderConditions");
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

const parseRange = (s) => {
  const m = /^\s*(?<a>-?\d+)\s*-\s*(?<b>-?\d+)\s*$/.exec(String(s || ""));
  if (!m?.groups) return null;
  const a = Number.parseInt(m.groups.a, 10);
  const b = Number.parseInt(m.groups.b, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { min: Math.min(a, b), max: Math.max(a, b) };
};

const intFields = new Set([
  "orderIdVersion",
  "orderExecutingEntity",
  "orderBookingEntity",
  "orderPositionAccount",
  "orderInstrumentId",
  "orderLinkedInstrumentId",
  "orderExecutingAccount",
  "orderClearingAccount",
  "orderTradingOwner",
]);

const decimalFields = new Set([
  "orderQuantity",
  "orderPrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderOptionStrikePrice",
  "orderSpread",
  "orderBidSize",
  "orderBidPrice",
  "orderAskSize",
  "orderAskPrice",
  "orderNetPrice",
  "orderCumQty",
  "orderLeavesQty",
  "orderStopPrice",
  "orderDiscretionPrice",
  "orderLegRatio",
  "orderMinimumQty",
  "orderDisplayPrice",
  "orderDisplayQty",
  "orderWorkingPrice",
]);

const coerceValueForField = (field, value) => {
  if (value === null || value === undefined) return value;
  if (intFields.has(field)) {
    if (typeof value === "number") return value;
    const n = Number.parseInt(String(value).trim(), 10);
    return Number.isFinite(n) ? n : value;
  }
  if (decimalFields.has(field)) {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
  }
  return value;
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

const requiredStringFields = new Set([
  "uniqueID",
  "orderId",
  "orderAction",
  "orderCapacity",
  "orderSide",
  "orderOmsSource",
  "orderPublishingTime",
  "orderType",
  "orderComplianceId",
  "orderOriginationSystem",
]);

const missingValueForField = (field) => {
  if (requiredStringFields.has(field)) return "";
  return null;
};

const nonNullValueForField = (field) => {
  if (intFields.has(field)) return 1;
  if (decimalFields.has(field)) return "1";
  return "X";
};

const createClientAndUser = async () => {
  const client = await prisma.client.create({
    data: {
      name: `synthetic-order-v2-${makeScenarioId("client")}`,
      catEnabled: false,
      sixZeroFiveEnabled: false,
      loprEnabled: false,
      active: true,
      validation_2: defaultValidation2OrderConditions,
    },
    select: { id: true, name: true },
  });

  const email = `synthetic-order-v2-${makeScenarioId("user")}@example.com`.toLowerCase();
  const user = await prisma.user.create({
    data: {
      name: "Synthetic Order V2",
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

const createBatch = async (userId) => {
  return prisma.batch.create({
    data: {
      userId,
      status: "pending",
      fileName: "scenario_order_v2_all_fields",
      fileType: "orders",
      validation_1: true,
      validation_1_status: "passed",
      validation_2: null,
      validation_2_status: null,
      validation_3: null,
      validation_3_status: null,
    },
    select: { id: true, userId: true },
  });
};

const createBaseOrder = ({ userId, batchId, scenarioId, overrides }) => {
  const idPart = String(scenarioId);
  const now = new Date();
  const iso = now.toISOString();
  const laterIso = new Date(now.getTime() + 1000).toISOString();

  return {
    userId,
    batchId,
    clientId: null,
    uniqueID: `ORD-${idPart}`,
    orderId: `OID-${idPart}`,
    orderIdVersion: 1,
    parentOrderId: null,
    cancelreplaceOrderId: null,
    linkedOrderId: null,
    linkOrderType: null,
    orderAction: "1",
    orderStatus: "1",
    orderCapacity: "1",
    orderDestination: null,
    orderClientRef: null,
    orderExecutingEntity: 1,
    orderBookingEntity: 1,
    orderPositionAccount: 1,
    orderSide: "1",
    orderClientCapacity: "1",
    orderManualIndicator: "2",
    orderRequestTime: iso,
    orderEventTime: iso,
    orderManualTimestamp: null,
    orderOmsSource: "OMS",
    orderPublishingTime: iso,
    orderQuantity: "1000",
    orderPrice: null,
    orderType: "1",
    orderTimeInforce: "1",
    orderExecutionInstructions: "1",
    orderAttributes: null,
    orderRestrictions: "1",
    orderAuctionIndicator: null,
    orderSwapIndicator: "1",
    orderInstrumentId: 1,
    orderCurrencyId: "USD",
    orderFlowType: null,
    orderSymbol: "AAPL",
    orderInstrumentReference: "1",
    orderInstrumentReferenceValue: "VAL",
    orderComplianceId: "COM-1",
    orderClientOrderId: "COID-1",
    orderRoutedOrderId: null,
    orderAmendReason: null,
    orderCancelRejectReason: null,
    orderBidSize: null,
    orderBidPrice: null,
    orderAskSize: null,
    orderAskPrice: null,
    orderBasketId: null,
    orderCumQty: "0",
    orderLeavesQty: "0",
    orderStopPrice: null,
    orderDiscretionPrice: null,
    orderNegotiatedIndicator: "1",
    orderActionInitiated: "1",
    orderSecondaryOffering: "2",
    orderStartTime: laterIso,
    orderTifExpiration: null,
    orderParentChildType: "1",
    orderMinimumQty: null,
    orderTradingSession: "1",
    atsDisplayIndicator: null,
    orderNbboSource: null,
    orderNbboTimestamp: null,
    orderSolicitationFlag: "1",
    routeRejectedFlag: null,
    orderOriginationSystem: "SYS",
    ...(overrides || {}),
  };
};

const deriveFailOverrides = (schemaField, rule, baseOrder) => {
  const condRaw = String(rule?.condition || "");
  const cond = condRaw.toLowerCase();
  const knownFields = new Set(Object.keys(defaultValidation2OrderConditions || {}));

  const targetMatch = /^\s*(?<target>[a-z0-9_]+)\b/i.exec(condRaw);
  const target = targetMatch?.groups?.target || schemaField;

  const isKnownField = (f) => knownFields.has(String(f || ""));

  if (schemaField === "orderDestination") {
    return {
      schemaField,
      target,
      overrides: { orderAction: "5", orderDestination: missingValueForField("orderDestination") },
      expectedEnforced: true,
      note: "Trigger external routing by orderAction=5 and leave orderDestination missing",
    };
  }

  const onlyPopulatedWhenIn = /\bonly\s+populated\s+when\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
    condRaw
  );
  if (onlyPopulatedWhenIn?.groups?.dep && onlyPopulatedWhenIn?.groups?.vals) {
    const dep = onlyPopulatedWhenIn.groups.dep;
    if (!isKnownField(dep)) {
      return {
        schemaField,
        target,
        overrides: {},
        expectedEnforced: false,
        note: `Unknown dependency field: ${dep}`,
      };
    }
    const list = parseList(onlyPopulatedWhenIn.groups.vals);
    const invalid = pickInvalidNotInList(list, { preferNumber: false });
    return {
      schemaField,
      target,
      overrides: {
        [dep]: String(invalid),
        [target]: nonNullValueForField(target),
      },
      expectedEnforced: true,
      note: `Set ${dep}=${invalid} (NOT allowed) and ${target} populated`,
    };
  }

  const shouldBeNullWhenIn = /\bshould\s+be\s+null\s+when\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
    condRaw
  );
  if (shouldBeNullWhenIn?.groups?.dep && shouldBeNullWhenIn?.groups?.vals) {
    const dep = shouldBeNullWhenIn.groups.dep;
    if (!isKnownField(dep)) {
      return {
        schemaField,
        target,
        overrides: {},
        expectedEnforced: false,
        note: `Unknown dependency field: ${dep}`,
      };
    }
    const list = parseList(shouldBeNullWhenIn.groups.vals);
    const depVal = list[0] ?? "1";
    return {
      schemaField,
      target,
      overrides: { [dep]: depVal, [target]: nonNullValueForField(target) },
      expectedEnforced: true,
      note: `Set ${dep}=${depVal} and ${target} populated`,
    };
  }

  const whenIdx = cond.indexOf(" when ");
  const hasWhen = whenIdx >= 0;
  const isNotNullRule = cond.includes("should not be null") || cond.includes("must be populated");
  if (isNotNullRule && hasWhen) {
    const tail = condRaw.slice(whenIdx + 6);
    const overrides = {};

    // Handle '<dep> in (...)'
    const depMatches = Array.from(
      tail.matchAll(/(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/gi)
    );
    for (const m of depMatches) {
      const dep = m?.groups?.dep;
      const vals = m?.groups?.vals;
      if (!dep || !vals) continue;
      if (!isKnownField(dep)) continue;
      const list = parseList(vals);
      overrides[dep] = list[0] ?? "1";
    }

    // Handle '<dep> is populated' and '<dep> is not empty'
    const popMatches = Array.from(
      tail.matchAll(/(?<dep>[a-z0-9_]+)\s+is\s+(?:populated|not\s+empty)/gi)
    );
    for (const m of popMatches) {
      const dep = m?.groups?.dep;
      if (!dep || !isKnownField(dep)) continue;
      overrides[dep] = nonNullValueForField(dep);
    }

    // Handle '<dep> is not null'
    const notNullMatches = Array.from(
      tail.matchAll(/(?<dep>[a-z0-9_]+)\s+is\s+not\s+null/gi)
    );
    for (const m of notNullMatches) {
      const dep = m?.groups?.dep;
      if (!dep || !isKnownField(dep)) continue;
      overrides[dep] = nonNullValueForField(dep);
    }

    overrides[target] = missingValueForField(target);

    return {
      schemaField,
      target,
      overrides,
      expectedEnforced: Object.keys(overrides).length > 0,
      note:
        Object.keys(overrides).length > 0
          ? `Set deps to trigger and ${target}=missing`
          : "No parseable dependencies to trigger this conditional rule",
    };
  }

  if (cond.includes("should not be null") && whenIdx < 0) {
    return {
      schemaField,
      target,
      overrides: { [target]: missingValueForField(target) },
      expectedEnforced: true,
      note: `Set ${target}=null`,
    };
  }

  const inListMatch = /\b(?:must|should)\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
  if (inListMatch?.groups?.vals) {
    const inside = String(inListMatch.groups.vals).trim();
    const range = parseRange(inside);
    if (range) {
      const invalid = range.max + 1;
      return {
        schemaField,
        target,
        overrides: { [target]: coerceValueForField(target, String(invalid)) },
        expectedEnforced: true,
        note: `Set ${target}=${invalid} (outside ${range.min}-${range.max})`,
      };
    }

    const list = parseList(inside);
    const invalid = pickInvalidNotInList(list, { preferNumber: intFields.has(target) });
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, invalid) },
      expectedEnforced: true,
      note: `Set ${target}=${invalid} (not in list)`,
    };
  }

  if (cond.includes("must be in nano seconds") || cond.includes("must be nano seconds")) {
    if (cond.includes("not be less than") && cond.includes("ordereventtime")) {
      return {
        schemaField,
        target,
        overrides: {
          orderEventTime: new Date(Date.now() + 5000).toISOString(),
          orderStartTime: new Date(Date.now()).toISOString(),
        },
        expectedEnforced: true,
        note: "Set orderStartTime earlier than orderEventTime",
      };
    }

    return {
      schemaField,
      target,
      overrides: { [target]: "not-a-nano" },
      expectedEnforced: true,
      note: `Set ${target}=not-a-nano`,
    };
  }

  const mustGte = /\bgreater\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(
    condRaw
  );
  if (mustGte?.groups?.num) {
    const rhs = Number.parseFloat(mustGte.groups.num);
    const bad = Number.isFinite(rhs) ? rhs - 1 : -1;
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, String(bad)) },
      expectedEnforced: true,
      note: `Set ${target}=${bad} (< ${rhs})`,
    };
  }

  const mustGt = /\bgreater\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(condRaw);
  if (mustGt?.groups?.num) {
    const rhs = Number.parseFloat(mustGt.groups.num);
    const bad = Number.isFinite(rhs) ? rhs : 0;
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, String(bad)) },
      expectedEnforced: true,
      note: `Set ${target}=${bad} (not > ${rhs})`,
    };
  }

  const lessThan = /\bless\s+than\s+(?<other>[a-z0-9_]+)\b/i.exec(cond);
  if (lessThan?.groups?.other) {
    const other = lessThan.groups.other;
    const otherVal = baseOrder[other];
    const n = Number(otherVal);
    const bad = Number.isFinite(n) ? String(n + 1) : "999";
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, bad) },
      expectedEnforced: true,
      note: `Set ${target}=${bad} (>= ${other})`,
    };
  }

  const notEqual = /\bnot\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(cond);
  if (notEqual?.groups?.other) {
    const other = notEqual.groups.other;
    const otherVal = baseOrder[other];
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

  if (cond.includes("should be null") && cond.includes("or") && cond.includes("greater than 0")) {
    return {
      schemaField,
      target,
      overrides: { [target]: coerceValueForField(target, "0") },
      expectedEnforced: true,
      note: `Set ${target}=0`,
    };
  }

  if (cond.includes("lookup table") || cond.includes("throughout") || cond.includes("external destination")) {
    return {
      schemaField,
      target,
      overrides: {},
      expectedEnforced: false,
      note: "Rule text not automatically generated by this scenario builder",
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
  const topN = Math.max(1, Number.parseInt(String(limit ?? "50"), 10) || 50);

  const { client, user } = await createClientAndUser();
  const rules = defaultValidation2OrderConditions;
  const enabledFields = Object.entries(rules)
    .filter(([, r]) => r && typeof r === "object" && r.enabled)
    .map(([f, r]) => ({ field: f, rule: r }));

  const batch = await createBatch(user.id);

  const baseScenarioId = makeScenarioId("ORDBASE");
  const base = createBaseOrder({ userId: user.id, batchId: batch.id, scenarioId: baseScenarioId });

  const derived = enabledFields.map(({ field, rule }) =>
    deriveFailOverrides(field, rule, base)
  );

  const ordersToCreate = [
    {
      kind: "BASE",
      schemaField: "__BASE__",
      condition: "",
      expectedEnforced: false,
      note: "Baseline order",
      order: base,
    },
    ...derived.map((d) => {
      const scenarioId = makeScenarioId(`FAIL-${d.schemaField}`);
      const order = createBaseOrder({
        userId: user.id,
        batchId: batch.id,
        scenarioId,
        overrides: d.overrides,
      });

      // Some rules depend on self-equality with orderId
      if (d.schemaField === "orderBasketId") {
        order.orderBasketId = order.orderId;
      }

      return {
        kind: "FAIL",
        schemaField: d.schemaField,
        condition: String(rules[d.schemaField]?.condition || ""),
        expectedEnforced: d.expectedEnforced,
        note: d.note,
        order,
      };
    }),
  ];

  for (const o of ordersToCreate) {
    const { userId, batchId, ...rest } = o.order;
    await prisma.order.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
        batch: { connect: { id: batchId } },
      },
    });
  }

  if (!skipRun) {
    await processValidation2ForBatch(batch.id);
  }

  const allErrors = await prisma.validationError.findMany({
    where: { batchId: batch.id, validationLevel: 2, orderId: { not: null } },
    select: { orderId: true, field: true, message: true },
  });

  const errorsByOrder = new Map();
  for (const e of allErrors) {
    const key = e.orderId;
    if (!errorsByOrder.has(key)) errorsByOrder.set(key, []);
    errorsByOrder.get(key).push(e);
  }

  const createdOrders = await prisma.order.findMany({
    where: { batchId: batch.id },
    select: { id: true, uniqueID: true, orderId: true },
    orderBy: { id: "asc" },
  });

  const byUnique = new Map(createdOrders.map((o) => [o.uniqueID, o]));

  const rows = ordersToCreate
    .filter((o) => o.kind === "FAIL")
    .map((sc) => {
      const created = byUnique.get(sc.order.uniqueID);
      const orderRowId = created?.id;
      const errs = orderRowId ? errorsByOrder.get(orderRowId) || [] : [];
      const fieldErrs = errs.filter(
        (x) => normalizeHeader(x.field) === normalizeHeader(sc.schemaField)
      );
      return {
        field: sc.schemaField,
        condition: sc.condition,
        expectedEnforced: sc.expectedEnforced,
        gotErrorForField: fieldErrs.length > 0,
        totalErrorsOnRecord: errs.length,
        note: sc.note,
      };
    });

  const enforced = rows.filter((r) => r.gotErrorForField).length;
  const expected = rows.filter((r) => r.expectedEnforced).length;
  const unsupported = rows.filter((r) => !r.expectedEnforced).length;

  console.log("\n[coverOrderValidation2AllFieldsSynthetic] Synthetic fixtures:");
  console.table([
    {
      clientId: client.id,
      userId: user.id,
      batchId: batch.id,
      enabledFieldsTested: enabledFields.length,
      expectedEnforcedRules: expected,
      unsupportedOrUnknownRules: unsupported,
      fieldsThatActuallyProducedErrors: enforced,
    },
  ]);

  console.log(
    `\n[coverOrderValidation2AllFieldsSynthetic] Per-field results (${rows.length} rows):`
  );
  console.table(rows.slice(0, topN));

  if (rows.length > topN) {
    console.log(
      `\n[coverOrderValidation2AllFieldsSynthetic] Note: output truncated to --limit ${topN}. Re-run with --limit ${rows.length} to see all.`
    );
  }

  const notWorking = rows.filter((r) => r.expectedEnforced && !r.gotErrorForField);
  if (notWorking.length) {
    console.log(
      "\n[coverOrderValidation2AllFieldsSynthetic] Expected-to-be-enforced rules that did NOT produce errors (investigate):"
    );
    console.table(notWorking.slice(0, topN));
  }

  const unsupportedRows = rows.filter((r) => !r.expectedEnforced);
  if (unsupportedRows.length) {
    console.log(
      "\n[coverOrderValidation2AllFieldsSynthetic] Rules marked unsupported/not-parseable by current generator:"
    );
    console.table(unsupportedRows.slice(0, topN));
  }

  console.log("\n[coverOrderValidation2AllFieldsSynthetic] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[coverOrderValidation2AllFieldsSynthetic] Error:");
    console.error(err);
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  });
