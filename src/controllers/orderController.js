const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const createError = require("http-errors");
const path = require("path");
const fs = require("fs").promises;

// Field mapping from Excel headers to database fields (snake_case to camelCase)
const fieldMapping = {
  userid: "userId",
  orderid: "orderId",
  order_id: "orderId",
  orderidversion: "orderIdVersion",
  order_id_version: "orderIdVersion",
  orderidsession: "orderIdSession",
  order_id_session: "orderIdSession",
  orderidinstance: "orderIdInstance",
  order_id_instance: "orderIdInstance",
  parentorderid: "parentOrderId",
  parent_order_id: "parentOrderId",
  cancelreplaceorderid: "cancelreplaceOrderId",
  cancelreplace_order_id: "cancelreplaceOrderId",
  linkedorderid: "linkedOrderId",
  linked_order_id: "linkedOrderId",
  orderaction: "orderAction",
  order_action: "orderAction",
  orderstatus: "orderStatus",
  order_status: "orderStatus",
  ordercapacity: "orderCapacity",
  order_capacity: "orderCapacity",
  orderdestination: "orderDestination",
  order_destination: "orderDestination",
  orderclientref: "orderClientRef",
  order_client_ref: "orderClientRef",
  orderclientrefdetails: "orderClientRefDetails",
  order_client_ref_details: "orderClientRefDetails",
  orderexecutingentity: "orderExecutingEntity",
  order_executing_entity: "orderExecutingEntity",
  orderbookingentity: "orderBookingEntity",
  order_booking_entity: "orderBookingEntity",
  orderpositionaccount: "orderPositionAccount",
  order_position_account: "orderPositionAccount",
  orderside: "orderSide",
  order_side: "orderSide",
  orderclientcapacity: "orderClientCapacity",
  order_client_capacity: "orderClientCapacity",
  ordermanualindicator: "orderManualIndicator",
  order_manual_indicator: "orderManualIndicator",
  orderrequesttime: "orderRequestTime",
  order_request_time: "orderRequestTime",
  ordereventtime: "orderEventTime",
  order_event_time: "orderEventTime",
  ordermanualtimestamp: "orderManualTimestamp",
  order_manual_timestamp: "orderManualTimestamp",
  orderomssource: "orderOmsSource",
  order_oms_source: "orderOmsSource",
  orderpublishingtime: "orderPublishingTime",
  order_publishing_time: "orderPublishingTime",
  ordertradedate: "orderTradeDate",
  order_trade_date: "orderTradeDate",
  orderquantity: "orderQuantity",
  order_quantity: "orderQuantity",
  orderprice: "orderPrice",
  order_price: "orderPrice",
  ordertype: "orderType",
  order_type: "orderType",
  ordertimeinforce: "orderTimeInforce",
  order_timeinforce: "orderTimeInforce",
  orderexecutioninstructions: "orderExecutionInstructions",
  order_execution_instructions: "orderExecutionInstructions",
  orderattributes: "orderAttributes",
  order_attributes: "orderAttributes",
  orderrestrictions: "orderRestrictions",
  order_restrictions: "orderRestrictions",
  orderauctionindicator: "orderAuctionIndicator",
  order_auction_indicator: "orderAuctionIndicator",
  orderswapindicator: "orderSwapIndicator",
  order_swap_indicator: "orderSwapIndicator",
  orderosi: "orderOsi",
  order_osi: "orderOsi",
  orderinstrumentid: "orderInstrumentId",
  order_instrument_id: "orderInstrumentId",
  orderlinkedinstrumentid: "orderLinkedInstrumentId",
  order_linked_instrument_id: "orderLinkedInstrumentId",
  ordercurrencyid: "orderCurrencyId",
  order_currency_id: "orderCurrencyId",
  orderflowtype: "orderFlowType",
  order_flow_type: "orderFlowType",
  orderalgoinstruction: "orderAlgoInstruction",
  order_algo_instruction: "orderAlgoInstruction",
  ordersymbol: "orderSymbol",
  order_symbol: "orderSymbol",
  orderinstrumentreference: "orderInstrumentReference",
  order_instrument_reference: "orderInstrumentReference",
  orderinstrumentreferencevalue: "orderInstrumentReferenceValue",
  order_instrument_reference_value: "orderInstrumentReferenceValue",
  orderoptionputcall: "orderOptionPutCall",
  order_option_put_call: "orderOptionPutCall",
  orderoptionstrikeprice: "orderOptionStrikePrice",
  order_option_strike_price: "orderOptionStrikePrice",
  orderoptionlegindicator: "orderOptionLegIndicator",
  order_option_leg_indicator: "orderOptionLegIndicator",
  ordercomplianceid: "orderComplianceId",
  order_compliance_id: "orderComplianceId",
  orderentityid: "orderEntityId",
  order_entity_id: "orderEntityId",
  orderexecutingaccount: "orderExecutingAccount",
  order_executing_account: "orderExecutingAccount",
  orderclearingaccount: "orderClearingAccount",
  order_clearing_account: "orderClearingAccount",
  orderclientorderid: "orderClientOrderId",
  order_client_order_id: "orderClientOrderId",
  orderroutedorderid: "orderRoutedOrderId",
  order_routed_order_id: "orderRoutedOrderId",
  ordertradingowner: "orderTradingOwner",
  order_trading_owner: "orderTradingOwner",
  orderextendedattribute: "orderExtendedAttribute",
  order_extended_attribute: "orderExtendedAttribute",
  orderquoteid: "orderQuoteId",
  order_quote_id: "orderQuoteId",
  orderrepresentorderid: "orderRepresentOrderId",
  order_represent_order_id: "orderRepresentOrderId",
  orderonbehalfcompid: "orderOnBehalfCompId",
  order_on_behalf_comp_id: "orderOnBehalfCompId",
  orderspread: "orderSpread",
  order_spread: "orderSpread",
  orderamendreason: "orderAmendReason",
  order_amend_reason: "orderAmendReason",
  ordercancelrejectreason: "orderCancelRejectReason",
  order_cancel_reject_reason: "orderCancelRejectReason",
  orderbidsize: "orderBidSize",
  order_bid_size: "orderBidSize",
  orderbidprice: "orderBidPrice",
  order_bid_price: "orderBidPrice",
  orderasksize: "orderAskSize",
  order_ask_size: "orderAskSize",
  orderaskprice: "orderAskPrice",
  order_ask_price: "orderAskPrice",
  orderbasketid: "orderBasketId",
  order_basket_id: "orderBasketId",
  ordercumqty: "orderCumQty",
  order_cum_qty: "orderCumQty",
  orderleavesqty: "orderLeavesQty",
  order_leaves_qty: "orderLeavesQty",
  orderstopprice: "orderStopPrice",
  order_stop_price: "orderStopPrice",
  orderdiscretionprice: "orderDiscretionPrice",
  order_discretion_price: "orderDiscretionPrice",
  orderexdestinationinstruction: "orderExdestinationInstruction",
  order_exdestination_instruction: "orderExdestinationInstruction",
  orderexecutionparameter: "orderExecutionParameter",
  order_execution_parameter: "orderExecutionParameter",
  orderinfobarrierid: "orderInfobarrierId",
  order_infobarrier_id: "orderInfobarrierId",
  orderlegratio: "orderLegRatio",
  order_leg_ratio: "orderLegRatio",
  orderlocateid: "orderLocateId",
  order_locate_id: "orderLocateId",
  ordernegotiatedindicator: "orderNegotiatedIndicator",
  order_negotiated_indicator: "orderNegotiatedIndicator",
  orderopenclose: "orderOpenClose",
  order_open_close: "orderOpenClose",
  orderparticipantprioritycode: "orderParticipantPriorityCode",
  order_participant_priority_code: "orderParticipantPriorityCode",
  orderactioninitiated: "orderActionInitiated",
  order_action_initiated: "orderActionInitiated",
  orderpackageindicator: "orderPackageIndicator",
  order_package_indicator: "orderPackageIndicator",
  orderpackageid: "orderPackageId",
  order_package_id: "orderPackageId",
  orderpackagepricetype: "orderPackagePricetype",
  order_package_pricetype: "orderPackagePricetype",
  orderstrategytype: "orderStrategyType",
  order_strategy_type: "orderStrategyType",
  ordersecondaryoffering: "orderSecondaryOffering",
  order_secondary_offering: "orderSecondaryOffering",
  orderstarttime: "orderStartTime",
  order_start_time: "orderStartTime",
  ordertifexpiration: "orderTifExpiration",
  order_tif_expiration: "orderTifExpiration",
  orderparentchildtype: "orderParentChildType",
  order_parent_child_type: "orderParentChildType",
  orderminimumqty: "orderMinimumQty",
  order_minimum_qty: "orderMinimumQty",
  ordertradingsession: "orderTradingSession",
  order_trading_session: "orderTradingSession",
  orderdisplayprice: "orderDisplayPrice",
  order_display_price: "orderDisplayPrice",
  orderseqnumber: "orderSeqNumber",
  order_seq_number: "orderSeqNumber",
  atsdisplayindicator: "atsDisplayIndicator",
  ats_display_indicator: "atsDisplayIndicator",
  orderdisplayqty: "orderDisplayQty",
  order_display_qty: "orderDisplayQty",
  orderworkingprice: "orderWorkingPrice",
  order_working_price: "orderWorkingPrice",
  atsordertype: "atsOrderType",
  ats_order_type: "atsOrderType",
  ordernbbosource: "orderNbboSource",
  order_nbbo_source: "orderNbboSource",
  ordernbbotimestamp: "orderNbboTimestamp",
  order_nbbo_timestamp: "orderNbboTimestamp",
  ordersolicitationflag: "orderSolicitationFlag",
  order_solicitation_flag: "orderSolicitationFlag",
  ordernetprice: "orderNetPrice",
  order_net_price: "orderNetPrice",
  routerejectedflag: "routeRejectedFlag",
  route_rejected_flag: "routeRejectedFlag",
  orderoriginationsystem: "orderOriginationSystem",
  order_origination_system: "orderOriginationSystem",
};

