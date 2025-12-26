const prisma = require("../config/db");
const { orderFields, executionFields } = require("../config/fieldClassificationMap");

// Build dynamic where filters for orders
const tradeDateVariants = (tradeDate) => {
  if (!tradeDate) return [];
  const variants = [tradeDate];

  // If incoming is yyyy-mm-dd, also try dd-mm-yyyy
  const isoMatch = tradeDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    variants.push(`${d}-${m}-${y}`);
  }

  // If incoming is dd-mm-yyyy, also try yyyy-mm-dd
  const dmyMatch = tradeDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    variants.push(`${y}-${m}-${d}`);
  }

  // Deduplicate
  return Array.from(new Set(variants));
};

const buildOrderWhere = ({ tradeDate, infoBarrier, flowType, executingEntity }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ orderTradeDate: d })) });
  }
  if (infoBarrier) clauses.push({ orderInfobarrierId: infoBarrier });
  if (flowType) clauses.push({ orderFlowType: flowType });
  if (executingEntity) {
    const asNumber = Number(executingEntity);
    clauses.push({
      orderExecutingEntity: Number.isNaN(asNumber) ? undefined : asNumber,
    });
  }

  return clauses.length ? { AND: clauses } : {};
};

const buildCounterPartyOrderWhere = ({ tradeDate, destination, orderCapacity }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ orderTradeDate: d })) });
  }
  if (destination) clauses.push({ orderDestination: destination });
  if (orderCapacity) clauses.push({ orderCapacity });

  return clauses.length ? { AND: clauses } : {};
};

const buildCounterPartyExecutionWhere = ({ tradeDate, contraBroker, executionCapacity }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ executionTradeDate: d })) });
  }
  if (contraBroker) clauses.push({ executionContraBroker: contraBroker });
  if (executionCapacity) clauses.push({ executionCapacity });

  return clauses.length ? { AND: clauses } : {};
};

// Build dynamic where filters for executions
const buildExecutionWhere = ({ tradeDate, infoBarrier, executingEntity }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ executionTradeDate: d })) });
  }
  if (infoBarrier) clauses.push({ executionInfoBarrierId: infoBarrier });
  if (executingEntity) {
    const asNumber = Number(executingEntity);
    clauses.push({
      executionExecutingEntity: Number.isNaN(asNumber) ? undefined : asNumber,
    });
  }

  return clauses.length ? { AND: clauses } : {};
};

// Build classification-based filters for execution BC rows
const buildExecutionBCFilters = (filters) => {
  const map = {
    executionProductType: "Execution Product Type",
    executionCapacity: "Execution Capacity",
    tradeType: "Trade Type",
    priceImprovement: "Price Improvement",
    manningExecutionType: "Manning Execution Type",
    executionStatus: "Execution Status",
    executionActionInitiation: "Execution Action Initiation",
    clearingType: "Clearing Type",
    executionEntityType: "Execution Entity Type",
  };

  const clauses = [];
  Object.entries(map).forEach(([key, label]) => {
    const value = filters[key];
    if (value) {
      clauses.push({ businessClassification: label, businessGroup: value });
    }
  });

  return clauses;
};

const buildBookingOrderWhere = ({ tradeDate, entity, executingEntity, positionAccount, infoBarrier }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ orderTradeDate: d })) });
  }
  if (entity) clauses.push({ orderEntityId: entity });
  if (infoBarrier) clauses.push({ orderInfobarrierId: infoBarrier });

  if (executingEntity) {
    const asNumber = Number(executingEntity);
    if (!Number.isNaN(asNumber)) clauses.push({ orderExecutingEntity: asNumber });
  }

  if (positionAccount) {
    const asNumber = Number(positionAccount);
    if (!Number.isNaN(asNumber)) clauses.push({ orderPositionAccount: asNumber });
  }

  return clauses.length ? { AND: clauses } : {};
};

const buildBookingExecutionWhere = ({ tradeDate, entity, executingEntity, positionAccount, infoBarrier }) => {
  const clauses = [];

  const dates = tradeDateVariants(tradeDate);
  if (dates.length) {
    clauses.push({ OR: dates.map((d) => ({ executionTradeDate: d })) });
  }
  if (entity) clauses.push({ executionEntityId: entity });
  if (infoBarrier) clauses.push({ executionInfoBarrierId: infoBarrier });

  if (executingEntity) {
    const asNumber = Number(executingEntity);
    if (!Number.isNaN(asNumber)) clauses.push({ executionExecutingEntity: asNumber });
  }

  if (positionAccount) {
    const asNumber = Number(positionAccount);
    if (!Number.isNaN(asNumber)) clauses.push({ executionPositionId: asNumber });
  }

  return clauses.length ? { AND: clauses } : {};
};

