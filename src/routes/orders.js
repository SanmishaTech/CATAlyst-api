const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/auth");
const orderController = require("../controllers/orderController");
const templateController = require("../controllers/templateController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "orders-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) and CSV files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /orders/template:
 *   get:
 *     summary: 📥 Download Excel Template (Start Here!)
 *     tags: [Orders]
 *     description: |
 *       Download the Excel template with all required headers and sample data.
 *       
 *       **Template includes:**
 *       - All 55+ order fields with proper headers
 *       - Sample row with example data
 *       - Instructions sheet with formatting guidelines
 *       - Date format examples
 *       
 *       **Usage:**
 *       1. Click "Execute" to download template
 *       2. Fill in your order data
 *       3. Upload using POST /orders/upload
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Excel template file (order_import_template.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 */
router.get("/template", auth, templateController.downloadOrderTemplate);

/**
 * @swagger
 * /orders/upload:
 *   post:
 *     summary: 📤 Upload Orders from Excel
 *     tags: [Orders]
 *     description: |
 *       Upload an Excel file to bulk import orders into the system.
 *       
 *       **⚠️ Important:** Download the template first using GET /orders/template
 *       
 *       **File Requirements:**
 *       - Format: .xlsx, .xls, or .csv
 *       - Max size: 10MB
 *       - Must contain 'orderId' column (required)
 *       - Use template format for best results
 *       
 *       **Response includes:**
 *       - batchId: Track this import
 *       - imported: Number of successful orders
 *       - skipped: Duplicate orders skipped
 *       - errors: Any parsing errors
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing order data (use template format)
 *     responses:
 *       201:
 *         description: Orders uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 batchId:
 *                   type: integer
 *                   description: ID of the created batch
 *                 fileName:
 *                   type: string
 *                   description: Name of the uploaded file
 *                 imported:
 *                   type: integer
 *                   description: Number of orders successfully imported
 *                 total:
 *                   type: integer
 *                   description: Total orders in file
 *                 skipped:
 *                   type: integer
 *                   description: Number of duplicate orders skipped
 *                 errors:
 *                   type: array
 *                   description: List of parsing errors if any
 *       400:
 *         description: Bad request (invalid file or data)
 *       401:
 *         description: Unauthorized
 */
router.post("/upload", auth, upload.single("file"), orderController.uploadOrders);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders for authenticated user
 *     tags: [Orders]
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
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by order ID (partial match)
 *       - in: query
 *         name: orderStatus
 *         schema:
 *           type: string
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
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
router.get("/", auth, orderController.getOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", auth, orderController.getOrderById);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", auth, orderController.deleteOrder);

module.exports = router;