// Parse decimal values
const parseDecimal = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// Parse integer values
const parseIntValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(value);
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
    
    // Determine clientId based on user role
    let clientId = null;
    if (req.user.role === 'client') {
      clientId = req.user.id.toString(); // Client's own ID
    } else if (req.user.role === 'user') {
      clientId = req.user.clientId ? req.user.clientId.toString() : null; // User's associated client
    }
    // If admin, clientId remains null

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

      const orderData = { userId, batchId: batch.id, clientId };

      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        const mappedField = fieldMapping[header];

        if (mappedField) {
          let value = cell.value;

          // Handle integer fields
          if (
            [
              "orderIdVersion",
              "orderIdSession",
              "orderCapacity",
              "orderDestination",
              "orderClientRef",
              "orderClientRefDetails",
            ].includes(mappedField)
          ) {
            value = parseIntValue(value);
          }
          // Handle decimal fields
          else if (
            [
              "orderQuantity",
              "orderPrice",
              "orderOptionStrikePrice",
              "orderBidSize",
              "orderBidPrice",
              "orderAskSize",
              "orderAskPrice",
              "orderCumQty",
              "orderLeavesQty",
              "orderStopPrice",
              "orderDiscretionPrice",
              "orderMinimumQty",
              "orderDisplayPrice",
              "orderDisplayQty",
              "orderWorkingPrice",
              "orderNetPrice",
            ].includes(mappedField)
          ) {
            value = parseDecimal(value);
          }
          // Handle userId as integer
          else if (mappedField === "userId") {
            value = parseInt(value) || userId;
          }
          // All other fields (including dates) are stored as strings
          else if (value !== null && value !== undefined) {
            value = value.toString();
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

    // Insert orders into database (allows duplicates)
    try {
      const result = await prisma.order.createMany({
        data: orders,
        skipDuplicates: false, // Allow duplicate orderIds
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
        failed: orders.length - result.count,
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
    const { page = 1, limit = 50, orderId, orderStatus, batchId } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId };

    if (orderId) {
      where.orderId = { contains: orderId };
    }
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }
    if (batchId) {
      where.batchId = parseInt(batchId);
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

// Upload orders directly from JSON
const uploadOrdersJson = async (req, res, next) => {
  let batch = null;
  
  try {
    const { orders: ordersArray } = req.body;
    
    if (!ordersArray || !Array.isArray(ordersArray) || ordersArray.length === 0) {
      return next(createError(400, "Request body must contain an 'orders' array"));
    }

    const userId = req.user.id;
    const errors = [];
    const validOrders = [];
    
    // Determine clientId based on user role
    let clientId = null;
    if (req.user.role === 'client') {
      clientId = req.user.id.toString(); // Client's own ID
    } else if (req.user.role === 'user') {
      clientId = req.user.clientId ? req.user.clientId.toString() : null; // User's associated client
    }
    // If admin, clientId remains null

    // Create batch record
    batch = await prisma.batch.create({
      data: {
        userId,
        fileName: "json_upload.json",
        fileSize: JSON.stringify(ordersArray).length,
        status: "processing",
      },
    });

    // Validate and prepare orders
    ordersArray.forEach((orderData, index) => {
      if (!orderData.orderId) {
        errors.push({
          index: index,
          error: "Missing required field: orderId",
        });
        return;
      }

      // Map JSON fields to database columns - copy all fields from orderData
      const order = {
        userId,
        batchId: batch.id,
        clientId: clientId,
        orderId: orderData.orderId || null,
        orderIdVersion: orderData.orderIdVersion || null,
        orderIdSession: orderData.orderIdSession || null,
        orderIdInstance: orderData.orderIdInstance || null,
        parentOrderId: orderData.parentOrderId || null,
        cancelreplaceOrderId: orderData.cancelreplaceOrderId || orderData.cancelReplaceOrderId || null,
        linkedOrderId: orderData.linkedOrderId || null,
        orderAction: orderData.orderAction || null,
        orderStatus: orderData.orderStatus || null,
        orderCapacity: orderData.orderCapacity || null,
        orderDestination: orderData.orderDestination || null,
        orderClientRef: orderData.orderClientRef || null,
        orderClientRefDetails: orderData.orderClientRefDetails || null,
        orderExecutingEntity: orderData.orderExecutingEntity || null,
        orderBookingEntity: orderData.orderBookingEntity || null,
        orderPositionAccount: orderData.orderPositionAccount || null,
        orderSide: orderData.orderSide || null,
        orderClientCapacity: orderData.orderClientCapacity || null,
        orderManualIndicator: orderData.orderManualIndicator || null,
        orderRequestTime: orderData.orderRequestTime || null,
        orderEventTime: orderData.orderEventTime || null,
        orderManualTimestamp: orderData.orderManualTimestamp || null,
        orderOmsSource: orderData.orderOmsSource || null,
        orderPublishingTime: orderData.orderPublishingTime || null,
        orderTradeDate: orderData.orderTradeDate || null,
        orderQuantity: orderData.orderQuantity || null,
        orderPrice: orderData.orderPrice || null,
        orderType: orderData.orderType || null,
        orderTimeInforce: orderData.orderTimeInforce || orderData.orderTimeInForce || null,
        orderExecutionInstructions: orderData.orderExecutionInstructions || orderData.orderExecutionInstruction || null,
        orderAttributes: orderData.orderAttributes || null,
        orderRestrictions: orderData.orderRestrictions || orderData.orderRestriction || null,
        orderAuctionIndicator: orderData.orderAuctionIndicator || null,
        orderSwapIndicator: orderData.orderSwapIndicator || null,
        orderOsi: orderData.orderOsi || null,
        orderInstrumentId: orderData.orderInstrumentId || null,
        orderLinkedInstrumentId: orderData.orderLinkedInstrumentId || null,
        orderCurrencyId: orderData.orderCurrencyId || null,
        orderFlowType: orderData.orderFlowType || null,
        orderAlgoInstruction: orderData.orderAlgoInstruction || null,
        orderSymbol: orderData.orderSymbol || null,
        orderInstrumentReference: orderData.orderInstrumentReference || null,
        orderInstrumentReferenceValue: orderData.orderInstrumentReferenceValue || null,
        orderOptionPutCall: orderData.orderOptionPutCall || null,
        orderOptionStrikePrice: orderData.orderOptionStrikePrice || null,
        orderOptionLegIndicator: orderData.orderOptionLegIndicator || null,
        orderComplianceId: orderData.orderComplianceId || null,
        orderEntityId: orderData.orderEntityId || null,
        orderExecutingAccount: orderData.orderExecutingAccount || null,
        orderClearingAccount: orderData.orderClearingAccount || null,
        orderClientOrderId: orderData.orderClientOrderId || null,
        orderRoutedOrderId: orderData.orderRoutedOrderId || null,
        orderTradingOwner: orderData.orderTradingOwner || null,
        orderExtendedAttribute: orderData.orderExtendedAttribute || null,
        orderQuoteId: orderData.orderQuoteId || null,
        orderRepresentOrderId: orderData.orderRepresentOrderId || null,
        orderOnBehalfCompId: orderData.orderOnBehalfCompId || null,
        orderSpread: orderData.orderSpread || null,
        orderAmendReason: orderData.orderAmendReason || null,
        orderCancelRejectReason: orderData.orderCancelRejectReason || null,
        orderBidSize: orderData.orderBidSize || null,
        orderBidPrice: orderData.orderBidPrice || null,
        orderAskSize: orderData.orderAskSize || null,
        orderAskPrice: orderData.orderAskPrice || null,
        orderBasketId: orderData.orderBasketId || null,
        orderCumQty: orderData.orderCumQty || null,
        orderLeavesQty: orderData.orderLeavesQty || null,
        orderStopPrice: orderData.orderStopPrice || null,
        orderDiscretionPrice: orderData.orderDiscretionPrice || null,
        orderExdestinationInstruction: orderData.orderExdestinationInstruction || null,
        orderExecutionParameter: orderData.orderExecutionParameter || null,
        orderInfobarrierId: orderData.orderInfobarrierId || null,
        orderLegRatio: orderData.orderLegRatio || null,
        orderLocateId: orderData.orderLocateId || null,
        orderNegotiatedIndicator: orderData.orderNegotiatedIndicator || null,
        orderOpenClose: orderData.orderOpenClose || null,
        orderParticipantPriorityCode: orderData.orderParticipantPriorityCode || null,
        orderActionInitiated: orderData.orderActionInitiated || null,
        orderPackageIndicator: orderData.orderPackageIndicator || null,
        orderPackageId: orderData.orderPackageId || null,
        orderPackagePricetype: orderData.orderPackagePricetype || null,
        orderStrategyType: orderData.orderStrategyType || null,
        orderSecondaryOffering: orderData.orderSecondaryOffering || null,
        orderStartTime: orderData.orderStartTime || null,
        orderTifExpiration: orderData.orderTifExpiration || null,
        orderParentChildType: orderData.orderParentChildType || null,
        orderMinimumQty: orderData.orderMinimumQty || null,
        orderTradingSession: orderData.orderTradingSession || null,
        orderDisplayPrice: orderData.orderDisplayPrice || null,
        orderSeqNumber: orderData.orderSeqNumber || null,
        atsDisplayIndicator: orderData.atsDisplayIndicator || null,
        orderDisplayQty: orderData.orderDisplayQty || null,
        orderWorkingPrice: orderData.orderWorkingPrice || null,
        atsOrderType: orderData.atsOrderType || null,
        orderNbboSource: orderData.orderNbboSource || null,
        orderNbboTimestamp: orderData.orderNbboTimestamp || null,
        orderSolicitationFlag: orderData.orderSolicitationFlag || null,
        orderNetPrice: orderData.orderNetPrice || null,
        routeRejectedFlag: orderData.routeRejectedFlag || null,
        orderOriginationSystem: orderData.orderOriginationSystem || null,
      };

      validOrders.push(order);
    });

    if (validOrders.length === 0) {
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "failed",
          errorLog: JSON.stringify(errors),
          completedAt: new Date(),
        },
      });
      
      return res.status(400).json({
        message: "No valid orders found in JSON data",
        batchId: batch.id,
        errors,
      });
    }

    // Insert orders into database
    const result = await prisma.order.createMany({
      data: validOrders,
      skipDuplicates: false,
    });

    // Update batch with success statistics
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        totalOrders: validOrders.length,
        successfulOrders: result.count,
        failedOrders: validOrders.length - result.count,
        status: "completed",
        errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
        completedAt: new Date(),
      },
    });

    res.status(201).json({
      message: "Orders uploaded successfully",
      batchId: batch.id,
      imported: result.count,
      total: validOrders.length,
      failed: validOrders.length - result.count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("JSON upload error:", error);
    
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
    
    next(error);
  }
};

module.exports = {
  uploadOrders,
  uploadOrdersJson,
  getOrders,
  getOrderById,
  deleteOrder,
};