/**
 * Client Edge Matrix search
 * 1) First check business classification tables (order/execution).
 * 2) Only if matches exist, return the underlying order/execution details (subset fields).
 * 3) If no BC matches, return empty and classificationHit=false.
 */
const searchClientEdge = async (req, res, next) => {
  try {
    const {
      tradeDate,
      infoBarrier,
      flowType,
      executingEntity,
      pageOrders = 1,
      pageExecutions = 1,
      pageSizeOrders = 10,
      pageSizeExecutions = 10,
      executionProductType,
      executionCapacity,
      tradeType: exeTradeType,
      priceImprovement,
      manningExecutionType,
      executionStatus,
      executionActionInitiation,
      clearingType,
      executionEntityType,
    } = req.query;

    const pOrders = Math.max(1, parseInt(pageOrders));
    const pExecutions = Math.max(1, parseInt(pageExecutions));
    const sizeOrders = Math.max(1, Math.min(100, parseInt(pageSizeOrders)));
    const sizeExecutions = Math.max(1, Math.min(100, parseInt(pageSizeExecutions)));

    const orderWhere = buildOrderWhere({ tradeDate, infoBarrier, flowType, executingEntity });
    const executionWhere = buildExecutionWhere({ tradeDate, infoBarrier, executingEntity });
    const executionBCClauses = buildExecutionBCFilters({
      executionProductType,
      executionCapacity,
      tradeType: exeTradeType,
      priceImprovement,
      manningExecutionType,
      executionStatus,
      executionActionInitiation,
      clearingType,
      executionEntityType,
    });

    const orderBC = await prisma.orderBusinessClassification.findMany({
      where: {
        order: {
          ...orderWhere,
        },
      },
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        orderId: true,
        uniqueID: true,
        order: {
          select: {
            id: true,
            uniqueID: true,
            orderId: true,
            orderSymbol: true,
            orderTradeDate: true,
            orderFlowType: true,
            orderInfobarrierId: true,
            orderExecutingEntity: true,
            orderAction: true,
            orderStatus: true,
            orderCapacity: true,
            createdAt: true,
          },
        },
      },
      skip: (pOrders - 1) * sizeOrders,
      take: sizeOrders,
    });

    const orderTotal = await prisma.orderBusinessClassification.count({
      where: { order: { ...orderWhere } },
    });

    const executionBC = await prisma.executionBusinessClassification.findMany({
      where: Object.assign(
        {},
        executionBCClauses.length ? { AND: executionBCClauses } : {},
        {
          execution: {
            ...executionWhere,
          },
        }
      ),
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        executionId: true,
        uniqueID: true,
        execution: {
          select: {
            id: true,
            uniqueID: true,
            executionId: true,
            executionSymbol: true,
            executionTradeDate: true,
            executionTransactionType: true,
            executionInfoBarrierId: true,
            executionExecutingEntity: true,
            executionCapacity: true,
            executionAction: true,
            createdAt: true,
          },
        },
      },
      skip: (pExecutions - 1) * sizeExecutions,
      take: sizeExecutions,
    });

    const executionTotal = await prisma.executionBusinessClassification.count({
      where: Object.assign(
        {},
        executionBCClauses.length ? { AND: executionBCClauses } : {},
        {
          execution: { ...executionWhere },
        }
      ),
    });

    const classificationHit = orderBC.length > 0 || executionBC.length > 0;

    if (!classificationHit) {
      return res.json({
        classificationHit: false,
        orders: [],
        executions: [],
        pagination: {
          orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
          executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
        },
      });
    }

    // Flatten and normalize outputs
    const orders = orderBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      orderId: bc.order?.orderId,
      uniqueID: bc.order?.uniqueID,
      symbol: bc.order?.orderSymbol,
      tradeDate: bc.order?.orderTradeDate,
      flowType: bc.order?.orderFlowType,
      infoBarrier: bc.order?.orderInfobarrierId,
      executingEntity: bc.order?.orderExecutingEntity,
      action: bc.order?.orderAction,
      status: bc.order?.orderStatus,
      capacity: bc.order?.orderCapacity,
      createdAt: bc.order?.createdAt,
    }));

    const executions = executionBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      executionId: bc.execution?.executionId,
      uniqueID: bc.execution?.uniqueID,
      symbol: bc.execution?.executionSymbol,
      tradeDate: bc.execution?.executionTradeDate,
      flowType: bc.execution?.executionTransactionType,
      infoBarrier: bc.execution?.executionInfoBarrierId,
      executingEntity: bc.execution?.executionExecutingEntity,
      capacity: bc.execution?.executionCapacity,
      action: bc.execution?.executionAction,
      createdAt: bc.execution?.createdAt,
    }));

    return res.json({
      classificationHit: true,
      orders,
      executions,
      pagination: {
        orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
        executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
      },
    });
  } catch (err) {
    console.error("[BusinessClassification] searchClientEdge error", err);
    next(err);
  }
};

