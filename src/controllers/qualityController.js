const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('../middleware/asyncHandler');

const prisma = new PrismaClient();

/**
 * @desc    Get all data quality issues (validation errors)
 * @route   GET /api/quality/issues
 * @access  Private
 */
exports.getQualityIssues = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  
  console.log('[Quality Issues] Fetching issues for user:', userId, 'role:', userRole);

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

  // Fetch validation errors with batch and order information
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
    }
  });

  console.log('[Quality Issues] Found', validationErrors.length, 'validation errors');
  
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
      category: category,
      message: error.message,
      batchId: error.batchId,
      fileName: error.batch.fileName || 'Unknown',
      createdAt: error.createdAt
    };
  });

  res.json({ issues });
});
