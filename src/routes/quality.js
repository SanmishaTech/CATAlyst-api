const express = require('express');
const router = express.Router();
const qualityController = require('../controllers/qualityController');
const authMiddleware = require('../middleware/auth');

/**
 * @route   GET /api/quality/issues
 * @desc    Get all data quality issues
 * @access  Private (requires authentication)
 */
router.get(
  '/issues',
  authMiddleware,
  qualityController.getQualityIssues
);

module.exports = router;
