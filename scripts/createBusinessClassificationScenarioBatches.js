require("dotenv").config();

const prisma = require("../src/config/db");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("../src/services/businessClassificationService");

const parseArgs = (argv) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--userEmail") out.userEmail = argv[i + 1];
    if (a === "--userId") out.userId = argv[i + 1];
    if (a === "--templateOrderBatchId") out.templateOrderBatchId = argv[i + 1];
    if (a === "--templateExecutionBatchId")
      out.templateExecutionBatchId = argv[i + 1];
    if (a === "--skipRun") out.skipRun = true;
  }
  return out;
};

const makeScenarioId = (prefix) => {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${t}-${Math.random().toString(16).slice(2, 8)}`;
};

const cloneOrder = (templateOrder, overrides) => {
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

const cloneExecution = (templateExecution, overrides) => {
  const { id, batchId, createdAt, updatedAt, ...base } = templateExecution;
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

const groupBy = (rows, key) => {
  const map = new Map();
  for (const r of rows || []) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
};

const hasClassification = (rows, classification, group) => {
  return (rows || []).some((r) => {
    if (r.businessClassification !== classification) return false;
    if (group === null) return r.businessGroup == null;
    return r.businessGroup === group;
  });
};

const main = async () => {
  const {
    userEmail,
    userId,
    templateOrderBatchId,
    templateExecutionBatchId,
    skipRun,
  } = parseArgs(process.argv.slice(2));

  const targetUserEmail = String(userEmail || "client1@example.com").trim();
  let preferredUserId = Number.parseInt(String(userId ?? "").trim(), 10);
  if (!Number.isFinite(preferredUserId)) preferredUserId = NaN;

  if (!Number.isFinite(preferredUserId)) {
    const u = await prisma.user.findFirst({
      where: { email: targetUserEmail },
      select: { id: true },
    });
    if (!u) throw new Error(`User not found for --userEmail ${targetUserEmail}`);
    preferredUserId = u.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: preferredUserId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error(`User not found for id=${preferredUserId}`);

  let tplOrderBatchId = Number.parseInt(String(templateOrderBatchId ?? "").trim(), 10);
  if (!Number.isFinite(tplOrderBatchId)) tplOrderBatchId = NaN;

  if (!Number.isFinite(tplOrderBatchId)) {
    const b = await prisma.batch.findFirst({
      where: {
        userId: user.id,
        OR: [{ fileType: null }, { fileType: { not: "execution" } }],
      },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (!b) throw new Error(`No template order batch found for userId=${user.id}`);
    tplOrderBatchId = b.id;
  }

  let tplExeBatchId = Number.parseInt(String(templateExecutionBatchId ?? "").trim(), 10);
  if (!Number.isFinite(tplExeBatchId)) tplExeBatchId = NaN;

  if (!Number.isFinite(tplExeBatchId)) {
    const b = await prisma.batch.findFirst({
      where: {
        userId: user.id,
        fileType: "execution",
      },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    if (b) tplExeBatchId = b.id;
  }

  const templateOrder = await prisma.order.findFirst({
    where: { batchId: tplOrderBatchId },
    orderBy: { id: "asc" },
  });
  if (!templateOrder)
    throw new Error(`No orders found in template batchId=${tplOrderBatchId}`);

  const templateExecution = Number.isFinite(tplExeBatchId)
    ? await prisma.execution.findFirst({
        where: { batchId: tplExeBatchId },
        orderBy: { id: "asc" },
      })
    : null;

  const scenarioPrefix = makeScenarioId("BC");

  const orderBatch = await prisma.batch.create({
    data: {
      userId: user.id,
      status: "pending",
      fileName: `scenario_business_classification_orders_${scenarioPrefix}`,
      fileType: "orders",
      validation_1: null,
      validation_1_status: null,
      validation_2: null,
      validation_2_status: null,
      validation_3: null,
      validation_3_status: null,
    },
  });

  const orderScenarios = [
    {
      name: "ORDER_EDGE_CLIENT_FACING",
      expected: [{ businessClassification: "Order Edge", businessGroup: "Client Facing" }],
      fields: {
        orderCapacity: "1",
        orderOmsSource: "OMS_A",
        orderOriginationSystem: "OMS_A",
        orderAction: "1",
      },
    },
    {
      name: "ORDER_EDGE_MARKET_FACING",
      expected: [{ businessClassification: "Order Edge", businessGroup: "Market Facing" }],
      fields: {
        orderDestination: "DEST_1",
        orderAction: "15",
      },
    },
    {
      name: "ORDER_EDGE_PRINCIPAL",
      expected: [{ businessClassification: "Order Edge", businessGroup: "Principal" }],
      fields: {
        orderCapacity: "4",
        orderOmsSource: "OMS_A",
        orderOriginationSystem: "OMS_A",
      },
    },
    {
      name: "ORDER_EDGE_AGGREGATED",
      expected: [{ businessClassification: "Order Edge", businessGroup: "Aggregated" }],
      fields: {
        linkOrderType: "4",
      },
    },
    {
      name: "ORDER_EDGE_INFO_BARRIER",
      expected: [
        { businessClassification: "Order Edge", businessGroup: "Information Barrier" },
      ],
      fields: {
        orderAction: "4",
        orderInfobarrierId: "IB_1",
      },
    },
    {
      name: "ORDER_EDGE_INTERNAL",
      expected: [{ businessClassification: "Order Edge", businessGroup: "Internal" }],
      fields: {
        orderCapacity: "1",
        orderOmsSource: "OMS_A",
        orderOriginationSystem: "OMS_B",
        orderDestination: null,
        orderInfobarrierId: null,
        linkOrderType: null,
        orderAction: "1",
      },
    },
    {
      name: "ORDER_NO_BUSINESS_CLASSIFICATION",
      expected: [{ businessClassification: "No Business Classification", businessGroup: null }],
      fields: {
        orderCapacity: "",
        orderAction: "",
        orderOmsSource: "",
        orderOriginationSystem: "",
        orderType: "",
        orderSide: "",
        orderPublishingTime: "",
        orderComplianceId: "",
        orderDestination: null,
        orderInfobarrierId: null,
        linkOrderType: null,
        orderFlowType: null,
        orderStatus: null,
        orderPrice: null,
        orderBidPrice: null,
        orderAskPrice: null,
      },
      assertOnlyRow: true,
    },
  ];

  const createdOrders = [];
  for (const s of orderScenarios) {
    const order = cloneOrder(templateOrder, {
      batchId: orderBatch.id,
      userId: user.id,
      scenarioId: makeScenarioId(s.name),
      fields: s.fields,
    });
    const created = await prisma.order.create({ data: order });
    createdOrders.push({ scenario: s.name, orderId: created.id });
  }

  let executionBatch = null;
  const exeScenarios = [];
  const createdExecutions = [];

  if (templateExecution) {
    executionBatch = await prisma.batch.create({
      data: {
        userId: user.id,
        status: "pending",
        fileName: `scenario_business_classification_executions_${scenarioPrefix}`,
        fileType: "execution",
        validation_1: null,
        validation_1_status: null,
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    exeScenarios.push(
      {
        name: "EXEC_CAP_AGENCY",
        expected: [{ businessClassification: "Execution Capacity", businessGroup: "Agency" }],
        fields: { executionCapacity: "1" },
      },
      {
        name: "EXEC_CAP_PRINCIPAL",
        expected: [{ businessClassification: "Execution Capacity", businessGroup: "Principal" }],
        fields: { executionCapacity: "2" },
      },
      {
        name: "EXEC_NO_BUSINESS_CLASSIFICATION",
        expected: [{ businessClassification: "No Business Classification", businessGroup: null }],
        fields: { executionCapacity: "" },
        assertOnlyRow: true,
      }
    );

    for (const s of exeScenarios) {
      const exe = cloneExecution(templateExecution, {
        batchId: executionBatch.id,
        userId: user.id,
        scenarioId: makeScenarioId(s.name),
        fields: s.fields,
      });
      const created = await prisma.execution.create({ data: exe });
      createdExecutions.push({ scenario: s.name, executionId: created.id });
    }
  }

  if (!skipRun) {
    await classifyOrdersForBatch(orderBatch.id);
    if (executionBatch) await classifyExecutionsForBatch(executionBatch.id);
  }

  const orderBC = await prisma.orderBusinessClassification.findMany({
    where: { orderId: { in: createdOrders.map((o) => o.orderId) } },
    select: { orderId: true, businessClassification: true, businessGroup: true },
    orderBy: { id: "asc" },
  });
  const orderBCMap = groupBy(orderBC, "orderId");

  const orderResults = [];
  for (const s of orderScenarios) {
    const row = createdOrders.find((x) => x.scenario === s.name);
    const rows = orderBCMap.get(row.orderId) || [];
    const expectedOk = (s.expected || []).every((e) =>
      hasClassification(rows, e.businessClassification, e.businessGroup)
    );
    const onlyOk = s.assertOnlyRow
      ? rows.length === 1 &&
        rows[0].businessClassification === "No Business Classification" &&
        rows[0].businessGroup == null
      : true;

    orderResults.push({
      type: "order",
      scenario: s.name,
      orderId: row.orderId,
      rowCount: rows.length,
      pass: expectedOk && onlyOk,
    });
  }

  const executionResults = [];
  if (executionBatch) {
    const exeBC = await prisma.executionBusinessClassification.findMany({
      where: { executionId: { in: createdExecutions.map((e) => e.executionId) } },
      select: { executionId: true, businessClassification: true, businessGroup: true },
      orderBy: { id: "asc" },
    });
    const exeBCMap = groupBy(exeBC, "executionId");

    for (const s of exeScenarios) {
      const row = createdExecutions.find((x) => x.scenario === s.name);
      const rows = exeBCMap.get(row.executionId) || [];
      const expectedOk = (s.expected || []).every((e) =>
        hasClassification(rows, e.businessClassification, e.businessGroup)
      );
      const onlyOk = s.assertOnlyRow
        ? rows.length === 1 &&
          rows[0].businessClassification === "No Business Classification" &&
          rows[0].businessGroup == null
        : true;

      executionResults.push({
        type: "execution",
        scenario: s.name,
        executionId: row.executionId,
        rowCount: rows.length,
        pass: expectedOk && onlyOk,
      });
    }
  }

  const allResults = [...orderResults, ...executionResults];
  const passCount = allResults.filter((r) => r.pass).length;
  const failCount = allResults.length - passCount;

  console.log("\n[createBusinessClassificationScenarioBatches] Created batches:");
  console.table([
    {
      userId: user.id,
      userEmail: user.email,
      orderBatchId: orderBatch.id,
      executionBatchId: executionBatch ? executionBatch.id : null,
      orderScenarioCount: orderScenarios.length,
      executionScenarioCount: exeScenarios.length,
    },
  ]);

  console.log("\n[createBusinessClassificationScenarioBatches] Scenario results:");
  console.table(allResults);

  console.log("\n[createBusinessClassificationScenarioBatches] Summary:");
  console.table([
    {
      totalScenarios: allResults.length,
      passed: passCount,
      failed: failCount,
    },
  ]);

  if (failCount > 0) {
    console.log(
      "\n[createBusinessClassificationScenarioBatches] Failed scenario details (first rows):"
    );
    const failed = allResults.filter((r) => !r.pass);
    console.table(failed);
  }

  console.log("\n[createBusinessClassificationScenarioBatches] Done");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("\n[createBusinessClassificationScenarioBatches] Error:");
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
