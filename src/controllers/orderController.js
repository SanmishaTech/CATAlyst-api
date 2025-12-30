const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const createError = require("http-errors");
const path = require("path");
const fs = require("fs").promises;
const https = require("https");
const crypto = require("crypto");
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
  LinkedOrderType,
  OrderInfobarrierId,
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
  linkordertype: "linkOrderType",
  link_order_type: "linkOrderType",
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

// Helper function to parse timestamp fields
// Handles formats: "20250526:12:38:04:123426" (full) and "20250526" (date only)
const parseTimestampField = (value) => {
  if (!value || value === null || value === undefined || value === "") {
    return null;
  }

  const strValue = String(value).trim();
  
  // Check if it's a full timestamp format: YYYYMMDD:HH:MM:SS:microseconds
  if (strValue.includes(':')) {
    try {
      const parts = strValue.split(':');
      if (parts.length >= 1) {
        const datePart = parts[0]; // YYYYMMDD
        const timePart = parts.slice(1).join(':'); // HH:MM:SS:microseconds
        
        // Parse date: YYYYMMDD
        if (datePart.length === 8) {
          const year = parseInt(datePart.substring(0, 4), 10);
          const month = parseInt(datePart.substring(4, 6), 10);
          const day = parseInt(datePart.substring(6, 8), 10);
          
          // Parse time if available
          let hour = 0, minute = 0, second = 0, ms = 0;
          if (parts.length > 1) {
            hour = parseInt(parts[1], 10) || 0;
            minute = parseInt(parts[2], 10) || 0;
            second = parseInt(parts[3], 10) || 0;
            // Convert microseconds to milliseconds if present
            if (parts[4]) {
              ms = Math.floor(parseInt(parts[4], 10) / 1000) || 0;
            }
          }
          
          // Create ISO string
          const date = new Date(year, month - 1, day, hour, minute, second, ms);
          return date.toISOString();
        }
      }
    } catch (e) {
      // Fallback to original value if parsing fails
      return strValue;
    }
  }
  
  // Check if it's date-only format: YYYYMMDD
  if (strValue.length === 8 && /^\d{8}$/.test(strValue)) {
    try {
      const year = strValue.substring(0, 4);
      const month = strValue.substring(4, 6);
      const day = strValue.substring(6, 8);
      // Return date-only in YYYY-MM-DD format as plain string (no time component)
      return `${year}-${month}-${day}`;
    } catch (e) {
      return strValue;
    }
  }
  
  // Return original value if it doesn't match expected formats
  return strValue;
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
    { field: 'orderActionInitiated', enum: OrderActionInitiated, name: 'Order_Action_Initiated' },
    { field: 'linkOrderType', enum: LinkedOrderType, name: 'Link_Order_Type' },
    { field: 'orderInfobarrierId', enum: OrderInfobarrierId, name: 'Order_Infobarrier_ID' }
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

  // Validate conditional field: linkOrderType is required when linkedOrderId is present
  if ((orderData.linkedOrderId || null) !== null && (orderData.linkOrderType === undefined || orderData.linkOrderType === null || orderData.linkOrderType === '')) {
    validationErrors.push('Link_Order_Type is required when Linked_Order_ID is provided');
  }

  // If validation errors exist, throw them
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '));
  }

  // Generate uniqueID from orderId + orderIdInstance
  // Create a hash-based short ID (8 characters) for better readability
  const combinedString = `${orderData.orderId || ''}${orderData.orderIdInstance || ''}`;
  const hash = crypto.createHash('md5').update(combinedString).digest('hex').substring(0, 8).toUpperCase();
  const uniqueID = hash;
  
  const order = {
    userId,
    batchId,
    clientId,
    uniqueID,
    orderId: orderData.orderId || null,
    orderIdVersion: orderData.orderIdVersion || null,
    orderIdSession: orderData.orderIdSession || null,
    orderIdInstance: orderData.orderIdInstance || null,
    parentOrderId: orderData.parentOrderId || null,
    cancelreplaceOrderId: orderData.cancelreplaceOrderId || orderData.cancelReplaceOrderId || null,
    linkedOrderId: orderData.linkedOrderId || null,
    linkOrderType: validatedEnumValues.linkOrderType || null,
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
    orderRequestTime: parseTimestampField(orderData.orderRequestTime),
    orderEventTime: parseTimestampField(orderData.orderEventTime),
    orderManualTimestamp: parseTimestampField(orderData.orderManualTimestamp),
    orderOmsSource: orderData.orderOmsSource || null,
    orderPublishingTime: parseTimestampField(orderData.orderPublishingTime),
    orderTradeDate: parseTimestampField(orderData.orderTradeDate),
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
    orderInfobarrierId: validatedEnumValues.orderInfobarrierId || null,
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
    orderStartTime: parseTimestampField(orderData.orderStartTime),
    orderTifExpiration: parseTimestampField(orderData.orderTifExpiration),
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
    orderNbboTimestamp: parseTimestampField(orderData.orderNbboTimestamp),
    orderSolicitationFlag: validatedEnumValues.orderSolicitationFlag || null,
    orderNetPrice: orderData.orderNetPrice || null,
    routeRejectedFlag: validatedEnumValues.routeRejectedFlag || null,
    orderOriginationSystem: orderData.orderOriginationSystem || null,
  };

  return order;
};

