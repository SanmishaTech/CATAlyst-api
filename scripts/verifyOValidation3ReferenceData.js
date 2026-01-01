require("dotenv").config();

const prisma = require("../src/config/db");
const defaultValidation3OrderConditions = require("../src/config/validation3OrderConditions");
const { processValidation3ForBatch } = require("../src/services/validationService");

const buildEffectiveSchema = (defaults, clientSchema) => {
  const defaultsObj = defaults && typeof defaults === "object" ? defaults : {};
  const clientObj = clientSchema && typeof clientSchema === "object" ? clientSchema : {};
  const effective = {};

  for (const [field, defaultVal] of Object.entries(defaultsObj)) {
    const clientVal = clientObj[field];
    if (defaultVal && typeof defaultVal === "object") {
      effective[field] = {
        ...defaultVal,
        ...(clientVal && typeof clientVal === "object" ? clientVal : {}),
      };
      if (
        defaultVal.condition &&
        (!clientVal ||
          typeof clientVal !== "object" ||
          clientVal.condition === undefined ||
          clientVal.condition === null ||
          String(clientVal.condition).trim() === "")
      ) {
        effective[field].condition = defaultVal.condition;
      }
    } else {
      effective[field] = clientVal !== undefined ? clientVal : defaultVal;
    }
  }

  for (const [field, val] of Object.entries(clientObj)) {
    if (effective[field] !== undefined) continue;
    effective[field] = val;
  }

  return effective;
};

const toMs = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.getTime();
  const s = String(v).trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--batchId") out.batchId = argv[i + 1];
    if (a === "--clientId") out.clientId = argv[i + 1];
  }
  return out;
};

const localValidateOrderV3 = (order, schema, ctx) => {
  const errors = [];
  const exchangeDestinations = ctx.exchangeDestinations;
  const validFirmIds = ctx.validFirmIds;

  const add = (field) => {
    const cond = schema?.[field]?.condition;
    errors.push({ field, message: `${field} does not satisfy rule: ${cond ?? ""}`.trim() });
  };

  if (schema.orderDestination?.enabled) {
    const dest = String(order?.orderDestination ?? "").trim();
    if (!dest) add("orderDestination");
    else if (exchangeDestinations instanceof Set && !exchangeDestinations.has(dest)) add("orderDestination");
  }

  if (schema.orderRoutedOrderId?.enabled) {
    const dest = String(order?.orderDestination ?? "").trim();
    const routedId = String(order?.orderRoutedOrderId ?? "").trim();
    const isExchange = exchangeDestinations instanceof Set && dest && exchangeDestinations.has(dest);
    if (isExchange && !routedId) add("orderRoutedOrderId");
  }

  if (schema.orderExecutingEntity?.enabled) {
    const v = order?.orderExecutingEntity;
    const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) add("orderExecutingEntity");
    else if (validFirmIds instanceof Set && validFirmIds.size > 0 && !validFirmIds.has(n)) add("orderExecutingEntity");
  }

  if (schema.orderBookingEntity?.enabled) {
    const v = order?.orderBookingEntity;
    const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) add("orderBookingEntity");
    else if (validFirmIds instanceof Set && validFirmIds.size > 0 && !validFirmIds.has(n)) add("orderBookingEntity");
  }

  if (schema.orderStartTime?.enabled) {
    const start = toMs(order?.orderStartTime);
    const evt = toMs(order?.orderEventTime);
    if (start !== null && evt !== null && start < evt) add("orderStartTime");
  }

  return errors;
};

