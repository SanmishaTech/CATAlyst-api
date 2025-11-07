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
 *     summary: 📤 Upload Orders (Excel or JSON)
 *     tags: [Orders]
 *     description: |
 *       Upload orders to the system using either Excel file or JSON format.
 *       
 *       **Two Upload Methods:**
 *       
 *       **1. Excel File Upload:**
 *       - Download template first using GET /orders/template
 *       - Format: .xlsx, .xls, or .csv
 *       - Max size: 10MB
 *       - Must contain 'orderId' column (required)
 *       - Use multipart/form-data with 'file' field
 *       
 *       **2. JSON Upload:**
 *       - Send JSON body with 'orders' array
 *       - Each object must contain 'orderId' (required)
 *       - All order fields are optional except orderId
 *       - Use application/json content-type
 *       
 *       **Duplicate Handling:**
 *       - Every row/object creates a new database row
 *       - Duplicate orderIds are allowed (tracked by batchId)
 *       - Same orderId can exist across multiple batches
 *       
 *       **Response includes:**
 *       - batchId: Track this import
 *       - imported: Number of orders successfully created
 *       - failed: Number of orders that failed
 *       - errors: Any parsing/validation errors
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *                 description: Array of order objects (orderId required)
 *                 items:
 *                   type: object
 *                   required:
 *                     - orderId
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       description: |
 *                         **REQUIRED** - Unique order identifier
 *                         
 *                         **Note:** This API accepts 101+ order fields. Below are key fields,
 *                         but you can include any of the following in your JSON:
 *                         orderIdVersion, orderIdSession, orderIdInstance, parentOrderId,
 *                         cancelreplaceOrderId, linkedOrderId, orderAction, orderStatus,
 *                         orderCapacity, orderDestination, orderClientRef, orderClientRefDetails,
 *                         orderExecutingEntity, orderBookingEntity, orderPositionAccount, orderSide,
 *                         orderClientCapacity, orderManualIndicator, orderRequestTime, orderEventTime,
 *                         orderManualTimestamp, orderOmsSource, orderPublishingTime, orderTradeDate,
 *                         orderQuantity, orderPrice, orderType, orderTimeInforce, orderExecutionInstructions,
 *                         orderAttributes, orderRestrictions, orderAuctionIndicator, orderSwapIndicator,
 *                         orderOsi, orderInstrumentId, orderLinkedInstrumentId, orderCurrencyId,
 *                         orderFlowType, orderAlgoInstruction, orderSymbol, orderInstrumentReference,
 *                         orderInstrumentReferenceValue, orderOptionPutCall, orderOptionStrikePrice,
 *                         orderOptionLegIndicator, orderComplianceId, orderEntityId, orderExecutingAccount,
 *                         orderClearingAccount, orderClientOrderId, orderRoutedOrderId, orderTradingOwner,
 *                         orderExtendedAttribute, orderQuoteId, orderRepresentOrderId, orderOnBehalfCompId,
 *                         orderSpread, orderAmendReason, orderCancelRejectReason, orderBidSize,
 *                         orderBidPrice, orderAskSize, orderAskPrice, orderBasketId, orderCumQty,
 *                         orderLeavesQty, orderStopPrice, orderDiscretionPrice, orderExdestinationInstruction,
 *                         orderExecutionParameter, orderInfobarrierId, orderLegRatio, orderLocateId,
 *                         orderNegotiatedIndicator, orderOpenClose, orderParticipantPriorityCode,
 *                         orderActionInitiated, orderPackageIndicator, orderPackageId, orderPackagePricetype,
 *                         orderStrategyType, orderSecondaryOffering, orderStartTime, orderTifExpiration,
 *                         orderParentChildType, orderMinimumQty, orderTradingSession, orderDisplayPrice,
 *                         orderSeqNumber, atsDisplayIndicator, orderDisplayQty, orderWorkingPrice,
 *                         atsOrderType, orderNbboSource, orderNbboTimestamp, orderSolicitationFlag,
 *                         orderNetPrice, routeRejectedFlag, orderOriginationSystem, and more.
 *                         
 *                         See docs/complete-order-json-example.json for full example with all fields.
 *                     orderSymbol:
 *                       type: string
 *                       description: Trading symbol (e.g., AAPL, GOOGL)
 *                     orderPrice:
 *                       type: number
 *                       description: Order price
 *                     orderQuantity:
 *                       type: number
 *                       description: Total order quantity
 *                     orderStatus:
 *                       type: string
 *                       description: Current status (e.g., PENDING, FILLED, CANCELLED)
 *                     orderType:
 *                       type: string
 *                       description: Order type (MARKET, LIMIT, STOP, etc.)
 *                     orderSide:
 *                       type: string
 *                       description: BUY or SELL
 *                     orderTimeInforce:
 *                       type: string
 *                       description: Time in force (DAY, GTC, IOC, FOK)
 *                     orderTradeDate:
 *                       type: string
 *                       description: Trade date (YYYY-MM-DD format)
 *                     orderRequestTime:
 *                       type: string
 *                       description: Time order was requested (ISO 8601 format)
 *           example:
 *             orders:
 *               - orderId: "ORD-001"
 *                 orderIdVersion: 1
 *                 orderIdSession: 1
 *                 orderIdInstance: "instance-001"
 *                 parentOrderId: "PARENT-001"
 *                 cancelreplaceOrderId: null
 *                 linkedOrderId: null
 *                 orderAction: "NEW"
 *                 orderStatus: "PENDING"
 *                 orderCapacity: 1
 *                 orderDestination: 1
 *                 orderClientRef: 1
 *                 orderClientRefDetails: 1
 *                 orderExecutingEntity: "ENTITY-001"
 *                 orderBookingEntity: "BOOKING-001"
 *                 orderPositionAccount: "ACC-001"
 *                 orderSide: "BUY"
 *                 orderClientCapacity: "PRINCIPAL"
 *                 orderManualIndicator: "N"
 *                 orderRequestTime: "2025-10-30T08:00:00Z"
 *                 orderEventTime: "2025-10-30T08:00:01Z"
 *                 orderManualTimestamp: null
 *                 orderOmsSource: "OMS-001"
 *                 orderPublishingTime: "2025-10-30T08:00:02Z"
 *                 orderTradeDate: "2025-10-30"
 *                 orderQuantity: 100
 *                 orderPrice: 150.50
 *                 orderType: "LIMIT"
 *                 orderTimeInforce: "DAY"
 *                 orderExecutionInstructions: "AON"
 *                 orderAttributes: "Attribute1"
 *                 orderRestrictions: "None"
 *                 orderAuctionIndicator: "N"
 *                 orderSwapIndicator: "N"
 *                 orderOsi: "OSI-001"
 *                 orderInstrumentId: "INST-123"
 *                 orderLinkedInstrumentId: null
 *                 orderCurrencyId: "USD"
 *                 orderFlowType: "AGGRESSIVE"
 *                 orderAlgoInstruction: "VWAP"
 *                 orderSymbol: "AAPL"
 *                 orderInstrumentReference: "ISIN"
 *                 orderInstrumentReferenceValue: "US0378331005"
 *                 orderOptionPutCall: "CALL"
 *                 orderOptionStrikePrice: 150.00
 *                 orderOptionLegIndicator: "N"
 *                 orderComplianceId: "COMP-001"
 *                 orderEntityId: "ENT-001"
 *                 orderExecutingAccount: "EXEC-ACC-001"
 *                 orderClearingAccount: "CLEAR-ACC-001"
 *                 orderClientOrderId: "CLI-ORD-001"
 *                 orderRoutedOrderId: "ROUTE-001"
 *                 orderTradingOwner: "TRADER-001"
 *                 orderExtendedAttribute: '{"key": "value"}'
 *                 orderQuoteId: "QUOTE-001"
 *                 orderRepresentOrderId: "REP-001"
 *                 orderOnBehalfCompId: "COMP-123"
 *                 orderSpread: "0.05"
 *                 orderAmendReason: "Price adjustment"
 *                 orderCancelRejectReason: null
 *                 orderBidSize: 500
 *                 orderBidPrice: 150.45
 *                 orderAskSize: 500
 *                 orderAskPrice: 150.55
 *                 orderBasketId: "BASKET-001"
 *                 orderCumQty: 0
 *                 orderLeavesQty: 100
 *                 orderStopPrice: 149.00
 *                 orderDiscretionPrice: 150.60
 *                 orderExdestinationInstruction: "ROUTE TO NYSE"
 *                 orderExecutionParameter: "VWAP"
 *                 orderInfobarrierId: "BARRIER-001"
 *                 orderLegRatio: "1:1"
 *                 orderLocateId: "LOCATE-001"
 *                 orderNegotiatedIndicator: "N"
 *                 orderOpenClose: "OPEN"
 *                 orderParticipantPriorityCode: "P1"
 *                 orderActionInitiated: "CLIENT"
 *                 orderPackageIndicator: "N"
 *                 orderPackageId: null
 *                 orderPackagePricetype: null
 *                 orderStrategyType: "ALGO"
 *                 orderSecondaryOffering: "N"
 *                 orderStartTime: "2025-10-30T09:30:00Z"
 *                 orderTifExpiration: "2025-10-30T16:00:00Z"
 *                 orderParentChildType: "PARENT"
 *                 orderMinimumQty: 50
 *                 orderTradingSession: "REGULAR"
 *                 orderDisplayPrice: 150.50
 *                 orderSeqNumber: "SEQ-001"
 *                 atsDisplayIndicator: "Y"
 *                 orderDisplayQty: 100
 *                 orderWorkingPrice: 150.50
 *                 atsOrderType: "LIMIT"
 *                 orderNbboSource: "CONSOLIDATED"
 *                 orderNbboTimestamp: "2025-10-30T08:00:00.123Z"
 *                 orderSolicitationFlag: "N"
 *                 orderNetPrice: 150.48
 *                 routeRejectedFlag: "N"
 *                 orderOriginationSystem: "OMS-SYSTEM-1"
 *               - orderId: "ORD-002"
 *                 orderSymbol: "GOOGL"
 *                 orderPrice: 2800.00
 *                 orderQuantity: 50
 *                 orderStatus: "PENDING"
 *                 orderType: "MARKET"
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
 *                 failed:
 *                   type: integer
 *                   description: Number of orders that failed to process
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
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: integer
 *         description: Filter by batch ID
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
