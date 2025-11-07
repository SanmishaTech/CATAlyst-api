const express = require("express");
const router = express.Router();
const batchController = require("../controllers/batchController");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Batches
 *   description: Batch upload management and tracking
 */

/**
 * @swagger
 * /batches:
 *   get:
 *     summary: Get all batches for authenticated user
 *     tags: [Batches]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [processing, completed, failed]
 *         description: Filter by batch status
 *     responses:
 *       200:
 *         description: List of batches with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       fileName:
 *                         type: string
 *                       fileSize:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       totalOrders:
 *                         type: integer
 *                       successfulOrders:
 *                         type: integer
 *                       failedOrders:
 *                         type: integer
 *                       successRate:
 *                         type: string
 *                       duration:
 *                         type: integer
 *                         description: Duration in seconds
 *                       importedAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, batchController.getBatches);

/**
 * @swagger
 * /batches/stats:
 *   get:
 *     summary: Get batch statistics summary
 *     tags: [Batches]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Batch statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBatches:
 *                   type: integer
 *                 completedBatches:
 *                   type: integer
 *                 failedBatches:
 *                   type: integer
 *                 processingBatches:
 *                   type: integer
 *                 totalOrdersImported:
 *                   type: integer
 *                 averageSuccessRate:
 *                   type: number
 *                 recentBatches:
 *                   type: array
 *       401:
 *         description: Unauthorized
 */
router.get("/stats", auth, batchController.getBatchStats);

/**
 * @swagger
 * /batches/{id}:
 *   get:
 *     summary: Get batch details by ID
 *     tags: [Batches]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch details with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 fileName:
 *                   type: string
 *                 fileSize:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 totalOrders:
 *                   type: integer
 *                 successfulOrders:
 *                   type: integer
 *                 failedOrders:
 *                   type: integer
 *                 successRate:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                 errorLog:
 *                   type: object
 *                 user:
 *                   type: object
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", auth, batchController.getBatchById);

/**
 * @swagger
 * /batches/{id}/orders:
 *   get:
 *     summary: Get orders from a specific batch
 *     tags: [Batches]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Batch ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of orders from the batch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batchId:
 *                   type: integer
 *                 fileName:
 *                   type: string
 *                 orders:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id/orders", auth, batchController.getBatchOrders);

/**
 * @swagger
 * /batches/{id}:
 *   delete:
 *     summary: Delete batch and all its orders
 *     tags: [Batches]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedBatch:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     fileName:
 *                       type: string
 *                     ordersDeleted:
 *                       type: integer
 *       404:
 *         description: Batch not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", auth, batchController.deleteBatch);

module.exports = router;