const main = async () => {
  const { batchId, clientId } = parseArgs(process.argv.slice(2));

  const membershipTypeCounts = await prisma.uSBrokerDealer.groupBy({
    by: ["membershipType"],
    _count: { _all: true },
  });

  console.log("\n[verifyValidation3ReferenceData] us_broker_dealer membershipType distribution:");
  for (const r of membershipTypeCounts) {
    console.log(`  membershipType=${JSON.stringify(r.membershipType)} count=${r._count._all}`);
  }

  const exchangeRows = await prisma.uSBrokerDealer.findMany({
    where: {
      membershipType: "Exchange",
      clientId: { not: null },
    },
    select: { clientId: true },
    take: 2000,
  });

  const exchangeDestinations = new Set(
    (exchangeRows || [])
      .map((r) => String(r.clientId ?? "").trim())
      .filter(Boolean)
  );

  console.log(`\n[verifyValidation3ReferenceData] Exchange destinations found: ${exchangeDestinations.size}`);
  console.log(
    `  Sample: ${Array.from(exchangeDestinations)
      .slice(0, 10)
      .map((v) => JSON.stringify(v))
      .join(", ")}`
  );

  let schema = defaultValidation3OrderConditions;
  if (clientId) {
    const cId = Number.parseInt(String(clientId).trim(), 10);
    if (!Number.isFinite(cId)) {
      throw new Error(`Invalid --clientId: ${clientId}`);
    }
    const client = await prisma.client.findUnique({ where: { id: cId }, select: { validation_3: true } });
    schema = buildEffectiveSchema(defaultValidation3OrderConditions, client?.validation_3);
    console.log(`\n[verifyValidation3ReferenceData] Using effective schema for clientId=${cId}`);
  } else {
    console.log(`\n[verifyValidation3ReferenceData] Using default Validation 3 order schema`);
  }

  const anyClient = await prisma.client.findFirst({ select: { id: true } });
  const validFirmId = anyClient?.id ?? null;
  const invalidFirmId = validFirmId !== null ? validFirmId + 999999 : 999999;
  const firmRows = await prisma.client.findMany({
    where: { id: { in: [validFirmId, invalidFirmId].filter((x) => x !== null) } },
    select: { id: true },
  });
  const validFirmIds = new Set((firmRows || []).map((r) => r.id));

  const exchangeSample = Array.from(exchangeDestinations)[0] || null;

  const testCases = [
    {
      name: "Invalid destination (should fail orderDestination)",
      order: {
        orderDestination: "__INVALID_DEST__",
        orderRoutedOrderId: "ROUTE1",
        orderStartTime: "2025-01-01T10:00:00Z",
        orderEventTime: "2025-01-01T09:00:00Z",
        orderExecutingEntity: validFirmId,
        orderBookingEntity: validFirmId,
      },
    },
    {
      name: "Exchange destination with missing routed id (should fail orderRoutedOrderId)",
      order: {
        orderDestination: exchangeSample,
        orderRoutedOrderId: null,
        orderStartTime: "2025-01-01T10:00:00Z",
        orderEventTime: "2025-01-01T09:00:00Z",
        orderExecutingEntity: validFirmId,
        orderBookingEntity: validFirmId,
      },
      skipIf: () => !exchangeSample,
    },
    {
      name: "Exchange destination with routed id and valid times (should pass these rules)",
      order: {
        orderDestination: exchangeSample,
        orderRoutedOrderId: "ROUTE1",
        orderStartTime: "2025-01-01T10:00:00Z",
        orderEventTime: "2025-01-01T09:00:00Z",
        orderExecutingEntity: validFirmId,
        orderBookingEntity: validFirmId,
      },
      skipIf: () => !exchangeSample,
    },
    {
      name: "Start time earlier than event time (should fail orderStartTime)",
      order: {
        orderDestination: exchangeSample || "__INVALID_DEST__",
        orderRoutedOrderId: "ROUTE1",
        orderStartTime: "2025-01-01T08:00:00Z",
        orderEventTime: "2025-01-01T09:00:00Z",
        orderExecutingEntity: validFirmId,
        orderBookingEntity: validFirmId,
      },
    },
    {
      name: "Invalid firm id (should fail orderExecutingEntity and orderBookingEntity)",
      order: {
        orderDestination: exchangeSample || "__INVALID_DEST__",
        orderRoutedOrderId: "ROUTE1",
        orderStartTime: "2025-01-01T10:00:00Z",
        orderEventTime: "2025-01-01T09:00:00Z",
        orderExecutingEntity: invalidFirmId,
        orderBookingEntity: invalidFirmId,
      },
      skipIf: () => validFirmId === null,
    },
  ];

  console.log("\n[verifyValidation3ReferenceData] Local rule verification:");
  for (const tc of testCases) {
    if (tc.skipIf && tc.skipIf()) {
      console.log(`\n- ${tc.name}`);
      console.log("  SKIPPED (missing required reference data in DB)");
      continue;
    }

    const errs = localValidateOrderV3(tc.order, schema, { exchangeDestinations, validFirmIds });
    console.log(`\n- ${tc.name}`);
    console.log(`  errors=${errs.length}`);
    for (const e of errs) console.log(`  - field=${e.field} msg=${e.message}`);
  }

  if (batchId) {
    const bId = Number.parseInt(String(batchId).trim(), 10);
    if (!Number.isFinite(bId)) throw new Error(`Invalid --batchId: ${batchId}`);

    console.log(`\n[verifyValidation3ReferenceData] Running processValidation3ForBatch(batchId=${bId}) ...`);
    await processValidation3ForBatch(bId);
    const updated = await prisma.batch.findUnique({ where: { id: bId }, select: { id: true, validation_3: true, validation_3_status: true } });
    console.log("[verifyValidation3ReferenceData] Batch after run:");
    console.log(updated);
  }

  console.log("\n[verifyValidation3ReferenceData] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[verifyValidation3ReferenceData] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });


// node verifyValidation3ReferenceData.js --batchId 123
// Replace 123 with your actual batch id.