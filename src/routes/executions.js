const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const executionController = require("../controllers/executionController");
const executionTemplateController = require("../controllers/executionTemplateController");

// Configure multer for file uploads
const uploadDir = path.resolve(__dirname, "..", "uploads");
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  console.error("Failed to ensure uploads directory:", e);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "executions-" + uniqueSuffix + path.extname(file.originalname));
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
 *   name: Executions
 *   description: Execution management endpoints
 */

/**
 * @swagger
 * /executions/template:
 *   get:
 *     summary: 📥 Download Execution Excel Template
 *     tags: [Executions]
 *     description: |
 *       Download the Excel template with all required headers and sample data.
 *       
 *       **Template includes:**
 *       - All 72 execution fields with proper headers
 *       - 5 sample rows with valid test data
 *       - Instructions sheet with formatting guidelines
 *       
 *       **Usage:**
 *       1. Click "Execute" to download template
 *       2. Fill in your execution data
 *       3. Upload using POST /executions/upload
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Excel template file (execution_import_template.xlsx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 */
router.get("/template", auth, executionTemplateController.downloadExecutionTemplate);

/**
 * @swagger
 * /executions/upload:
 *   post:
 *     summary: Upload Executions (Excel or JSON)
 *     tags: [Executions]
 *     description: |
 *       Upload executions to the system using either Excel file or JSON format.
 *       Download template first using GET /executions/template
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
 *                 description: Excel file containing execution data
 *     responses:
 *       201:
 *         description: Executions uploaded successfully
 *       400:
 *         description: Bad request (invalid file or data)
 *       401:
 *         description: Unauthorized
 */
router.post("/upload", auth, upload.single("file"), executionController.uploadExecutions);


router.post(
  "/ai-filter-url",
  auth,
  executionController.generateExecutionsAiFilterUrl
);


/**
 * @swagger
 * /executions:
 *   get:
 *     summary: Get all executions
 *     tags: [Executions]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: integer
 *         description: Filter by batch ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of executions to return
 *     responses:
 *       200:
 *         description: List of executions
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, executionController.getExecutions);

// TODO: Add more execution-specific routes here
// Example routes that will be implemented:
// - POST /executions/upload - Upload executions via Excel or JSON
// - GET /executions/:id - Get execution by ID
// - PUT /executions/:id - Update execution
// - DELETE /executions/:id - Delete execution

module.exports = router;
