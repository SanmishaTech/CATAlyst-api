const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('../middleware/asyncHandler');

const prisma = new PrismaClient();

/**
 * @desc    Get all data quality issues (validation errors) with pagination
 * @route   GET /api/quality/issues?page=1&limit=10
 * @access  Private
 */
exports.getQualityIssues = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  console.log('[Quality Issues] Fetching issues for user:', userId, 'role:', userRole, 'page:', page, 'limit:', limit);

  // Build query based on user role
  let whereClause = {};
  
  // If not admin, filter by user's clientId
  if (userRole !== 'admin') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clientId: true }
    });

    if (user && user.clientId) {
      // Get all users from the same client
      const clientUsers = await prisma.user.findMany({
        where: { clientId: user.clientId },
        select: { id: true }
      });
      
      const clientUserIds = clientUsers.map(u => u.id);
      
      // Filter batches by client users
      whereClause.batch = {
        userId: { in: clientUserIds }
      };
    } else {
      // If user has no clientId, only show their own data
      whereClause.batch = {
        userId: userId
      };
    }
  }

  // Get total count for pagination
  const totalCount = await prisma.validationError.count({
    where: whereClause
  });

  // Fetch validation errors with batch and order information (paginated)
  const validationErrors = await prisma.validationError.findMany({
    where: whereClause,
    include: {
      batch: {
        select: {
          id: true,
          fileName: true,
          createdAt: true
        }
      },
      order: {
        select: {
          orderId: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: skip,
    take: limit
  });

  console.log('[Quality Issues] Found', validationErrors.length, 'validation errors on page', page);
  
  // Transform validation errors into quality issues format
  const issues = validationErrors.map(error => {
    // Categorize errors based on code or message
    let category = 'context'; // default category
    
    const code = error.code?.toLowerCase() || '';
    const message = error.message?.toLowerCase() || '';
    
    if (code.includes('duplicate') || message.includes('duplicate')) {
      category = 'duplicate';
    } else if (code.includes('syntax') || code.includes('format') || code.includes('invalid') || 
               message.includes('syntax') || message.includes('format') || message.includes('invalid')) {
      category = 'syntax';
    }

    return {
      id: error.id,
      validationCode: error.validationCode,
      category: category,
      message: error.message,
      batchId: error.batchId,
      fileName: error.batch.fileName || 'Unknown',
      createdAt: error.createdAt
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
    }
  });
});