// Generate Excel file with error records
const generateErrorExcel = async (ordersArray, errors) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Failed Orders');

  // Group errors by index for easy lookup
  const errorsByIndex = {};
  errors.forEach(err => {
    if (!errorsByIndex[err.index]) {
      errorsByIndex[err.index] = [];
    }
    errorsByIndex[err.index].push(err.error);
  });

  // Define ALL order fields (matching template) - always show all columns
  const fields = [
    "orderId",
    "orderIdVersion",
    "orderIdSession",
    "orderIdInstance",
    "parentOrderId",
    "cancelreplaceOrderId",
    "linkedOrderId",
    "linkOrderType",
    "orderAction",
    "orderStatus",
    "orderCapacity",
    "orderDestination",
    "orderClientRef",
    "orderClientRefDetails",
    "orderExecutingEntity",
    "orderBookingEntity",
    "orderPositionAccount",
    "orderSide",
    "orderClientCapacity",
    "orderManualIndicator",
    "orderRequestTime",
    "orderEventTime",
    "orderManualTimestamp",
    "orderOmsSource",
    "orderPublishingTime",
    "orderTradeDate",
    "orderQuantity",
    "orderPrice",
    "orderType",
    "orderTimeInforce",
    "orderExecutionInstructions",
    "orderAttributes",
    "orderRestrictions",
    "orderAuctionIndicator",
    "orderSwapIndicator",
    "orderOsi",
    "orderInstrumentId",
    "orderLinkedInstrumentId",
    "orderCurrencyId",
    "orderFlowType",
    "orderAlgoInstruction",
    "orderSymbol",
    "orderInstrumentReference",
    "orderInstrumentReferenceValue",
    "orderOptionPutCall",
    "orderOptionStrikePrice",
    "orderOptionLegIndicator",
    "orderComplianceId",
    "orderEntityId",
    "orderExecutingAccount",
    "orderClearingAccount",
    "orderClientOrderId",
    "orderRoutedOrderId",
    "orderTradingOwner",
    "orderExtendedAttribute",
    "orderQuoteId",
    "orderRepresentOrderId",
    "orderOnBehalfCompId",
    "orderSpread",
    "orderAmendReason",
    "orderCancelRejectReason",
    "orderBidSize",
    "orderBidPrice",
    "orderAskSize",
    "orderAskPrice",
    "orderBasketId",
    "orderCumQty",
    "orderLeavesQty",
    "orderStopPrice",
    "orderDiscretionPrice",
    "orderExdestinationInstruction",
    "orderExecutionParameter",
    "orderInfobarrierId",
    "orderLegRatio",
    "orderLocateId",
    "orderNegotiatedIndicator",
    "orderOpenClose",
    "orderParticipantPriorityCode",
    "orderActionInitiated",
    "orderPackageIndicator",
    "orderPackageId",
    "orderPackagePricetype",
    "orderStrategyType",
    "orderSecondaryOffering",
    "orderStartTime",
    "orderTifExpiration",
    "orderParentChildType",
    "orderMinimumQty",
    "orderTradingSession",
    "orderDisplayPrice",
    "orderSeqNumber",
    "atsDisplayIndicator",
    "orderDisplayQty",
    "orderWorkingPrice",
    "atsOrderType",
    "orderNbboSource",
    "orderNbboTimestamp",
    "orderSolicitationFlag",
    "orderNetPrice",
    "routeRejectedFlag",
    "orderOriginationSystem",
    "linkOrderType",
  ];

  // Get failed orders with their error index
  const failedOrders = [];
  Object.keys(errorsByIndex).forEach(index => {
    const order = ordersArray[parseInt(index)];
    if (order) {
      failedOrders.push({ ...order, _index: index });
    }
  });

  // Add headers (all order fields + Error column)
  const headers = [...fields, 'Error'];
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }
  };

  // Add data rows with errors
  failedOrders.forEach(order => {
    const rowData = [];
    fields.forEach(field => {
      rowData.push(order[field] !== undefined && order[field] !== null ? order[field] : '');
    });

    // Add error messages (joined if multiple errors)
    const errorMessages = errorsByIndex[order._index].join('; ');
    rowData.push(errorMessages);

    const row = worksheet.addRow(rowData);

    // Highlight error column in red
    const errorCell = row.getCell(headers.length);
    errorCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCCCC' }
    };
    errorCell.font = { color: { argb: 'FFCC0000' } };
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 50); // Cap at 50
  });

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `order-errors-${timestamp}.xlsx`;
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads', 'excelerrors');
  const filepath = path.join(uploadsDir, filename);

  // Ensure uploads/excelerrors directory exists
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads/excelerrors directory:', err);
  }

  // Save file
  await workbook.xlsx.writeFile(filepath);

  return filename;
};

