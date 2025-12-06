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

  // Fetch validation errors with batch and order information (paginated)
  // Optimized: Only fetch necessary fields and use select instead of include for better performance
  const validationErrors = await prisma.validationError.findMany({
    where: whereClause,
    select: {
      id: true,
      validationCode: true,
      code: true,
      message: true,
      field: true,
      batchId: true,
      orderId: true,
      createdAt: true,
      batch: {
        select: {
          id: true,
          fileName: true,
          createdAt: true,
          tradeDate: true
        }
      },
      order: {
        select: {
          id: true,
          orderId: true,
          orderIdVersion: true,
          orderIdSession: true,
          orderIdInstance: true,
          parentOrderId: true,
          cancelreplaceOrderId: true,
          linkedOrderId: true,
          orderAction: true,
          orderStatus: true,
          orderCapacity: true,
          orderDestination: true,
          orderClientRef: true,
          orderClientRefDetails: true,
          orderExecutingEntity: true,
          orderBookingEntity: true,
          orderPositionAccount: true,
          orderSide: true,
          orderClientCapacity: true,
          orderManualIndicator: true,
          orderRequestTime: true,
          orderEventTime: true,
          orderManualTimestamp: true,
          orderOmsSource: true,
          orderPublishingTime: true,
          orderQuantity: true,
          orderPrice: true,
          orderType: true,
          orderTimeInforce: true,
          orderExecutionInstructions: true,
          orderAttributes: true,
          orderRestrictions: true,
          orderAuctionIndicator: true,
          orderSwapIndicator: true,
          orderOsi: true,
          orderInstrumentId: true,
          orderLinkedInstrumentId: true,
          orderCurrencyId: true,
          orderFlowType: true,
          orderAlgoInstruction: true,
          orderSymbol: true,
          orderInstrumentReference: true,
          orderInstrumentReferenceValue: true,
          orderOptionPutCall: true,
          orderOptionStrikePrice: true,
          orderOptionLegIndicator: true,
          orderComplianceId: true,
          orderEntityId: true,
          orderExecutingAccount: true,
          orderClearingAccount: true,
          orderClientOrderId: true,
          orderRoutedOrderId: true,
          orderTradingOwner: true,
          orderExtendedAttribute: true,
          orderQuoteId: true,
          orderRepresentOrderId: true,
          orderOnBehalfCompId: true,
          orderSpread: true,
          orderAmendReason: true,
          orderCancelRejectReason: true,
          orderBidSize: true,
          orderBidPrice: true,
          orderAskSize: true,
          orderAskPrice: true,
          orderBasketId: true,
          orderCumQty: true,
          orderLeavesQty: true,
          orderStopPrice: true,
          orderDiscretionPrice: true,
          orderExdestinationInstruction: true,
          orderExecutionParameter: true,
          orderInfobarrierId: true,
          orderLegRatio: true,
          orderLocateId: true,
          orderNegotiatedIndicator: true,
          orderOpenClose: true,
          orderParticipantPriorityCode: true,
          orderActionInitiated: true,
          orderPackageIndicator: true,
          orderPackageId: true,
          orderPackagePricetype: true,
          orderStrategyType: true,
          orderSecondaryOffering: true,
          orderStartTime: true,
          orderTifExpiration: true,
          orderParentChildType: true,
          orderMinimumQty: true,
          orderTradingSession: true,
          orderDisplayPrice: true,
          orderSeqNumber: true,
          atsDisplayIndicator: true,
          orderDisplayQty: true,
          orderWorkingPrice: true,
          atsOrderType: true,
          orderNbboSource: true,
          orderNbboTimestamp: true,
          orderSolicitationFlag: true,
          orderNetPrice: true,
          routeRejectedFlag: true,
          orderOriginationSystem: true,
          orderTradeDate: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: orderByClause,
    skip: skip,
    take: limit
  });

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
      fileName: error.batch.fileName || 'Unknown',
      fieldName: error.field || 'Unknown',
      createdAt: error.createdAt,
      orderId: error.orderId,
      batchTradeDate: error.batch.tradeDate,
      orderDetails: error.order ? {
        id: error.order.id,
        orderId: error.order.orderId,
        orderIdVersion: error.order.orderIdVersion,
        orderSide: error.order.orderSide,
        orderQuantity: error.order.orderQuantity,
        orderPrice: error.order.orderPrice,
        orderSymbol: error.order.orderSymbol,
        orderStatus: error.order.orderStatus,
        orderComplianceId: error.order.orderComplianceId,
        orderTradeDate: error.order.orderTradeDate
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
