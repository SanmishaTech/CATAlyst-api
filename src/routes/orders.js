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
 *       **Duplicate Handling:**
 *       - Every row in Excel creates a new database row
 *       - Duplicate orderIds are allowed (tracked by batchId)
 *       - Same orderId can exist across multiple batches
 *       
 *       **Response includes:**
 *       - batchId: Track this import
 *       - imported: Number of orders successfully created
 *       - failed: Number of orders that failed
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
 * /orders/upload-json:
 *   post:
 *     summary: 📤 Upload Orders from JSON
 *     tags: [Orders]
 *     description: |
 *       Upload orders directly as JSON array without Excel file.
 *       
 *       **JSON Structure:**
 *       - Send an array of order objects in request body
 *       - Each object can contain any order fields
 *       - Only `orderId` field is required
 *       - `clientId` is AUTO-SET based on your user role (do not include)
 *       - All data is stored in database columns
 *       
 *       **Example:**
 *       ```json
 *       {
 *         "orders": [
 *           {
 *             "orderId": "ORD-001",
 *             "orderSymbol": "AAPL",
 *             "orderPrice": 150.50,
 *             "orderQuantity": 100,
 *             "orderStatus": "PENDING",
 *             "customField1": "any value",
 *             "customField2": { "nested": "object" }
 *           }
 *         ]
 *       }
 *       ```
 *       
 *       **Note:** clientId is automatically set - do not include it in your request.
 *       
 *       **Benefits:**
 *       - Flexible schema - add any fields you want
 *       - Direct API integration without Excel
 *       - Supports nested JSON objects
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
 *                     scenario:
 *                       type: string
 *                       description: Test or business scenario identifier
 *                     orderId:
 *                       type: string
 *                       description: Unique order identifier (REQUIRED)
 *                     orderIdVersion:
 *                       type: integer
 *                       description: Version number of the order
 *                     orderIdSession:
 *                       type: integer
 *                       description: Trading session identifier
 *                     orderIdInstance:
 *                       type: string
 *                       description: Instance identifier for the order
 *                     parentOrderId:
 *                       type: string
 *                       description: Identifier of the parent order (for child orders)
 *                     cancelreplaceOrderId:
 *                       type: string
 *                       description: Original order ID when canceling/replacing
 *                     linkedOrderId:
 *                       type: string
 *                       description: Related or linked order identifier
 *                     orderAction:
 *                       type: string
 *                       description: Action taken on the order (new, cancel, replace, etc.)
 *                     orderStatus:
 *                       type: string
 *                       description: Current status of the order (open, filled, canceled, etc.)
 *                     orderCapacity:
 *                       type: integer
 *                       description: Trading capacity (principal, agency, riskless principal)
 *                     orderDestination:
 *                       type: integer
 *                       description: Exchange or venue where order is routed
 *                     orderClientRef:
 *                       type: integer
 *                       description: Client reference number
 *                     orderClientRefDetails:
 *                       type: integer
 *                       description: Additional client reference details
 *                     orderExecutingEntity:
 *                       type: string
 *                       description: Entity executing the order
 *                     orderBookingEntity:
 *                       type: string
 *                       description: Entity booking the order
 *                     orderPositionAccount:
 *                       type: string
 *                       description: Account for position tracking
 *                     orderSide:
 *                       type: string
 *                       description: Buy or sell side
 *                     orderClientCapacity:
 *                       type: string
 *                       description: Client's trading capacity
 *                     orderManualIndicator:
 *                       type: string
 *                       description: Whether order was manually entered
 *                     orderRequestTime:
 *                       type: string
 *                       description: Time order was requested
 *                     orderEventTime:
 *                       type: string
 *                       description: Time of order event
 *                     orderManualTimestamp:
 *                       type: string
 *                       description: Timestamp for manual orders
 *                     orderOmsSource:
 *                       type: string
 *                       description: Order management system source
 *                     orderPublishingTime:
 *                       type: string
 *                       description: Time order was published
 *                     orderTradeDate:
 *                       type: string
 *                       description: Trade date
 *                     orderQuantity:
 *                       type: number
 *                       description: Total order quantity
 *                     orderPrice:
 *                       type: number
 *                       description: Order price
 *                     orderType:
 *                       type: string
 *                       description: Order type (market, limit, stop, etc.)
 *                     orderTimeInforce:
 *                       type: string
 *                       description: Time in force (day, GTC, IOC, FOK, etc.)
 *                     orderExecutionInstructions:
 *                       type: string
 *                       description: Special execution instructions
 *                     orderAttributes:
 *                       type: string
 *                       description: Additional order attributes
 *                     orderRestrictions:
 *                       type: string
 *                       description: Trading restrictions on the order
 *                     orderAuctionIndicator:
 *                       type: string
 *                       description: Whether order participates in auction
 *                     orderSwapIndicator:
 *                       type: string
 *                       description: Swap transaction indicator
 *                     orderOsi:
 *                       type: string
 *                       description: Order source indicator
 *                     orderInstrumentId:
 *                       type: string
 *                       description: Unique instrument identifier
 *                     orderLinkedInstrumentId:
 *                       type: string
 *                       description: Related instrument identifier
 *                     orderCurrencyId:
 *                       type: string
 *                       description: Currency of the order
 *                     orderFlowType:
 *                       type: string
 *                       description: Order flow classification
 *                     orderAlgoInstruction:
 *                       type: string
 *                       description: Algorithmic trading instructions
 *                     orderSymbol:
 *                       type: string
 *                       description: Trading symbol
 *                     orderInstrumentReference:
 *                       type: string
 *                       description: Type of instrument reference
 *                     orderInstrumentReferenceValue:
 *                       type: string
 *                       description: Value of instrument reference
 *                     orderOptionPutCall:
 *                       type: string
 *                       description: Put or call for options
 *                     orderOptionStrikePrice:
 *                       type: number
 *                       description: Strike price for options
 *                     orderOptionLegIndicator:
 *                       type: string
 *                       description: Multi-leg option indicator
 *                     orderComplianceId:
 *                       type: string
 *                       description: Compliance identifier
 *                     orderEntityId:
 *                       type: string
 *                       description: Entity identifier
 *                     orderExecutingAccount:
 *                       type: string
 *                       description: Executing account number
 *                     orderClearingAccount:
 *                       type: string
 *                       description: Clearing account number
 *                     orderClientOrderId:
 *                       type: string
 *                       description: Client's order identifier
 *                     orderRoutedOrderId:
 *                       type: string
 *                       description: Order ID after routing
 *                     orderTradingOwner:
 *                       type: string
 *                       description: Owner/trader of the order
 *                     orderExtendedAttribute:
 *                       type: string
 *                       description: Extended attributes field
 *                     orderQuoteId:
 *                       type: string
 *                       description: Related quote identifier
 *                     orderRepresentOrderId:
 *                       type: string
 *                       description: Representative order identifier
 *                     orderOnBehalfCompId:
 *                       type: string
 *                       description: On-behalf-of company ID
 *                     orderSpread:
 *                       type: string
 *                       description: Spread value for multi-leg orders
 *                     orderAmendReason:
 *                       type: string
 *                       description: Reason for order amendment
 *                     orderCancelRejectReason:
 *                       type: string
 *                       description: Reason for cancel/reject
 *                     orderBidSize:
 *                       type: number
 *                       description: Bid size at order time
 *                     orderBidPrice:
 *                       type: number
 *                       description: Bid price at order time
 *                     orderAskSize:
 *                       type: number
 *                       description: Ask size at order time
 *                     orderAskPrice:
 *                       type: number
 *                       description: Ask price at order time
 *                     orderBasketId:
 *                       type: string
 *                       description: Basket order identifier
 *                     orderCumQty:
 *                       type: number
 *                       description: Cumulative filled quantity
 *                     orderLeavesQty:
 *                       type: number
 *                       description: Remaining unfilled quantity
 *                     orderStopPrice:
 *                       type: number
 *                       description: Stop price for stop orders
 *                     orderDiscretionPrice:
 *                       type: number
 *                       description: Discretionary price limit
 *                     orderExdestinationInstruction:
 *                       type: string
 *                       description: Exchange destination instructions
 *                     orderExecutionParameter:
 *                       type: string
 *                       description: Execution parameters
 *                     orderInfobarrierId:
 *                       type: string
 *                       description: Information barrier identifier
 *                     orderLegRatio:
 *                       type: string
 *                       description: Ratio for multi-leg orders
 *                     orderLocateId:
 *                       type: string
 *                       description: Short sale locate identifier
 *                     orderNegotiatedIndicator:
 *                       type: string
 *                       description: Negotiated trade indicator
 *                     orderOpenClose:
 *                       type: string
 *                       description: Open or close position indicator
 *                     orderParticipantPriorityCode:
 *                       type: string
 *                       description: Participant priority code
 *                     orderActionInitiated:
 *                       type: string
 *                       description: Who initiated the action
 *                     orderPackageIndicator:
 *                       type: string
 *                       description: Package order indicator
 *                     orderPackageId:
 *                       type: string
 *                       description: Package identifier
 *                     orderPackagePricetype:
 *                       type: string
 *                       description: Package pricing type
 *                     orderStrategyType:
 *                       type: string
 *                       description: Trading strategy type
 *                     orderSecondaryOffering:
 *                       type: string
 *                       description: Secondary offering indicator
 *                     orderStartTime:
 *                       type: string
 *                       description: Order start time
 *                     orderTifExpiration:
 *                       type: string
 *                       description: Time in force expiration
 *                     orderParentChildType:
 *                       type: string
 *                       description: Parent-child relationship type
 *                     orderMinimumQty:
 *                       type: number
 *                       description: Minimum execution quantity
 *                     orderTradingSession:
 *                       type: string
 *                       description: Trading session designation
 *                     orderDisplayPrice:
 *                       type: number
 *                       description: Displayed price
 *                     orderSeqNumber:
 *                       type: string
 *                       description: Sequence number
 *                     atsDisplayIndicator:
 *                       type: string
 *                       description: Alternative trading system display indicator
 *                     orderDisplayQty:
 *                       type: number
 *                       description: Displayed quantity
 *                     orderWorkingPrice:
 *                       type: number
 *                       description: Working price
 *                     atsOrderType:
 *                       type: string
 *                       description: ATS order type
 *                     orderNbboSource:
 *                       type: string
 *                       description: National best bid and offer source
 *                     orderNbboTimestamp:
 *                       type: string
 *                       description: NBBO timestamp
 *                     orderSolicitationFlag:
 *                       type: string
 *                       description: Solicited order flag
 *                     orderNetPrice:
 *                       type: number
 *                       description: Net price
 *                     routeRejectedFlag:
 *                       type: string
 *                       description: Whether route was rejected
 *                     orderOriginationSystem:
 *                       type: string
 *                       description: System where order originated
 *           example:
 *             orders:
 *               - scenario: "TEST"
 *                 orderId: "ORD-001"
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
 *                 imported:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/upload-json", auth, orderController.uploadOrdersJson);

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
