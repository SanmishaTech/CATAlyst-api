const prisma = require("../config/db");

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

/**
 * Client Edge Matrix search
 * 1) First check business classification tables (order/execution).
 * 2) Only if matches exist, return the underlying order/execution details (subset fields).
 * 3) If no BC matches, return empty and classificationHit=false.
 */
const searchClientEdge = async (req, res, next) => {
  try {
    const { tradeDate, infoBarrier, flowType, executingEntity } = req.query;

    const orderWhere = buildOrderWhere({ tradeDate, infoBarrier, flowType, executingEntity });
    const executionWhere = buildExecutionWhere({ tradeDate, infoBarrier, executingEntity });

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
      take: 100,
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
            executionCapacity: true,
            executionAction: true,
            createdAt: true,
          },
        },
      },
      take: 100,
    });

    const classificationHit = orderBC.length > 0 || executionBC.length > 0;

    if (!classificationHit) {
      return res.json({
        classificationHit: false,
        orders: [],
        executions: [],
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
    });
  } catch (err) {
    console.error("[BusinessClassification] searchClientEdge error", err);
    next(err);
  }
};

module.exports = {
  searchClientEdge,
};
