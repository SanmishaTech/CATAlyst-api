const prisma = require("../config/db");

// Get rejected orders for a batch with optional date filtering
const getRejectedOrders = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 50, fromDate, toDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    

    // Build where clause based on user role
    const where = {
      batchId: parseInt(batchId),
    };

    // Role-based filtering
    if (userRole !== 'admin') {
      // Non-admin users can only see their own rejected orders
      where.userId = userId;
    }

    // Add date range filtering if provided
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        where.createdAt.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [rejectedOrders, total] = await Promise.all([
      prisma.rejectedOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          batch: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.rejectedOrder.count({ where }),
    ]);

    res.json({
      rejectedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get rejected executions for a batch with optional date filtering
const getRejectedExecutions = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 50, fromDate, toDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause based on user role
    const where = {
      batchId: parseInt(batchId),
    };

    // Role-based filtering
    if (userRole !== 'admin') {
      // Non-admin users can only see their own rejected executions
      where.userId = userId;
    }

    // Add date range filtering if provided
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        where.createdAt.gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    // Try to fetch rejected executions (may fail if table doesn't exist)
    try {
      const [rejectedExecutions, total] = await Promise.all([
        prisma.rejectedExecution.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            batch: {
              select: {
                id: true,
                fileName: true,
                fileType: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.rejectedExecution.count({ where }),
      ]);

      res.json({
        rejectedExecutions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (tableError) {
      // Table doesn't exist yet, return empty result
      console.warn('[REJECTED EXECUTIONS] Table does not exist yet:', tableError.message);
      res.json({
        rejectedExecutions: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get rejected orders + executions by date range (no batch filter)
const getRejectedRecordsByDateRange = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 50, fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'fromDate and toDate query parameters are required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Date range filter
    const createdFilter = {
      gte: new Date(new Date(fromDate).setHours(0, 0, 0, 0)),
      lte: new Date(new Date(toDate).setHours(23, 59, 59, 999))
    };

    const commonWhere = (extra) => ({
      ...extra,
      createdAt: createdFilter,
      ...(userRole !== 'admin' ? { userId } : {})
    });

    // Fetch enough from each side to support combined pagination, then compose a page
    const fetchCount = take + skip;
    const [ordersData, executionsData] = await Promise.all([
      prisma.$transaction([
        prisma.rejectedOrder.findMany({
          where: commonWhere({}),
          orderBy: { createdAt: 'desc' },
          take: fetchCount,
          include: {
            batch: {
              select: { id: true, fileName: true, fileType: true, createdAt: true }
            }
          }
        }),
        prisma.rejectedOrder.count({ where: commonWhere({}) })
      ]),
      prisma.$transaction([
        prisma.rejectedExecution.findMany({
          where: commonWhere({}),
          orderBy: { createdAt: 'desc' },
          take: fetchCount,
          include: {
            batch: {
              select: { id: true, fileName: true, fileType: true, createdAt: true }
            }
          }
        }),
        prisma.rejectedExecution.count({ where: commonWhere({}) })
      ])
    ]);

    const [rawOrders, totalOrders] = ordersData;
    const [rawExecutions, totalExecutions] = executionsData;

    const total = totalOrders + totalExecutions;
    const pages = Math.ceil(total / take);

    // Merge, sort, and slice to build a single combined page; then split back
    const combined = [
      ...rawOrders.map((o) => ({ type: 'order', createdAt: o.createdAt, item: o })),
      ...rawExecutions.map((e) => ({ type: 'execution', createdAt: e.createdAt, item: e })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pageSlice = combined.slice(skip, skip + take);
    const rejectedOrders = pageSlice.filter((x) => x.type === 'order').map((x) => x.item);
    const rejectedExecutions = pageSlice.filter((x) => x.type === 'execution').map((x) => x.item);

    // Upload type breakdown for summary cards
    const [ordersExcelCount, ordersJsonCount, execExcelCount, execJsonCount] = await Promise.all([
      prisma.rejectedOrder.count({ where: { ...commonWhere({}), uploadType: 'excel' } }),
      prisma.rejectedOrder.count({ where: { ...commonWhere({}), uploadType: 'json' } }),
      prisma.rejectedExecution.count({ where: { ...commonWhere({}), uploadType: 'excel' } }).catch(() => 0),
      prisma.rejectedExecution.count({ where: { ...commonWhere({}), uploadType: 'json' } }).catch(() => 0),
    ]);
    const fromExcel = ordersExcelCount + execExcelCount;
    const fromJson = ordersJsonCount + execJsonCount;

    res.json({
      rejectedOrders,
      rejectedExecutions,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages
      },
      stats: {
        total,
        fromExcel,
        fromJson,
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get counts for last 7 days
const getRejectedStatsLastWeek = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const baseWhere = {
      createdAt: { gte: from, lte: to },
      ...(userRole !== 'admin' ? { userId } : {})
    };

    const [ordersExcel, ordersJson, executionsExcel, executionsJson] = await Promise.all([
      prisma.rejectedOrder.count({ where: { ...baseWhere, uploadType: 'excel' } }),
      prisma.rejectedOrder.count({ where: { ...baseWhere, uploadType: 'json' } }),
      prisma.rejectedExecution.count({ where: { ...baseWhere, uploadType: 'excel' } }).catch(() => 0),
      prisma.rejectedExecution.count({ where: { ...baseWhere, uploadType: 'json' } }).catch(() => 0),
    ]);

    const fromExcel = ordersExcel + executionsExcel;
    const fromJson = ordersJson + executionsJson;
    const total = fromExcel + fromJson;

    res.json({ total, fromExcel, fromJson, period: { fromDate: from.toISOString().slice(0,10), toDate: to.toISOString().slice(0,10) } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRejectedOrders,
  getRejectedExecutions,
  getRejectedRecordsByDateRange,
  getRejectedStatsLastWeek,
};
