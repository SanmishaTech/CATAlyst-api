const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const createError = require("http-errors");
const path = require("path");
const fs = require("fs").promises;
const {
  OrderAction,
  OrderStatus,
  OrderCapacity,
  OrderClientCapacity,
  OrderSide,
  OrderManualIndicator,
  OrderType,
  OrderTimeInforce,
  OrderAuctionIndicator,
  OrderSwapIndicator,
  OrderOptionPutCall,
  OrderOptionLegIndicator,
  OrderNegotiatedIndicator,
  OrderOpenClose,
  OrderPackageIndicator,
  OrderSecondaryOffering,
  OrderParentChildType,
  OrderTradingSession,
  AtsDisplayIndicator,
  OrderSolicitationFlag,
  RouteRejectedFlag,
  ExecutionSide,
  OrderExecutionInstructions,
  OrderAttributes,
  OrderRestrictions,
  OrderInstrumentReference,
  OrderActionInitiated,
  OrderFlowType,
  validateEnum
} = require("../constants/orderEnums");

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

// Helper function to validate and normalize order data using JSON validation logic
const validateAndNormalizeOrder = (orderData, userId, batchId, clientId) => {
  const validationErrors = [];
  
  // Validate enum fields and store normalized values
  const validatedEnumValues = {};
  const enumValidations = [
    { field: 'orderAction', enum: OrderAction, name: 'Order_Action', required: true },
    { field: 'orderStatus', enum: OrderStatus, name: 'Order_Status' },
    { field: 'orderCapacity', enum: OrderCapacity, name: 'Order_Capacity', required: true },
    { field: 'orderClientCapacity', enum: OrderClientCapacity, name: 'Order_Client_Capacity' },
    { field: 'orderSide', enum: OrderSide, name: 'Order_Side', required: true },
    { field: 'orderManualIndicator', enum: OrderManualIndicator, name: 'Order_Manual_Indicator' },
    { field: 'orderType', enum: OrderType, name: 'Order_Type', required: true },
    { field: 'orderTimeInforce', enum: OrderTimeInforce, name: 'Order_TimeInforce' },
    { field: 'orderAuctionIndicator', enum: OrderAuctionIndicator, name: 'Order_Auction_Indicator' },
    { field: 'orderSwapIndicator', enum: OrderSwapIndicator, name: 'Order_Swap_Indicator' },
    { field: 'orderOptionPutCall', enum: OrderOptionPutCall, name: 'Order_Option_Put_Call' },
    { field: 'orderOptionLegIndicator', enum: OrderOptionLegIndicator, name: 'Order_Option_Leg_Indicator' },
    { field: 'orderNegotiatedIndicator', enum: OrderNegotiatedIndicator, name: 'Order_Negotiated_Indicator' },
    { field: 'orderOpenClose', enum: OrderOpenClose, name: 'Order_Open_Close' },
    { field: 'orderPackageIndicator', enum: OrderPackageIndicator, name: 'Order_Package_Indicator' },
    { field: 'orderSecondaryOffering', enum: OrderSecondaryOffering, name: 'Order_Secondary_Offering' },
    { field: 'orderParentChildType', enum: OrderParentChildType, name: 'Order_Parent_Child_Type' },
    { field: 'orderTradingSession', enum: OrderTradingSession, name: 'Order_Trading_Session' },
    { field: 'atsDisplayIndicator', enum: AtsDisplayIndicator, name: 'ATS_Display_Indicator' },
    { field: 'orderSolicitationFlag', enum: OrderSolicitationFlag, name: 'Order_Solicitation_Flag' },
    { field: 'routeRejectedFlag', enum: RouteRejectedFlag, name: 'Route_Rejected_Flag' },
    { field: 'orderFlowType', enum: OrderFlowType, name: 'Order_Flow_Type' },
    { field: 'orderInstrumentReference', enum: OrderInstrumentReference, name: 'Order_Instrument_Reference' },
    { field: 'orderActionInitiated', enum: OrderActionInitiated, name: 'Order_Action_Initiated' }
  ];
  
  // Validate each enum field and store validated value
  enumValidations.forEach(({ field, enum: enumObj, name, required }) => {
    const value = orderData[field];
    if (required && (value === null || value === undefined || value === "")) {
      validationErrors.push(`${name} is required`);
      return;
    }
    
    const validation = validateEnum(enumObj, value, name);
    if (!validation.valid) {
      validationErrors.push(validation.error);
    } else {
      // Store the validated string value
      validatedEnumValues[field] = validation.value;
    }
  });
  
  // If validation errors exist, throw them
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '));
  }
  
  const order = {
    userId,
    batchId,
    clientId,
    orderId: orderData.orderId || null,
    orderIdVersion: orderData.orderIdVersion || null,
    orderIdSession: orderData.orderIdSession || null,
    orderIdInstance: orderData.orderIdInstance || null,
    parentOrderId: orderData.parentOrderId || null,
    cancelreplaceOrderId: orderData.cancelreplaceOrderId || orderData.cancelReplaceOrderId || null,
    linkedOrderId: orderData.linkedOrderId || null,
    orderAction: validatedEnumValues.orderAction || null,
    orderStatus: validatedEnumValues.orderStatus || null,
    orderCapacity: validatedEnumValues.orderCapacity || null,
    orderDestination: orderData.orderDestination || null,
    orderClientRef: orderData.orderClientRef || null,
    orderClientRefDetails: orderData.orderClientRefDetails || null,
    orderExecutingEntity: orderData.orderExecutingEntity || null,
    orderBookingEntity: orderData.orderBookingEntity || null,
    orderPositionAccount: orderData.orderPositionAccount || null,
    orderSide: validatedEnumValues.orderSide || null,
    orderClientCapacity: validatedEnumValues.orderClientCapacity || null,
    orderManualIndicator: validatedEnumValues.orderManualIndicator || null,
    orderRequestTime: orderData.orderRequestTime || null,
    orderEventTime: orderData.orderEventTime || null,
    orderManualTimestamp: orderData.orderManualTimestamp || null,
    orderOmsSource: orderData.orderOmsSource || null,
    orderPublishingTime: orderData.orderPublishingTime || null,
    orderTradeDate: orderData.orderTradeDate || null,
    orderQuantity: orderData.orderQuantity || null,
    orderPrice: orderData.orderPrice || null,
    orderType: validatedEnumValues.orderType || null,
    orderTimeInforce: validatedEnumValues.orderTimeInforce || null,
    orderExecutionInstructions: orderData.orderExecutionInstructions || orderData.orderExecutionInstruction || null,
    orderAttributes: orderData.orderAttributes || null,
    orderRestrictions: orderData.orderRestrictions || orderData.orderRestriction || null,
    orderAuctionIndicator: validatedEnumValues.orderAuctionIndicator || null,
    orderSwapIndicator: validatedEnumValues.orderSwapIndicator || null,
    orderOsi: orderData.orderOsi || null,
    orderInstrumentId: orderData.orderInstrumentId || null,
    orderLinkedInstrumentId: orderData.orderLinkedInstrumentId || null,
    orderCurrencyId: orderData.orderCurrencyId || null,
    orderFlowType: validatedEnumValues.orderFlowType || null,
    orderAlgoInstruction: orderData.orderAlgoInstruction || null,
    orderSymbol: orderData.orderSymbol || null,
    orderInstrumentReference: validatedEnumValues.orderInstrumentReference || null,
    orderInstrumentReferenceValue: orderData.orderInstrumentReferenceValue || null,
    orderOptionPutCall: validatedEnumValues.orderOptionPutCall || null,
    orderOptionStrikePrice: orderData.orderOptionStrikePrice || null,
    orderOptionLegIndicator: validatedEnumValues.orderOptionLegIndicator || null,
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
    orderNegotiatedIndicator: validatedEnumValues.orderNegotiatedIndicator || null,
    orderOpenClose: validatedEnumValues.orderOpenClose || null,
    orderParticipantPriorityCode: orderData.orderParticipantPriorityCode || null,
    orderActionInitiated: validatedEnumValues.orderActionInitiated || null,
    orderPackageIndicator: validatedEnumValues.orderPackageIndicator || null,
    orderPackageId: orderData.orderPackageId || null,
    orderPackagePricetype: orderData.orderPackagePricetype || null,
    orderStrategyType: orderData.orderStrategyType || null,
    orderSecondaryOffering: validatedEnumValues.orderSecondaryOffering || null,
    orderStartTime: orderData.orderStartTime || null,
    orderTifExpiration: orderData.orderTifExpiration || null,
    orderParentChildType: validatedEnumValues.orderParentChildType || null,
    orderMinimumQty: orderData.orderMinimumQty || null,
    orderTradingSession: validatedEnumValues.orderTradingSession || null,
    orderDisplayPrice: orderData.orderDisplayPrice || null,
    orderSeqNumber: orderData.orderSeqNumber || null,
    atsDisplayIndicator: validatedEnumValues.atsDisplayIndicator || null,
    orderDisplayQty: orderData.orderDisplayQty || null,
    orderWorkingPrice: orderData.orderWorkingPrice || null,
    atsOrderType: orderData.atsOrderType || null,
    orderNbboSource: orderData.orderNbboSource || null,
    orderNbboTimestamp: orderData.orderNbboTimestamp || null,
    orderSolicitationFlag: validatedEnumValues.orderSolicitationFlag || null,
    orderNetPrice: orderData.orderNetPrice || null,
    routeRejectedFlag: validatedEnumValues.routeRejectedFlag || null,
    orderOriginationSystem: orderData.orderOriginationSystem || null,
  };
  
  return order;
};