// Import enum mappings
const {
  OrderStatusMapping,
  OrderActionMapping,
  OrderCapacityMapping,
  OrderSideMapping,
  OrderTypeMapping,
  OrderTimeInforceMapping,
  OrderClientCapacityMapping,
  OrderManualIndicatorMapping,
  OrderAuctionIndicatorMapping,
  OrderSwapIndicatorMapping,
  OrderOptionPutCallMapping,
  OrderOptionLegIndicatorMapping,
  OrderNegotiatedIndicatorMapping,
  OrderOpenCloseMapping,
  OrderPackageIndicatorMapping,
  OrderSecondaryOfferingMapping,
  OrderParentChildTypeMapping,
  OrderTradingSessionMapping,
  AtsDisplayIndicatorMapping,
  OrderSolicitationFlagMapping,
  RouteRejectedFlagMapping,
  OrderFlowTypeMapping,
  OrderInstrumentReferenceMapping,
  OrderActionInitiatedMapping,
  LinkedOrderTypeMapping,
  OrderInfoBarrierIdMapping,
  convertStringToEnum,
} = require('../constants/enumMappings');

// Parse Excel file and convert to JSON array
const parseExcelToJson = async (filePath) => {
  let workbook = null;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Prefer the first available worksheet (handles files where index 1 may be missing)
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(`Excel file has no worksheets (found ${workbook.worksheets.length}). Ensure it is a valid .xlsx with at least one sheet.`);
    }

    // Require at least a header row + one data row
    if ((worksheet.rowCount || 0) < 2) {
      throw new Error("Excel file is empty (no data rows found).");
    }

    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      const headerValue = cell.value ? cell.value.toString().toLowerCase().trim() : '';
      headers.push(headerValue);
    });

    // Validate required fields - accept both camelCase and snake_case
    const hasOrderId = headers.includes("orderid") || headers.includes("order_id");
    if (!hasOrderId) {
      throw new Error("Excel file must contain 'orderId' or 'order_id' column");
    }

    const orders = [];
    const errors = [];
    let rowNumber = 1;

    // Parse rows
    worksheet.eachRow((row, index) => {
      if (index === 1) return; // Skip header row
      rowNumber++;

      const orderData = {};

      // Use eachCell with includeEmpty option to process all columns
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        const mappedField = fieldMapping[header];

      if (mappedField) {
        let value = cell.value;

        // Handle integer fields
        if (
          [
            "orderIdVersion",
            "orderIdSession",
            "orderExecutingEntity",
            "orderBookingEntity",
            "orderPositionAccount",
            "orderInstrumentId",
            "orderLinkedInstrumentId",
            "orderExecutingAccount",
            "orderClearingAccount",
            "orderTradingOwner",
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
        // Handle enum fields - convert string values to numeric codes
        else if (
          [
            "orderStatus",
            "orderAction",
            "orderCapacity",
            "orderSide",
            "orderType",
            "orderTimeInforce",
            "orderClientCapacity",
            "orderManualIndicator",
            "orderAuctionIndicator",
            "orderSwapIndicator",
            "orderOptionPutCall",
            "orderOptionLegIndicator",
            "orderNegotiatedIndicator",
            "orderOpenClose",
            "orderPackageIndicator",
            "orderSecondaryOffering",
            "orderParentChildType",
            "orderTradingSession",
            "atsDisplayIndicator",
            "orderSolicitationFlag",
            "routeRejectedFlag",
            "orderFlowType",
            "orderInstrumentReference",
            "orderActionInitiated",
            "linkOrderType",
            "orderInfobarrierId",
          ].includes(mappedField)
        ) {
          // Map string values to numeric enum codes
          const enumMappings = {
            orderStatus: OrderStatusMapping,
            orderAction: OrderActionMapping,
            orderCapacity: OrderCapacityMapping,
            orderSide: OrderSideMapping,
            orderType: OrderTypeMapping,
            orderTimeInforce: OrderTimeInforceMapping,
            orderClientCapacity: OrderClientCapacityMapping,
            orderManualIndicator: OrderManualIndicatorMapping,
            orderAuctionIndicator: OrderAuctionIndicatorMapping,
            orderSwapIndicator: OrderSwapIndicatorMapping,
            orderOptionPutCall: OrderOptionPutCallMapping,
            orderOptionLegIndicator: OrderOptionLegIndicatorMapping,
            orderNegotiatedIndicator: OrderNegotiatedIndicatorMapping,
            orderOpenClose: OrderOpenCloseMapping,
            orderPackageIndicator: OrderPackageIndicatorMapping,
            orderSecondaryOffering: OrderSecondaryOfferingMapping,
            orderParentChildType: OrderParentChildTypeMapping,
            orderTradingSession: OrderTradingSessionMapping,
            atsDisplayIndicator: AtsDisplayIndicatorMapping,
            orderSolicitationFlag: OrderSolicitationFlagMapping,
            routeRejectedFlag: RouteRejectedFlagMapping,
            orderFlowType: OrderFlowTypeMapping,
            orderInstrumentReference: OrderInstrumentReferenceMapping,
            orderActionInitiated: OrderActionInitiatedMapping,
            linkOrderType: LinkedOrderTypeMapping,
            orderInfobarrierId: OrderInfoBarrierIdMapping,
          };
          
          const mapping = enumMappings[mappedField];
          if (mapping && value !== null && value !== undefined && value !== '') {
            value = convertStringToEnum(value, mapping);
          }
        }
        // All other fields (including dates) are stored as strings
        else if (value !== null && value !== undefined) {
          value = value.toString();
        }

        orderData[mappedField] = value;
      }
    });

    // Do not filter out rows without orderId here; they will be validated in the next stage
    if (orders.length === 0) {
      // Debug: log first parsed row
      console.log('First order parsed:', JSON.stringify(orderData, null, 2));
    }

    orders.push(orderData);
  });

  console.log(`Parsed ${orders.length} orders from Excel`);
  
  return { orders, errors };
  } catch (err) {
    throw err;
  }
};

