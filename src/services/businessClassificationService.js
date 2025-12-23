const prisma = require("../config/db");

// Lightweight helpers to map codes to readable labels.
const mapOrderCapacityDerived = (cap) => {
  switch (String(cap || "").trim()) {
    case "1":
      return "Agency";
    case "2":
      return "Proprietary";
    case "3":
      return "Individual";
    case "4":
      return "Principal";
    case "5":
      return "Riskless Principal";
    default:
      return null;
  }
};

const mapFlowTypeDerived = (flow) => {
  switch (String(flow || "").trim()) {
    case "1":
      return "DMA (Direct Market Access)";
    case "2":
      return "Algo";
    case "3":
      return "Sponsored Access";
    default:
      return null;
  }
};

const mapOrderStatus = (status) => {
  switch (String(status || "").trim()) {
    case "1":
      return "Open";
    case "2":
      return "Canceled";
    case "3":
      return "Replaced";
    case "4":
      return "Done for day";
    case "5":
      return "Expired";
    case "6":
      return "Rejected";
    case "7":
      return "Partially filled";
    case "8":
      return "Filled";
    default:
      return null;
  }
};

const mapOrderAction = (action) => {
  switch (String(action || "").trim()) {
    case "1":
      return "Order Requested";
    case "2":
      return "Order Request Accepted";
    case "3":
      return "Order Internal Route";
    case "4":
      return "Order Internal Route Acknowledged";
    case "5":
      return "Order External Route";
    case "6":
      return "Order External Route Acknowledged";
    case "7":
      return "Order Canceled";
    case "8":
      return "Order Replaced";
    case "9":
      return "Order Replace - Client Requested";
    case "10":
      return "Order Replace - Client Request Accepted";
    case "11":
      return "Order Cancel - Client Requested";
    case "12":
      return "Order Cancel - Client Request Accepted";
    case "13":
      return "Order Expired";
    case "14":
      return "Order External Route (Alternative)";
    case "15":
      return "Order Externally Routed Accepted";
    case "16":
      return "Order Rejected";
    case "17":
      return "Order Suspended";
    case "18":
      return "Done for day";
    default:
      return null;
  }
};

const mapOrderEdge = (order) => {
  // Simplified derivation based on available fields
  const capacity = String(order.orderCapacity || "").trim();
  const action = String(order.orderAction || "").trim();
  const linkedType = String(order.linkOrderType || order.linkedOrderType || "").trim();
  if (capacity === "1" && order.orderOmsSource && order.orderOmsSource === order.orderOriginationSystem) {
    return "Client Facing";
  }
  if (order.orderDestination && action === "15") {
    return "Market Facing";
  }
  if (capacity === "4" && order.orderOmsSource && order.orderOmsSource === order.orderOriginationSystem) {
    return "Principal";
  }
  if (linkedType === "4") {
    return "Aggregated";
  }
  if (action === "4" && order.orderInfobarrierId) {
    return "Information Barrier";
  }
  return "Internal";
};

const mapArrivalMarketability = (order) => {
  const type = String(order.orderType || "").trim();
  const side = String(order.orderSide || "").trim();
  const price = order.orderPrice;
  const bid = order.orderBidPrice;
  const ask = order.orderAskPrice;

  if (type === "1") return "Marketable";

  if (type === "2" && price != null && bid != null && ["2", "4", "5", "6"].includes(side) && Number(price) <= Number(bid)) {
    return "Marketable";
  }

  if (type === "2" && price != null && ask != null && side === "1" && Number(price) >= Number(ask)) {
    return "Marketable";
  }

  if (type) return "Non-Marketable";
  return null;
};

const mapExecutionCapacity = (cap) => {
  switch (String(cap || "").trim()) {
    case "1":
      return "Agency";
    case "2":
      return "Principal";
    case "5":
      return "Riskless Principal";
    default:
      return null;
  }
};

const classifyOrderRecord = (order) => {
  const entries = [];
  const capacity = mapOrderCapacityDerived(order.orderCapacity);
  if (capacity) {
    entries.push({ businessClassification: "Order Capacity Derived", businessGroup: capacity });
  }

  const flow = mapFlowTypeDerived(order.orderFlowType);
  if (flow) {
    entries.push({ businessClassification: "Flow Type Derived", businessGroup: flow });
  }

  const status = mapOrderStatus(order.orderStatus);
  if (status) {
    entries.push({ businessClassification: "Order Status", businessGroup: status });
  }

  const action = mapOrderAction(order.orderAction);
  if (action) {
    entries.push({ businessClassification: "Order Action", businessGroup: action });
  }

  const edge = mapOrderEdge(order);
  if (edge) {
    entries.push({ businessClassification: "Order Edge", businessGroup: edge });
  }

  const arrival = mapArrivalMarketability(order);
  if (arrival) {
    entries.push({ businessClassification: "Arrival Marketability", businessGroup: arrival });
  }

  return entries;
};

const classifyExecutionRecord = (execution) => {
  const entries = [];
  const cap = mapExecutionCapacity(execution.executionCapacity);
  if (cap) {
    entries.push({ businessClassification: "Execution Capacity", businessGroup: cap });
  }
  return entries;
};

/**
 * Classify all orders in a batch and persist to order_business_classifications
 * - Uses deterministic mappings only (safe fallbacks when data missing)
 */
const classifyOrdersForBatch = async (batchId) => {
  const orders = await prisma.order.findMany({ where: { batchId } });
  if (!orders.length) return;

  const orderIds = orders.map((o) => o.id);
  await prisma.orderBusinessClassification.deleteMany({ where: { orderId: { in: orderIds } } });

  const data = [];
  for (const order of orders) {
    const groups = classifyOrderRecord(order);
    for (const g of groups) {
      data.push({
        orderId: order.id,
        uniqueID: order.uniqueID,
        businessClassification: g.businessClassification,
        businessGroup: g.businessGroup,
      });
    }
  }

  if (data.length) {
    await prisma.orderBusinessClassification.createMany({ data });
  }
};

/**
 * Classify all executions in a batch and persist to execution_business_classifications
 */
const classifyExecutionsForBatch = async (batchId) => {
  const executions = await prisma.execution.findMany({ where: { batchId } });
  if (!executions.length) return;

  const executionIds = executions.map((e) => e.id);
  await prisma.executionBusinessClassification.deleteMany({ where: { executionId: { in: executionIds } } });

  const data = [];
  for (const exe of executions) {
    const groups = classifyExecutionRecord(exe);
    for (const g of groups) {
      data.push({
        executionId: exe.id,
        uniqueID: exe.uniqueID,
        businessClassification: g.businessClassification,
        businessGroup: g.businessGroup,
      });
    }
  }

  if (data.length) {
    await prisma.executionBusinessClassification.createMany({ data });
  }
};

module.exports = {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
};
