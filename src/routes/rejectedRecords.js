const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const rejectedRecordsController = require("../controllers/rejectedRecordsController");

/**
 * @swagger
 * tags:
 *   - name: Rejected Records
 *     description: API endpoints for managing rejected orders and executions
 */

/**
 * @swagger
 * /rejected-records/orders/{batchId}:
 *   get:
 *     summary: Get rejected orders for a batch
 *     tags: [Rejected Records]
 *     description: |
 *       Retrieve all rejected orders for a specific batch.
 *       Shows row numbers (Excel) or JSON indexes with validation errors.
 *       Supports optional date range filtering.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Batch ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of rejected orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rejectedOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       batchId:
 *                         type: integer
 *                       rowNumber:
 *                         type: integer
 *                         description: Excel row number (if Excel upload)
 *                       jsonIndex:
 *                         type: integer
 *                         description: JSON array index (if JSON upload)
 *                       orderId:
 *                         type: string
 *                       rawData:
 *                         type: object
 *                         description: Raw order data that failed
 *                       validationErrors:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Array of validation error messages
 *                       uploadType:
 *                         type: string
 *                         enum: [excel, json]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       batch:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           fileName:
 *                             type: string
 *                           fileType:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
// Date range filter - returns orders + executions across batches
router.get("/stats/last-week", auth, rejectedRecordsController.getRejectedStatsLastWeek);

// Date range filter - returns orders + executions across batches
router.get("/", auth, rejectedRecordsController.getRejectedRecordsByDateRange);

router.get("/orders/:batchId", auth, rejectedRecordsController.getRejectedOrders);

/**
 * @swagger
 * /rejected-records/executions/{batchId}:
 *   get:
 *     summary: Get rejected executions for a batch
 *     tags: [Rejected Records]
 *     description: |
 *       Retrieve all rejected executions for a specific batch.
 *       Shows row numbers (Excel) or JSON indexes with validation errors.
 *       Supports optional date range filtering.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Batch ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of rejected executions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rejectedExecutions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       batchId:
 *                         type: integer
 *                       rowNumber:
 *                         type: integer
 *                         description: Excel row number (if Excel upload)
 *                       jsonIndex:
 *                         type: integer
 *                         description: JSON array index (if JSON upload)
 *                       executionId:
 *                         type: string
 *                       rawData:
 *                         type: object
 *                         description: Raw execution data that failed
 *                       validationErrors:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Array of validation error messages
 *                       uploadType:
 *                         type: string
 *                         enum: [excel, json]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       batch:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           fileName:
 *                             type: string
 *                           fileType:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/executions/:batchId", auth, rejectedRecordsController.getRejectedExecutions);

module.exports = router;