// Parse Excel file and convert to JSON array
const parseExcelToJson = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new Error("Excel file is empty or invalid");
  }

  // Get headers from first row
  const headers = [];
  worksheet.getRow(1).eachCell((cell) => {
    headers.push(cell.value.toString().toLowerCase().trim());
  });

  // Validate required fields
  if (!headers.includes("orderid")) {
    throw new Error("Excel file must contain 'orderid' column");
  }

  const orders = [];
  const errors = [];
  let rowNumber = 1;

  // Parse rows
  worksheet.eachRow((row, index) => {
    if (index === 1) return; // Skip header row
    rowNumber++;

    const orderData = {};

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
        index: rowNumber - 2, // Convert back to 0-based index
        orderId: null,
        error: "Missing required field: orderId",
      });
      return;
    }

    orders.push(orderData);
  });

  return { orders, errors };
};

// Unified upload handler for both JSON and Excel
const uploadOrders = async (req, res, next) => {
  let batch = null;
  let filePath = null;
  
  try {
    const userId = req.user.id;
    
    // Determine clientId based on user role
    let clientId = null;
    if (req.user.role === 'client') {
      clientId = req.user.id.toString();
    } else if (req.user.role === 'user') {
      clientId = req.user.clientId ? req.user.clientId.toString() : null;
    }

    let ordersArray = [];
    let fileName = "json_upload.json";
    let fileSize = 0;
    let errors = [];

    // Check if this is a file upload (Excel) or JSON body
    if (req.file) {
      // Excel file upload
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;

      // Parse Excel to JSON
      const parseResult = await parseExcelToJson(filePath);
      ordersArray = parseResult.orders;
      errors = parseResult.errors;

      // Clean up file after parsing
      await fs.unlink(filePath);
      filePath = null;
    } else if (req.body.orders) {
      // Direct JSON upload
      ordersArray = req.body.orders;
      
      if (!Array.isArray(ordersArray) || ordersArray.length === 0) {
        return next(createError(400, "Request body must contain an 'orders' array"));
      }
      
      fileSize = JSON.stringify(ordersArray).length;
    } else {
      return next(createError(400, "Either file upload or JSON body with 'orders' array is required"));
    }

    // Validate all orders FIRST (before creating batch)
    const validOrders = [];
    ordersArray.forEach((orderData, index) => {
      if (!orderData.orderId) {
        errors.push({
          index: index,
          orderId: null,
          error: "Missing required field: orderId",
        });
        return;
      }

      try {
        // Validate without batch.id (we'll add it after batch creation)
        const normalizedOrder = validateAndNormalizeOrder(orderData, userId, null, clientId);
        validOrders.push(normalizedOrder);
      } catch (validationError) {
        // Split multiple errors (separated by semicolons) into separate error objects
        const errorMessages = validationError.message.split('; ');
        errorMessages.forEach(errorMsg => {
          errors.push({
            index: index,
            orderId: orderData.orderId,
            error: errorMsg,
          });
        });
      }
    });

    // If no valid orders, return error WITHOUT creating batch
    if (validOrders.length === 0) {
      return res.status(400).json({
        message: "No valid orders found. Batch not created.",
        errors,
      });
    }

    // Create batch record ONLY if we have valid orders
    batch = await prisma.batch.create({
      data: {
        userId,
        fileName,
        fileSize,
        status: "processing",
      },
    });

    // Add batchId to all valid orders
    validOrders.forEach(order => {
      order.batchId = batch.id;
    });

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
      fileName: fileName,
      imported: result.count,
      total: validOrders.length,
      failed: validOrders.length - result.count,
      errors: errors.length > 0 ? errors : undefined,
    });
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
    if (filePath) {
      try {
        await fs.unlink(filePath);
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


module.exports = {
  uploadOrders,
  getOrders,
  getOrderById,
  deleteOrder,
};
