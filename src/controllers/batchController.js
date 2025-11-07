const prisma = require("../config/db");
const createError = require("http-errors");

// Get all batches for the authenticated user
const getBatches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };

    if (status) {
      where.status = status;
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.batch.count({ where }),
    ]);

    // Calculate success rate for each batch
    const batchesWithStats = batches.map((batch) => ({
      ...batch,
      actualOrderCount: batch._count.orders,
      successRate:
        batch.totalOrders > 0
          ? ((batch.successfulOrders / batch.totalOrders) * 100).toFixed(2)
          : 0,
      duration: batch.completedAt
        ? Math.round(
            (new Date(batch.completedAt) - new Date(batch.importedAt)) / 1000
          )
        : null,
    }));

    res.json({
      batches: batchesWithStats,
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

// Get single batch by ID
const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const batch = await prisma.batch.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!batch) {
      return next(createError(404, "Batch not found"));
    }

    // Parse error log if exists
    let errorLog = null;
    if (batch.errorLog) {
      try {
        errorLog = JSON.parse(batch.errorLog);
      } catch (e) {
        errorLog = batch.errorLog;
      }
    }

    // Calculate statistics
    const stats = {
      ...batch,
      actualOrderCount: batch._count.orders,
      successRate:
        batch.totalOrders > 0
          ? ((batch.successfulOrders / batch.totalOrders) * 100).toFixed(2)
          : 0,
      duration: batch.completedAt
        ? Math.round(
            (new Date(batch.completedAt) - new Date(batch.importedAt)) / 1000
          )
        : null,
      errorLog,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Get orders from a specific batch
const getBatchOrders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // First verify batch belongs to user
    const batch = await prisma.batch.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!batch) {
      return next(createError(404, "Batch not found"));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          batchId: parseInt(id),
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          validations: true,
        },
      }),
      prisma.order.count({
        where: {
          batchId: parseInt(id),
        },
      }),
    ]);

    res.json({
      batchId: batch.id,
      orders,
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

// Delete batch and all its orders
const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First verify batch belongs to user
    const batch = await prisma.batch.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!batch) {
      return next(createError(404, "Batch not found"));
    }

    // Delete batch (orders will be cascade deleted)
    await prisma.batch.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      message: "Batch and all associated orders deleted successfully",
      deletedBatch: {
        id: batch.id,
        ordersDeleted: batch._count.orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get batch statistics summary
const getBatchStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      totalBatches,
      completedBatches,
      failedBatches,
      processingBatches,
      totalOrdersImported,
      recentBatches,
    ] = await Promise.all([
      prisma.batch.count({ where: { userId } }),
      prisma.batch.count({ where: { userId, status: "completed" } }),
      prisma.batch.count({ where: { userId, status: "failed" } }),
      prisma.batch.count({ where: { userId, status: "processing" } }),
      prisma.batch.aggregate({
        where: { userId, status: "completed" },
        _sum: { successfulOrders: true },
      }),
      prisma.batch.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalOrders: true,
          successfulOrders: true,
          failedOrders: true,
          importedAt: true,
        },
      }),
    ]);

    // Calculate average success rate
    const completedBatchesData = await prisma.batch.findMany({
      where: { userId, status: "completed", totalOrders: { gt: 0 } },
      select: {
        successfulOrders: true,
        totalOrders: true,
      },
    });

    const averageSuccessRate =
      completedBatchesData.length > 0
        ? (
            completedBatchesData.reduce(
              (acc, batch) =>
                acc + (batch.successfulOrders / batch.totalOrders) * 100,
              0
            ) / completedBatchesData.length
          ).toFixed(2)
        : 0;

    res.json({
      totalBatches,
      completedBatches,
      failedBatches,
      processingBatches,
      totalOrdersImported: totalOrdersImported._sum.successfulOrders || 0,
      averageSuccessRate: parseFloat(averageSuccessRate),
      recentBatches: recentBatches.map((batch) => ({
        ...batch,
        successRate:
          batch.totalOrders > 0
            ? ((batch.successfulOrders / batch.totalOrders) * 100).toFixed(2)
            : 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatches,
  getBatchById,
  getBatchOrders,
  deleteBatch,
  getBatchStats,
};
