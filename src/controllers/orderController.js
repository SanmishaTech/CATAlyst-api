const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const createError = require("http-errors");
const path = require("path");
const fs = require("fs").promises;

// Field mapping from Excel headers to database fields (snake_case to camelCase)
const fieldMapping = {
  userid: "userId",
  clientid: "clientId",
  orderid: "orderId",
  orderidversion: "orderIdVersion",
  orderidsession: "orderIdSession",
  orderidinstance: "orderIdInstance",
  parentorderid: "parentOrderId",
  cancelreplaceorderid: "cancelReplaceOrderId",
  linkedorderid: "linkedOrderId",
  orderaction: "orderAction",
  orderstatus: "orderStatus",
  ordercapacity: "orderCapacity",
  orderdestination: "orderDestination",
  orderclientref: "orderClientRef",
  orderclientrefdetails: "orderClientRefDetails",
  orderexecutingentity: "orderExecutingEntity",
  orderbookingentity: "orderBookingEntity",
  orderpositionaccount: "orderPositionAccount",
  ordersite: "orderSite",
  orderclientcapacity: "orderClientCapacity",
  ordermanualindicator: "orderManualIndicator",
  orderrequesttime: "orderRequestTime",
  ordereventtime: "orderEventTime",
  ordermanualtimestamp: "orderManualTimestamp",
  orderomssource: "orderOmsSource",
  orderpublishingtime: "orderPublishingTime",
  ordertradedate: "orderTradeDate",
  orderquantity: "orderQuantity",
  orderprice: "orderPrice",
  ordertype: "orderType",
  ordertimeinforce: "orderTimeInForce",
  orderexecutioninstruction: "orderExecutionInstruction",
  orderattributes: "orderAttributes",
  orderrestriction: "orderRestriction",
  orderauctionindicator: "orderAuctionIndicator",
  orderswapindicator: "orderSwapIndicator",
  orderosi: "orderOsi",
  orderinstrumentid: "orderInstrumentId",
  orderlinkedinstrumentid: "orderLinkedInstrumentId",
  ordercurrencyid: "orderCurrencyId",
  orderflowtype: "orderFlowType",
  orderalgoinstruction: "orderAlgoInstruction",
  ordersymbol: "orderSymbol",
  orderinstrumentreference: "orderInstrumentReference",
  orderinstrumentreferencevalue: "orderInstrumentReferenceValue",
  orderoptionputcall: "orderOptionPutCall",
  orderoptionstrikeprice: "orderOptionStrikePrice",
  orderoptionlegindicator: "orderOptionLegIndicator",
  ordercomplicanceid: "orderComplianceId",
  orderentityid: "orderEntityId",
  orderexecutingaccount: "orderExecutingAccount",
  orderclearingaccount: "orderClearingAccount",
  orderclientorderid: "orderClientOrderId",
  orderroutedorderid: "orderRoutedOrderId",
  ordertradingowner: "orderTradingOwner",
  orderextendedattribute: "orderExtendedAttribute",
};

// Parse date values
const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Parse decimal values
const parseDecimal = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// Upload Excel file and parse orders
const uploadOrders = async (req, res, next) => {
  let batch = null;
  
  try {
    if (!req.file) {
      return next(createError(400, "No file uploaded"));
    }

    const userId = req.user.id;
    const filePath = req.file.path;

    // Create batch record to track this upload
    batch = await prisma.batch.create({
      data: {
        userId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: "processing",
      },
    });

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      await fs.unlink(filePath);
      
      // Update batch as failed
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "failed",
          errorLog: "Excel file is empty or invalid",
          completedAt: new Date(),
        },
      });
      
      return next(createError(400, "Excel file is empty or invalid"));
    }

    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(cell.value.toString().toLowerCase().trim());
    });

    // Validate required fields
    if (!headers.includes("orderid")) {
      await fs.unlink(filePath);
      
      // Update batch as failed
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "failed",
          errorLog: "Excel file must contain 'orderid' column",
          completedAt: new Date(),
        },
      });
      
      return next(createError(400, "Excel file must contain 'orderid' column"));
    }

    const orders = [];
    const errors = [];
    let rowNumber = 1;

    // Parse rows
    worksheet.eachRow((row, index) => {
      if (index === 1) return; // Skip header row
      rowNumber++;

      const orderData = { userId, batchId: batch.id };

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        const mappedField = fieldMapping[header];

        if (mappedField) {
          let value = cell.value;

          // Handle date fields
          if (
            [
              "orderRequestTime",
              "orderEventTime",
              "orderManualTimestamp",
              "orderPublishingTime",
              "orderTradeDate",
            ].includes(mappedField)
          ) {
            value = parseDate(value);
          }
          // Handle decimal fields
          else if (
            [
              "orderQuantity",
              "orderPrice",
              "orderOptionStrikePrice",
            ].includes(mappedField)
          ) {
            value = parseDecimal(value);
          }
          // Handle userId as integer
          else if (mappedField === "userId") {
            value = parseInt(value) || userId;
          }

          orderData[mappedField] = value;
        }
      });

      // Validate required field
      if (!orderData.orderId) {
        errors.push({
          row: rowNumber,
          error: "Missing required field: orderId",
        });
        return;
      }

      orders.push(orderData);
    });

    // Delete uploaded file
    await fs.unlink(filePath);

    if (orders.length === 0) {
      // Update batch as failed
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "failed",
          errorLog: JSON.stringify(errors),
          completedAt: new Date(),
        },
      });
      
      return res.status(400).json({
        message: "No valid orders found in Excel file",
        batchId: batch.id,
        errors,
      });
    }

    // Insert orders into database
    try {
      const result = await prisma.order.createMany({
        data: orders,
        skipDuplicates: true, // Skip if orderId already exists
      });

      // Update batch with success statistics
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          totalOrders: orders.length,
          successfulOrders: result.count,
          failedOrders: orders.length - result.count,
          status: "completed",
          errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
          completedAt: new Date(),
        },
      });

      res.status(201).json({
        message: "Orders uploaded successfully",
        batchId: batch.id,
        fileName: batch.fileName,
        imported: result.count,
        total: orders.length,
        skipped: orders.length - result.count,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      
      // Update batch as failed
      if (batch) {
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            status: "failed",
            errorLog: dbError.message,
            completedAt: new Date(),
          },
        });
      }
      
      return next(
        createError(
          500,
          `Database error: ${dbError.message || "Failed to insert orders"}`
        )
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    
    // Update batch as failed if it was created
    if (batch) {
      try {
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            status: "failed",
            errorLog: error.message,
            completedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.error("Failed to update batch:", updateError);
      }
    }
    
    // Clean up file if it exists
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Failed to delete file:", unlinkError);
      }
    }
    next(error);
  }
};

// Get all orders for the authenticated user
const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, orderId, orderStatus } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };

    if (orderId) {
      where.orderId = { contains: orderId };
    }
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// Delete order
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!order) {
      return next(createError(404, "Order not found"));
    }

    await prisma.order.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadOrders,
  getOrders,
  getOrderById,
  deleteOrder,
};
