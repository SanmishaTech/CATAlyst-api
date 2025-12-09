const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('../middleware/asyncHandler');

const prisma = new PrismaClient();

/**
 * @desc    Get all data quality issues (validation errors) with pagination and sorting
 * @route   GET /api/quality/issues?page=1&limit=10&sortBy=createdAt&sortOrder=desc
 * @access  Private
 */
exports.getQualityIssues = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Sorting parameters
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
  
  // Date range filter parameters (YYYY-MM-DD format)
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;
  
  // Search parameter for global search
  const searchFilter = req.query.search;
  
  // Validate sortBy to prevent injection
  const allowedSortFields = ['validationCode', 'category', 'message', 'fileName', 'createdAt', 'batchId'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  
  console.log('[Quality Issues] Fetching issues for user:', userId, 'role:', userRole, 'page:', page, 'limit:', limit, 'sortBy:', validSortBy, 'sortOrder:', sortOrder, 'fromDate:', fromDate, 'toDate:', toDate, 'search:', searchFilter);

  // Build query based on user role - optimize with single query
  let whereClause = {};
  
  // If not admin, filter by user's clientId
  if (userRole !== 'admin') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clientId: true }
    });

    if (user && user.clientId) {
      // Optimize: Use direct clientId filter instead of fetching all users
      whereClause.batch = {
        user: {
          clientId: user.clientId
        }
      };
    } else {
      // If user has no clientId, only show their own data
      whereClause.batch = {
        userId: userId
      };
    }
  }

  // Add date range filter if provided (YYYY-MM-DD format)
  if (fromDate || toDate) {
    whereClause.createdAt = {};
    
    if (fromDate) {
      const startDate = new Date(fromDate);
      whereClause.createdAt.gte = startDate;
    }
    
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1); // Include entire day
      whereClause.createdAt.lt = endDate;
    }
  }

  // Add search filter if provided - search across message, validationCode, and batch fileName
  if (searchFilter) {
    whereClause.OR = [
      { message: { contains: searchFilter, mode: 'insensitive' } },
      { validationCode: { contains: searchFilter, mode: 'insensitive' } },
      { batch: { fileName: { contains: searchFilter, mode: 'insensitive' } } }
    ];
  }

  // Get total count for pagination - use efficient count query
  const totalCount = await prisma.validationError.count({
    where: whereClause
  });

  // Get category counts for accurate totals across all pages
  const categoryCounts = await prisma.validationError.groupBy({
    by: ['code'],
    where: whereClause,
    _count: true
  });

  // Map code prefixes to categories and sum counts
  const categoryTotals = { duplicate: 0, syntax: 0, context: 0 };
  for (const item of categoryCounts) {
    const code = item.code?.toLowerCase() || '';
    if (code.includes('dup')) {
      categoryTotals.duplicate += item._count;
    } else if (code.includes('fmt') || code.includes('syntax') || code.includes('invalid')) {
      categoryTotals.syntax += item._count;
    } else {
      categoryTotals.context += item._count;
    }
  }

  // Build orderBy clause based on sortBy parameter
  // Note: category and fileName are computed fields, so we sort by related fields
  let orderByClause = {};
  
  if (validSortBy === 'fileName') {
    orderByClause = { batch: { fileName: sortOrder } };
  } else if (validSortBy === 'batchId') {
    orderByClause = { batchId: sortOrder };
  } else if (validSortBy === 'validationCode') {
    orderByClause = { validationCode: sortOrder };
  } else if (validSortBy === 'message') {
    orderByClause = { message: sortOrder };
  } else if (validSortBy === 'category') {
    // For category, sort by code since category is derived from code
    orderByClause = { code: sortOrder };
  } else {
    // Default to createdAt
    orderByClause = { createdAt: sortOrder };
  }

  // Build ORDER BY clause for raw SQL
  let orderByField = 've.createdAt';
  if (validSortBy === 'fileName') {
    orderByField = 'b.fileName';
  } else if (validSortBy === 'batchId') {
    orderByField = 've.batchId';
  } else if (validSortBy === 'validationCode') {
    orderByField = 've.validationCode';
  } else if (validSortBy === 'message') {
    orderByField = 've.message';
  } else if (validSortBy === 'category') {
    orderByField = 've.code';
  }

  // Build WHERE clause conditions
  let whereConditions = [];
  const startDate = whereClause.createdAt?.gte || new Date('2000-01-01');
  const endDate = whereClause.createdAt?.lt || new Date('2099-12-31');
  
  whereConditions.push(`ve.createdAt >= '${startDate.toISOString()}'`);
  whereConditions.push(`ve.createdAt < '${endDate.toISOString()}'`);
  
  if (whereClause.batch?.user?.clientId) {
    whereConditions.push(`u.clientId = ${whereClause.batch.user.clientId}`);
  }
  if (whereClause.batch?.userId) {
    whereConditions.push(`b.userId = ${whereClause.batch.userId}`);
  }

  const whereSQL = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Fetch validation errors with batch and order information using raw SQL for better performance
  // Use subquery to filter validation_errors first, then join with batch and orders
  // This is more efficient than filtering after joining
  const validationErrors = await prisma.$queryRawUnsafe(`
    SELECT 
      ve.id,
      ve.validationCode,
      ve.code,
      ve.message,
      ve.field,
      ve.batchId,
      ve.orderId,
      ve.createdAt,
      b.id as batch_id,
      b.fileName,
      b.createdAt as batch_createdAt,
      b.tradeDate,
      o.id as order_id,
      o.orderId as order_orderId,
      o.uniqueID,
      o.id_deduped,
      o.is_validated,
      o.orderIdVersion,
      o.orderIdSession,
      o.orderIdInstance,
      o.parentOrderId,
      o.cancelreplaceOrderId,
      o.linkedOrderId,
      o.orderAction,
      o.orderStatus,
      o.orderCapacity,
      o.orderDestination,
      o.orderClientRef,
      o.orderClientRefDetails,
      o.orderExecutingEntity,
      o.orderBookingEntity,
      o.orderPositionAccount,
      o.orderSide,
      o.orderClientCapacity,
      o.orderManualIndicator,
      o.orderRequestTime,
      o.orderEventTime,
      o.orderManualTimestamp,
      o.orderOmsSource,
      o.orderPublishingTime,
      o.orderQuantity,
      o.orderPrice,
      o.orderType,
      o.orderTimeInforce,
      o.orderExecutionInstructions,
      o.orderAttributes,
      o.orderRestrictions,
      o.orderAuctionIndicator,
      o.orderSwapIndicator,
      o.orderOsi,
      o.orderInstrumentId,
      o.orderLinkedInstrumentId,
      o.orderCurrencyId,
      o.orderFlowType,
      o.orderAlgoInstruction,
      o.orderSymbol,
      o.orderInstrumentReference,
      o.orderInstrumentReferenceValue,
      o.orderOptionPutCall,
      o.orderOptionStrikePrice,
      o.orderOptionLegIndicator,
      o.orderComplianceId,
      o.orderEntityId,
      o.orderExecutingAccount,
      o.orderClearingAccount,
      o.orderClientOrderId,
      o.orderRoutedOrderId,
      o.orderTradingOwner,
      o.orderExtendedAttribute,
      o.orderQuoteId,
      o.orderRepresentOrderId,
      o.orderOnBehalfCompId,
      o.orderSpread,
      o.orderAmendReason,
      o.orderCancelRejectReason,
      o.orderBidSize,
      o.orderBidPrice,
      o.orderAskSize,
      o.orderAskPrice,
      o.orderBasketId,
      o.orderCumQty,
      o.orderLeavesQty,
      o.orderStopPrice,
      o.orderDiscretionPrice,
      o.orderExdestinationInstruction,
      o.orderExecutionParameter,
      o.orderInfobarrierId,
      o.orderLegRatio,
      o.orderLocateId,
      o.orderNegotiatedIndicator,
      o.orderOpenClose,
      o.orderParticipantPriorityCode,
      o.orderActionInitiated,
      o.orderPackageIndicator,
      o.orderPackageId,
      o.orderPackagePricetype,
      o.orderStrategyType,
      o.orderSecondaryOffering,
      o.orderStartTime,
      o.orderTifExpiration,
      o.orderParentChildType,
      o.orderMinimumQty,
      o.orderTradingSession,
      o.orderDisplayPrice,
      o.orderSeqNumber,
      o.atsDisplayIndicator,
      o.orderDisplayQty,
      o.orderWorkingPrice,
      o.atsOrderType,
      o.orderNbboSource,
      o.orderNbboTimestamp,
      o.orderSolicitationFlag,
      o.orderNetPrice,
      o.routeRejectedFlag,
      o.orderOriginationSystem,
      o.orderTradeDate,
      o.createdAt as order_createdAt,
      o.updatedAt
    FROM (
      SELECT ve.* FROM validation_errors ve
      LEFT JOIN batches b ON ve.batchId = b.id
      LEFT JOIN users u ON b.userId = u.id
      ${whereSQL}
      ORDER BY ${orderByField} ${sortOrder.toUpperCase()}
      LIMIT ${limit} OFFSET ${skip}
    ) ve
    LEFT JOIN batches b ON ve.batchId = b.id
    LEFT JOIN orders o ON ve.orderId = o.id
  `);

  console.log('[Quality Issues] Found', validationErrors.length, 'validation errors on page', page);
  
  // Transform validation errors into quality issues format - optimized categorization
  const issues = validationErrors.map(error => {
    // Categorize errors based on code (faster than checking message)
    let category = 'context'; // default category
    
    const code = error.code?.toLowerCase() || '';
    
    if (code.includes('dup')) {
      category = 'duplicate';
    } else if (code.includes('fmt') || code.includes('syntax') || code.includes('invalid')) {
      category = 'syntax';
    }

    return {
      id: error.id,
      validationCode: error.validationCode,
      category: category,
      message: error.message,
      batchId: error.batchId,
      fileName: error.fileName || 'Unknown',
      fieldName: error.field || 'Unknown',
      createdAt: error.createdAt,
      orderId: error.orderId,
      batchTradeDate: error.tradeDate,
      orderDetails: error.order_id ? {
        id: error.order_id,
        orderId: error.order_orderId,
        uniqueID: error.uniqueID,
        id_deduped: error.id_deduped,
        is_validated: error.is_validated,
        orderIdVersion: error.orderIdVersion,
        orderIdSession: error.orderIdSession,
        orderIdInstance: error.orderIdInstance,
        parentOrderId: error.parentOrderId,
        cancelreplaceOrderId: error.cancelreplaceOrderId,
        linkedOrderId: error.linkedOrderId,
        orderAction: error.orderAction,
        orderStatus: error.orderStatus,
        orderCapacity: error.orderCapacity,
        orderDestination: error.orderDestination,
        orderClientRef: error.orderClientRef,
        orderClientRefDetails: error.orderClientRefDetails,
        orderExecutingEntity: error.orderExecutingEntity,
        orderBookingEntity: error.orderBookingEntity,
        orderPositionAccount: error.orderPositionAccount,
        orderSide: error.orderSide,
        orderClientCapacity: error.orderClientCapacity,
        orderManualIndicator: error.orderManualIndicator,
        orderRequestTime: error.orderRequestTime,
        orderEventTime: error.orderEventTime,
        orderManualTimestamp: error.orderManualTimestamp,
        orderOmsSource: error.orderOmsSource,
        orderPublishingTime: error.orderPublishingTime,
        orderQuantity: error.orderQuantity,
        orderPrice: error.orderPrice,
        orderType: error.orderType,
        orderTimeInforce: error.orderTimeInforce,
        orderExecutionInstructions: error.orderExecutionInstructions,
        orderAttributes: error.orderAttributes,
        orderRestrictions: error.orderRestrictions,
        orderAuctionIndicator: error.orderAuctionIndicator,
        orderSwapIndicator: error.orderSwapIndicator,
        orderOsi: error.orderOsi,
        orderInstrumentId: error.orderInstrumentId,
        orderLinkedInstrumentId: error.orderLinkedInstrumentId,
        orderCurrencyId: error.orderCurrencyId,
        orderFlowType: error.orderFlowType,
        orderAlgoInstruction: error.orderAlgoInstruction,
        orderSymbol: error.orderSymbol,
        orderInstrumentReference: error.orderInstrumentReference,
        orderInstrumentReferenceValue: error.orderInstrumentReferenceValue,
        orderOptionPutCall: error.orderOptionPutCall,
        orderOptionStrikePrice: error.orderOptionStrikePrice,
        orderOptionLegIndicator: error.orderOptionLegIndicator,
        orderComplianceId: error.orderComplianceId,
        orderEntityId: error.orderEntityId,
        orderExecutingAccount: error.orderExecutingAccount,
        orderClearingAccount: error.orderClearingAccount,
        orderClientOrderId: error.orderClientOrderId,
        orderRoutedOrderId: error.orderRoutedOrderId,
        orderTradingOwner: error.orderTradingOwner,
        orderExtendedAttribute: error.orderExtendedAttribute,
        orderQuoteId: error.orderQuoteId,
        orderRepresentOrderId: error.orderRepresentOrderId,
        orderOnBehalfCompId: error.orderOnBehalfCompId,
        orderSpread: error.orderSpread,
        orderAmendReason: error.orderAmendReason,
        orderCancelRejectReason: error.orderCancelRejectReason,
        orderBidSize: error.orderBidSize,
        orderBidPrice: error.orderBidPrice,
        orderAskSize: error.orderAskSize,
        orderAskPrice: error.orderAskPrice,
        orderBasketId: error.orderBasketId,
        orderCumQty: error.orderCumQty,
        orderLeavesQty: error.orderLeavesQty,
        orderStopPrice: error.orderStopPrice,
        orderDiscretionPrice: error.orderDiscretionPrice,
        orderExdestinationInstruction: error.orderExdestinationInstruction,
        orderExecutionParameter: error.orderExecutionParameter,
        orderInfobarrierId: error.orderInfobarrierId,
        orderLegRatio: error.orderLegRatio,
        orderLocateId: error.orderLocateId,
        orderNegotiatedIndicator: error.orderNegotiatedIndicator,
        orderOpenClose: error.orderOpenClose,
        orderParticipantPriorityCode: error.orderParticipantPriorityCode,
        orderActionInitiated: error.orderActionInitiated,
        orderPackageIndicator: error.orderPackageIndicator,
        orderPackageId: error.orderPackageId,
        orderPackagePricetype: error.orderPackagePricetype,
        orderStrategyType: error.orderStrategyType,
        orderSecondaryOffering: error.orderSecondaryOffering,
        orderStartTime: error.orderStartTime,
        orderTifExpiration: error.orderTifExpiration,
        orderParentChildType: error.orderParentChildType,
        orderMinimumQty: error.orderMinimumQty,
        orderTradingSession: error.orderTradingSession,
        orderDisplayPrice: error.orderDisplayPrice,
        orderSeqNumber: error.orderSeqNumber,
        atsDisplayIndicator: error.atsDisplayIndicator,
        orderDisplayQty: error.orderDisplayQty,
        orderWorkingPrice: error.orderWorkingPrice,
        atsOrderType: error.atsOrderType,
        orderNbboSource: error.orderNbboSource,
        orderNbboTimestamp: error.orderNbboTimestamp,
        orderSolicitationFlag: error.orderSolicitationFlag,
        orderNetPrice: error.orderNetPrice,
        routeRejectedFlag: error.routeRejectedFlag,
        orderOriginationSystem: error.orderOriginationSystem,
        orderTradeDate: error.orderTradeDate,
        createdAt: error.order_createdAt,
        updatedAt: error.updatedAt
      } : null
    };
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  res.json({ 
    issues,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: totalPages
    },
    categoryTotals
  });
});