const searchCounterPartyMatrix = async (req, res, next) => {
  try {
    const {
      tradeDate,
      destination,
      contraBroker,
      orderCapacity,
      executionCapacity,
      pageOrders = 1,
      pageExecutions = 1,
      pageSizeOrders = 10,
      pageSizeExecutions = 10,
    } = req.query;

    const pOrders = Math.max(1, parseInt(pageOrders));
    const pExecutions = Math.max(1, parseInt(pageExecutions));
    const sizeOrders = Math.max(1, Math.min(100, parseInt(pageSizeOrders)));
    const sizeExecutions = Math.max(1, Math.min(100, parseInt(pageSizeExecutions)));

    const orderWhere = buildCounterPartyOrderWhere({ tradeDate, destination, orderCapacity });
    const executionWhere = buildCounterPartyExecutionWhere({ tradeDate, contraBroker, executionCapacity });

    const orderBC = await prisma.orderBusinessClassification.findMany({
      where: {
        order: {
          ...orderWhere,
        },
      },
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        orderId: true,
        uniqueID: true,
        order: {
          select: {
            id: true,
            uniqueID: true,
            orderId: true,
            orderSymbol: true,
            orderTradeDate: true,
            orderDestination: true,
            orderCapacity: true,
            createdAt: true,
          },
        },
      },
      skip: (pOrders - 1) * sizeOrders,
      take: sizeOrders,
    });

    const orderTotal = await prisma.orderBusinessClassification.count({
      where: { order: { ...orderWhere } },
    });

    const executionBC = await prisma.executionBusinessClassification.findMany({
      where: {
        execution: {
          ...executionWhere,
        },
      },
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        executionId: true,
        uniqueID: true,
        execution: {
          select: {
            id: true,
            uniqueID: true,
            executionId: true,
            executionSymbol: true,
            executionTradeDate: true,
            executionContraBroker: true,
            executionCapacity: true,
            createdAt: true,
          },
        },
      },
      skip: (pExecutions - 1) * sizeExecutions,
      take: sizeExecutions,
    });

    const executionTotal = await prisma.executionBusinessClassification.count({
      where: { execution: { ...executionWhere } },
    });

    const classificationHit = orderBC.length > 0 || executionBC.length > 0;

    if (!classificationHit) {
      return res.json({
        classificationHit: false,
        orders: [],
        executions: [],
        pagination: {
          orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
          executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
        },
      });
    }

    const orders = orderBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      orderId: bc.order?.orderId,
      uniqueID: bc.order?.uniqueID,
      symbol: bc.order?.orderSymbol,
      tradeDate: bc.order?.orderTradeDate,
      flowType: bc.order?.orderDestination,
      capacity: bc.order?.orderCapacity,
      createdAt: bc.order?.createdAt,
    }));

    const executions = executionBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      executionId: bc.execution?.executionId,
      uniqueID: bc.execution?.uniqueID,
      symbol: bc.execution?.executionSymbol,
      tradeDate: bc.execution?.executionTradeDate,
      flowType: bc.execution?.executionContraBroker,
      capacity: bc.execution?.executionCapacity,
      createdAt: bc.execution?.createdAt,
    }));

    return res.json({
      classificationHit: true,
      orders,
      executions,
      pagination: {
        orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
        executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
      },
    });
  } catch (err) {
    console.error("[BusinessClassification] searchCounterPartyMatrix error", err);
    next(err);
  }
};
const searchBookingMatrix = async (req, res, next) => {
  try {
    const {
      tradeDate,
      entity,
      executingEntity,
      positionAccount,
      infoBarrier,
      pageOrders = 1,
      pageExecutions = 1,
      pageSizeOrders = 10,
      pageSizeExecutions = 10,
    } = req.query;

    const pOrders = Math.max(1, parseInt(pageOrders));
    const pExecutions = Math.max(1, parseInt(pageExecutions));
    const sizeOrders = Math.max(1, Math.min(100, parseInt(pageSizeOrders)));
    const sizeExecutions = Math.max(1, Math.min(100, parseInt(pageSizeExecutions)));

    const orderWhere = buildBookingOrderWhere({ tradeDate, entity, executingEntity, positionAccount, infoBarrier });
    const executionWhere = buildBookingExecutionWhere({ tradeDate, entity, executingEntity, positionAccount, infoBarrier });

    const orderBC = await prisma.orderBusinessClassification.findMany({
      where: {
        order: {
          ...orderWhere,
        },
      },
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        orderId: true,
        uniqueID: true,
        order: {
          select: {
            id: true,
            uniqueID: true,
            orderId: true,
            orderSymbol: true,
            orderTradeDate: true,
            orderFlowType: true,
            orderInfobarrierId: true,
            orderExecutingEntity: true,
            orderEntityId: true,
            orderPositionAccount: true,
            orderAction: true,
            orderStatus: true,
            orderCapacity: true,
            createdAt: true,
          },
        },
      },
      skip: (pOrders - 1) * sizeOrders,
      take: sizeOrders,
    });

    const orderTotal = await prisma.orderBusinessClassification.count({
      where: { order: { ...orderWhere } },
    });

    const executionBC = await prisma.executionBusinessClassification.findMany({
      where: {
        execution: {
          ...executionWhere,
        },
      },
      select: {
        id: true,
        businessClassification: true,
        businessGroup: true,
        executionId: true,
        uniqueID: true,
        execution: {
          select: {
            id: true,
            uniqueID: true,
            executionId: true,
            executionSymbol: true,
            executionTradeDate: true,
            executionTransactionType: true,
            executionInfoBarrierId: true,
            executionExecutingEntity: true,
            executionEntityId: true,
            executionPositionId: true,
            executionCapacity: true,
            executionAction: true,
            createdAt: true,
          },
        },
      },
      skip: (pExecutions - 1) * sizeExecutions,
      take: sizeExecutions,
    });

    const executionTotal = await prisma.executionBusinessClassification.count({
      where: { execution: { ...executionWhere } },
    });

    const classificationHit = orderBC.length > 0 || executionBC.length > 0;

    if (!classificationHit) {
      return res.json({
        classificationHit: false,
        orders: [],
        executions: [],
        pagination: {
          orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
          executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
        },
      });
    }

    const orders = orderBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      orderId: bc.order?.orderId,
      uniqueID: bc.order?.uniqueID,
      symbol: bc.order?.orderSymbol,
      tradeDate: bc.order?.orderTradeDate,
      flowType: bc.order?.orderFlowType,
      infoBarrier: bc.order?.orderInfobarrierId,
      executingEntity: bc.order?.orderExecutingEntity,
      action: bc.order?.orderAction,
      status: bc.order?.orderStatus,
      capacity: bc.order?.orderCapacity,
      createdAt: bc.order?.createdAt,
    }));

    const executions = executionBC.map((bc) => ({
      classificationId: bc.id,
      businessClassification: bc.businessClassification,
      businessGroup: bc.businessGroup,
      executionId: bc.execution?.executionId,
      uniqueID: bc.execution?.uniqueID,
      symbol: bc.execution?.executionSymbol,
      tradeDate: bc.execution?.executionTradeDate,
      flowType: bc.execution?.executionTransactionType,
      infoBarrier: bc.execution?.executionInfoBarrierId,
      executingEntity: bc.execution?.executionExecutingEntity,
      capacity: bc.execution?.executionCapacity,
      action: bc.execution?.executionAction,
      createdAt: bc.execution?.createdAt,
    }));

    return res.json({
      classificationHit: true,
      orders,
      executions,
      pagination: {
        orders: { page: pOrders, pageSize: sizeOrders, total: orderTotal },
        executions: { page: pExecutions, pageSize: sizeExecutions, total: executionTotal },
      },
    });
  } catch (err) {
    console.error("[BusinessClassification] searchBookingMatrix error", err);
    next(err);
  }
};

module.exports = {
  searchClientEdge,
  searchBookingMatrix,
  searchCounterPartyMatrix,
  // Returns order fields grouped by their category for UI selection
  getOrderFieldsGrouped: (req, res) => {
    const grouped = Object.entries(orderFields).reduce(
      (acc, [field, category]) => {
        if (!acc[category]) acc[category] = [];
        acc[category].push(field);
        return acc;
      },
      { Identifier: [], "Business Classification": [], Economics: [] }
    );

    // Sort fields alphabetically for consistent UI
    Object.keys(grouped).forEach((k) => grouped[k].sort());

    res.json({ grouped });
  },
  getExecutionFieldsGrouped: (req, res) => {
    const grouped = Object.entries(executionFields).reduce(
      (acc, [field, category]) => {
        if (!acc[category]) acc[category] = [];
        acc[category].push(field);
        return acc;
      },
      { Identifier: [], "Business Classification": [], Economics: [] }
    );

    Object.keys(grouped).forEach((k) => grouped[k].sort());

    res.json({ grouped });
  },
};
