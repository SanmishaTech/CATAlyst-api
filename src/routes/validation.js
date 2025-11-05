const express = require('express');
const validationController = require('../controllers/validationController');

const router = express.Router();

/**
 * @swagger
 * /validation/required-fields:
 *   get:
 *     summary: Get list of required fields
 *     tags: [Validation]
 *     responses:
 *       200:
 *         description: List of 9 required fields
 */
router.get('/required-fields', validationController.getRequiredFields);

/**
 * @swagger
 * /validation/validate-order:
 *   post:
 *     summary: Validate a single order
 *     tags: [Validation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate-order', validationController.validateSingleOrder);

/**
 * @swagger
 * /validation/validate-batch:
 *   post:
 *     summary: Validate multiple orders
 *     tags: [Validation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Batch validation result
 */
router.post('/validate-batch', validationController.validateBatch);

module.exports = router;