// Unified upload handler for both JSON and Excel
const uploadOrders = async (req, res, next) => {
  let batch = null;
  let filePath = null;

  try {
    const userId = req.user.id;
    
    console.log('[UPLOAD] Request received:');
    console.log('  User ID:', userId);
    console.log('  Has file:', !!req.file);
    console.log('  File name:', req.file?.originalname);
    console.log('  Trade date:', req.body.tradeDate);
    console.log('  File type:', req.body.fileType);
    console.log('  Body keys:', Object.keys(req.body));

    // Determine clientId based on user role
    let clientId = null;
    if (req.user.role === 'client') {
      clientId = req.user.id.toString();
    } else if (req.user.role === 'user') {
      clientId = req.user.clientId ? req.user.clientId.toString() : null;
    }

    let ordersArray = [];
    let errors = [];
    let fileNameForBatch = 'json upload';

    // Check if this is a file upload (Excel) or JSON body
    if (req.file) {
      // Excel file upload
      filePath = req.file.path;
      fileNameForBatch = req.file.originalname || req.file.filename || 'json upload';
      
      console.log('[UPLOAD] Processing Excel file:', fileNameForBatch);

      // Parse Excel to JSON
      const parseResult = await parseExcelToJson(filePath);
      ordersArray = parseResult.orders;
      errors = parseResult.errors;
      
      console.log('[UPLOAD] Parsed', ordersArray.length, 'orders from Excel');

      // Clean up file after parsing - add small delay to ensure file is released
      try {
        // Wait a bit for file handles to be released
        await new Promise(resolve => setTimeout(resolve, 100));
        await fs.unlink(filePath);
        filePath = null;
      } catch (unlinkError) {
        console.warn('[UPLOAD] Warning: Could not delete uploaded file:', unlinkError.message);
        // Don't fail the upload if we can't delete the file
        filePath = null;
      }
    } else if (req.body.orders) {
      // Direct JSON upload
      ordersArray = req.body.orders;

      if (!Array.isArray(ordersArray) || ordersArray.length === 0) {
        return next(createError(400, "Request body must contain an 'orders' array"));
      }
      // For JSON uploads, we standardize the filename label
      fileNameForBatch = 'json upload';
      console.log('[UPLOAD] Processing JSON with', ordersArray.length, 'orders');
    } else {
      console.error('[UPLOAD] No file or orders array provided');
      console.error('[UPLOAD] req.file:', req.file);
      console.error('[UPLOAD] req.body:', req.body);
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

    // Log validation summary
    if (errors.length > 0) {
      console.log(`[ORDER VALIDATION] Summary: ${validOrders.length} valid, ${errors.length} failed out of ${ordersArray.length} total`);
      if (errors.length <= 10) {
        // Show all errors if there are 10 or fewer
        errors.forEach((err, idx) => {
          console.error(`  [${idx + 1}] Row ${err.index + 2}, OrderID: ${err.orderId || 'N/A'} - ${err.error}`);
        });
      } else {
        // Show first 5 and last 5 if more than 10 errors
        console.error('  First 5 errors:');
        errors.slice(0, 5).forEach((err, idx) => {
          console.error(`    [${idx + 1}] Row ${err.index + 2}, OrderID: ${err.orderId || 'N/A'} - ${err.error}`);
        });
        console.error(`  ... ${errors.length - 10} more errors ...`);
        console.error('  Last 5 errors:');
        errors.slice(-5).forEach((err, idx) => {
          console.error(`    [${errors.length - 5 + idx + 1}] Row ${err.index + 2}, OrderID: ${err.orderId || 'N/A'} - ${err.error}`);
        });
      }
    }

    // If no valid orders, return error WITHOUT creating batch
    if (validOrders.length === 0) {
      console.error('[ORDER VALIDATION] All orders failed validation:');
      errors.forEach((err, idx) => {
        console.error(`  [${idx + 1}] Row ${err.index + 2}, OrderID: ${err.orderId || 'N/A'} - ${err.error}`);
      });

      // Generate error Excel file
      let errorFile = null;
      try {
        errorFile = await generateErrorExcel(ordersArray, errors);
        console.log(`[ERROR EXCEL] Generated error file: ${errorFile}`);
      } catch (excelError) {
        console.error('[ERROR EXCEL] Failed to generate error Excel:', excelError);
      }

      return res.status(400).json({
        message: "No valid orders found. Batch not created.",
        total: ordersArray.length,
        failed: errors.length,
        errors,
        errorFile: errorFile ? `/uploads/excelerrors/${errorFile}` : null,
      });
    }

    // Create batch record ONLY if we have valid orders
    batch = await prisma.batch.create({
      data: {
        userId,
        status: "in_progress",
        fileName: fileNameForBatch,
        tradeDate: req.body.tradeDate ? new Date(req.body.tradeDate) : null,
        fileType: req.body.fileType || null,
      },
    });

    // List of enum fields that need to be converted to strings
    const enumFields = [
      'orderAction', 'orderStatus', 'orderCapacity', 'orderClientCapacity', 
      'orderSide', 'orderManualIndicator', 'orderType', 'orderTimeInforce',
      'orderExecutionInstructions', 'orderAttributes', 'orderRestrictions',
      'orderAuctionIndicator', 'orderSwapIndicator', 'orderOptionPutCall',
      'orderOptionLegIndicator', 'orderNegotiatedIndicator', 'orderOpenClose',
      'orderPackageIndicator', 'orderSecondaryOffering', 'orderParentChildType',
      'orderTradingSession', 'orderInstrumentReference', 'orderActionInitiated',
      'orderFlowType', 'orderInfobarrierId', 'atsDisplayIndicator', 'orderSolicitationFlag',
      'routeRejectedFlag'
    ];

    // Add batchId to all valid orders and ensure all fields are properly typed
    validOrders.forEach(order => {
      order.batchId = batch.id;
      
      // Convert all enum fields from integers to strings
      enumFields.forEach(field => {
        if (order[field] !== null && order[field] !== undefined && order[field] !== '') {
          order[field] = String(order[field]);
        }
      });
      
      // Convert orderIdSession to string (accept both int and string, max 16 chars)
      if (order.orderIdSession !== null && order.orderIdSession !== undefined) {
        order.orderIdSession = String(order.orderIdSession).substring(0, 16);
      }
      
      // Set default values for required fields that might be missing
      if (!order.orderOmsSource) {
        order.orderOmsSource = 'UNKNOWN';
      }
      if (!order.orderPublishingTime) {
        order.orderPublishingTime = order.orderEventTime || new Date().toISOString();
      }
      
      // Ensure null values are explicitly set for optional fields
      // This prevents Prisma from complaining about missing required fields
      const optionalFields = [
        'orderRequestTime', 'orderEventTime',
        'orderDestination', 'orderClientRefDetails', 'orderManualTimestamp',
        'orderAttributes', 'orderRestrictions', 'orderAuctionIndicator',
        'orderSwapIndicator', 'orderOsi', 'orderLinkedInstrumentId', 'orderCurrencyId',
        'orderFlowType', 'orderAlgoInstruction', 'orderOptionPutCall', 'orderOptionStrikePrice',
        'orderOptionLegIndicator', 'orderExtendedAttribute', 'orderQuoteId',
        'orderRepresentOrderId', 'orderOnBehalfCompId', 'orderSpread', 'orderAmendReason',
        'orderCancelRejectReason', 'orderBidPrice', 'orderBasketId', 'orderStopPrice',
        'orderDiscretionPrice', 'orderExdestinationInstruction', 'orderExecutionParameter',
        'orderInfobarrierId', 'orderLegRatio', 'orderLocateId', 'orderOpenClose',
        'orderParticipantPriorityCode', 'orderPackageId', 'orderPackagePricetype',
        'orderStrategyType', 'orderStartTime', 'orderTifExpiration', 'orderDisplayPrice',
        'orderSeqNumber', 'orderDisplayQty', 'orderWorkingPrice', 'atsOrderType',
        'orderNbboSource', 'orderNbboTimestamp', 'orderNetPrice', 'orderRoutedOrderId',
        'orderTradingOwner', 'orderClientOrderId', 'orderExecutingAccount', 'orderClearingAccount',
        'orderInstrumentId', 'orderPositionAccount', 'orderBookingEntity', 'orderExecutingEntity',
        'orderClientRef', 'parentOrderId', 'cancelreplaceOrderId', 'linkedOrderId', 'linkOrderType',
        'orderIdVersion', 'orderIdInstance', 'orderIdSession', 'orderPrice', 'orderQuantity',
        'orderCumQty', 'orderLeavesQty', 'orderBidSize', 'orderAskSize', 'orderAskPrice',
        'orderMinimumQty', 'orderComplianceId', 'orderEntityId', 'orderTradeDate',
        'orderStatus', 'orderTimeInforce', 'orderExecutionInstructions', 'orderType',
        'orderManualIndicator', 'orderClientCapacity'
      ];
      
      optionalFields.forEach(field => {
        if (!(field in order)) {
          order[field] = null;
        }
      });
    });

    // Insert orders into database
    const result = await prisma.order.createMany({
      data: validOrders,
      skipDuplicates: false,
    });

    // Count unique rejected orders (not error messages)
    const uniqueRejectedOrderIndices = new Set(errors.map(err => err.index));
    const rejectedOrdersCount = uniqueRejectedOrderIndices.size;

    // Update batch with success statistics
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        totalOrders: ordersArray.length,
        successfulOrders: result.count,
        failedOrders: rejectedOrdersCount,
        status: "completed",
        errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
        completedAt: new Date(),
      },
    });

    // Save rejected orders to database
    if (errors.length > 0) {
      try {
        // Determine upload type (excel vs json)
        const uploadType = req.file ? 'excel' : 'json';

        // Group errors by index to handle multiple errors per order
        const errorsByIndex = {};
        errors.forEach(err => {
          if (!errorsByIndex[err.index]) {
            errorsByIndex[err.index] = [];
          }
          errorsByIndex[err.index].push(err.error);
        });

        // Prepare rejected orders data
        const rejectedOrdersData = Object.keys(errorsByIndex).map(index => {
          const idx = parseInt(index);
          const orderData = ordersArray[idx];
          const errorMessages = errorsByIndex[index];

          return {
            batchId: batch.id,
            userId: userId,
            rowNumber: uploadType === 'excel' ? idx + 2 : null, // Excel row number (header is row 1)
            jsonIndex: uploadType === 'json' ? idx : null, // JSON array index
            orderId: orderData?.orderId || null,
            rawData: orderData ? JSON.stringify(orderData) : null,
            validationErrors: JSON.stringify(errorMessages),
            uploadType: uploadType,
          };
        });

        // Insert rejected orders into database
        await prisma.rejectedOrder.createMany({
          data: rejectedOrdersData,
          skipDuplicates: false,
        });

        console.log(`[REJECTED ORDERS] Saved ${rejectedOrdersData.length} rejected orders to database`);
      } catch (dbError) {
        console.error('[REJECTED ORDERS] Failed to save rejected orders to database:', dbError);
        // Don't fail the entire request if we can't save rejected orders
      }
    }

    // Generate error Excel file if there are validation errors
    let errorFile = null;
    if (errors.length > 0) {
      try {
        errorFile = await generateErrorExcel(ordersArray, errors);
        console.log(`[ERROR EXCEL] Generated error file for partial failures: ${errorFile}`);
      } catch (excelError) {
        console.error('[ERROR EXCEL] Failed to generate error Excel:', excelError);
      }
    }

    res.status(201).json({
      message: "Orders uploaded successfully",
      batchId: batch.id,
      imported: result.count,
      total: ordersArray.length, // Total input records (valid + invalid)
      failed: errors.length, // All validation failures
      errors: errors.length > 0 ? errors : undefined,
      errorFile: errorFile ? `/uploads/excelerrors/${errorFile}` : null,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Update batch as failed if it was created
    if (batch) {
      try {
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            status: "completed",
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

const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      page = 1,
      limit = 50,
      cursor,
      orderId,
      orderStatus,
      orderSymbol,
      orderSide,
      batchId,
      clientId,
      fromDate,
      toDate,
      executingEntity,
      clientRef,
      exDestination,
      sortBy = 'id',
      sortOrder = 'asc',
      groupBy,
      includeTotal,
    } = req.query;

    // Cap limit to prevent abuse
    const take = Math.min(parseInt(limit), 100);
    const skip = cursor ? 0 : (parseInt(page) - 1) * take;

    // Build where clause based on user role and filters
    const where = {};

    // Role-based filtering
    if (userRole === 'admin') {
      // Admin can see all orders, optionally filtered by clientId
      if (clientId) {
        where.clientId = clientId;
      }
    } else if (userRole === 'client') {
      // Client users can only see orders for their client
      where.clientId = userId.toString();
    } else {
      // Regular users can only see their own orders
      where.userId = userId;
      // But if they have a clientId, also filter by that
      if (req.user.clientId) {
        where.clientId = req.user.clientId.toString();
      }
    }

    // Additional filters
    if (orderId) {
      where.orderId = { contains: orderId };
    }
    if (orderStatus) {
      where.orderStatus = orderStatus;
    }
    if (orderSymbol) {
      where.orderSymbol = { contains: orderSymbol };
    }
    // Executing Entity exact match
    if (executingEntity) {
      where.orderExecutingEntity = parseInt(executingEntity);
    }
    // Client Ref exact match
    if (clientRef) {
      where.orderClientRef = clientRef;
    }
    // Destination LIKE match
    if (exDestination) {
      where.orderDestination = { contains: exDestination };
    }
    // Trade date range filter (string comparison)
    if (fromDate || toDate) {
      where.orderTradeDate = {};
      if (fromDate) {
        where.orderTradeDate.gte = fromDate;
      }
      if (toDate) {
        where.orderTradeDate.lte = toDate;
      }
    }

    if (orderSide) {
      where.orderSide = orderSide;
    }
    if (batchId) {
      where.batchId = parseInt(batchId);
    }

    // Build orderBy clause (support multiple fields)
    const orderBy = [];
    const validSortFields = [
      'id', 'createdAt', 'orderId', 'orderSymbol', 'orderStatus',
      'orderSide', 'orderPrice', 'orderQuantity', 'orderType', 'batchId', 'tradeDate'
    ];

    // If grouping is enabled, sort by group field first
    if (groupBy && validSortFields.includes(groupBy)) {
      orderBy.push({ [groupBy]: 'asc' });
    }

    // Then add the primary sort field
    if (validSortFields.includes(sortBy)) {
      orderBy.push({ [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' });
    } else {
      orderBy.push({ id: 'asc' }); // default
    }

    // Cursor-based pagination for better performance
    const queryOptions = {
      where,
      take: take + 1, // Fetch one extra to check if there's a next page
      orderBy: orderBy.length > 0 ? orderBy : { id: 'asc' },
    };

    // Add cursor if provided (for infinite scroll)
    if (cursor) {
      queryOptions.cursor = {
        id: parseInt(cursor)
      };
      queryOptions.skip = 1; // Skip the cursor
    } else {
      queryOptions.skip = skip;
    }

    // Execute query
    const orders = await prisma.order.findMany(queryOptions);

    // Check if there's a next page
    const hasMore = orders.length > take;
    if (hasMore) {
      orders.pop(); // Remove the extra record
    }

    // Always compute total count for pagination info
    const total = await prisma.order.count({ where });

    // Response with offset-based pagination support
    const response = {
      orders,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
        hasMore,
        nextCursor: hasMore && orders.length > 0 ? orders[orders.length - 1].id : null,
      },
    };

    res.json(response);
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

 const callGroqChatCompletions = async ({ apiKey, model, messages, temperature = 0 }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages,
      temperature,
    });

    const req_ = https.request(
      {
        method: "POST",
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res_) => {
        let data = "";
        res_.on("data", (chunk) => {
          data += chunk;
        });
        res_.on("end", () => {
          try {
            if (res_.statusCode && res_.statusCode >= 400) {
              return reject(
                createError(
                  res_.statusCode,
                  `Groq API error (${res_.statusCode}): ${data}`
                )
              );
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req_.on("error", reject);
    req_.write(payload);
    req_.end();
  });

const getOrdersAiBaseUrl = (req) => {
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const protocol = (forwardedProto || req.protocol || "http")
    .toString()
    .split(",")[0]
    .trim();
  const host = (forwardedHost || req.get("host"))
    .toString()
    .split(",")[0]
    .trim();

  return `${protocol}://${host}/api/orders`;
};

const generateOrdersAiFilterUrl = async (req, res, next) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return next(createError(400, "prompt is required"));
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return next(createError(500, "GROQ_API_KEY is not configured"));
    }

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const ordersBaseUrl = getOrdersAiBaseUrl(req);

    const systemPrompt = `You are a specialized API Query String Generator. Your goal is to convert user requests into a single, valid URL for the Catalyst API.

### BASE URL
${ordersBaseUrl}

### FIELD MAPPING RULES
- "start date" or "since" -> fromDate (Format: YYYY-MM-DD)
- "end date" or "until" -> toDate (Format: YYYY-MM-DD)
- "id" or "reference" -> orderId
- "currency" or "symbol" -> orderSymbol
- "entity" or "account id" -> executingEntity
- "count" or "amount" -> limit
- "page number" -> page
- "sort" -> sortBy
- "direction" -> sortOrder (Values: "asc" or "desc")

### OUTPUT RULES
1. Return ONLY the full URL.
2. Do not include introductory text, markdown code blocks, or explanations.
3. Ensure all date parameters follow the ISO 8601 format (YYYY-MM-DD).
4. If a parameter is missing, use these defaults: limit=50, page=1, sortBy=createdAt, sortOrder=desc.`;

    const completion = await callGroqChatCompletions({
      apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return next(createError(502, "Groq response did not include a URL"));
    }

    const raw = content.trim();
    const candidate = raw.replace(/^['"]|['"]$/g, "");
    const extracted = candidate.match(/https?:\/\/\S+/)?.[0];
    const url = extracted || candidate;

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl) {
        return next(createError(502, `Groq returned an invalid URL: ${raw}`));
      }

       if (!/\/api\/orders\/?$/.test(parsedUrl.pathname)) {
         return next(
           createError(
             502,
             `Groq returned a URL that is not an orders endpoint: ${raw}`
           )
         );
       }
    } catch (e) {
      return next(createError(502, `Groq returned an invalid URL: ${raw}`));
    }

    res.json({ url });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadOrders,
  getOrders,
  getOrderById,
  deleteOrder,
  generateOrdersAiFilterUrl,
};
