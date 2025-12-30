/**
 * Order Enum Definitions
 * Based on "Enum Mapping - Order" sheet from Order & Execution Object Mapping Excel
 */

const OrderAction = {
  1: "Order Requested",
  2: "Order Request Accepted",
  3: "Order Internal Route",
  4: "Order Internal Route Acknowledged",
  5: "Order External Route",
  6: "Order External Route Acknowledged",
  7: "Order Canceled",
  8: "Order Replaced",
  9: "Order Replace - Client Requested",
  10: "Order Replace - Client Request Accepted",
  11: "Order Cancel - Client Requested",
  12: "Order Cancel - Client Request Accepted",
  13: "Order Expired",
  14: "Order Rejected",
  15: "Order Suspended",
  16: "Done for day"
};

const OrderStatus = {
  1: "Open",
  2: "Canceled",
  3: "Replaced",
  4: "Done for day",
  5: "Expired",
  6: "Rejected",
  7: "Partially filled",
  8: "Filled"
};

const OrderCapacity = {
  1: "Agency",
  2: "Proprietary",
  3: "Individual",
  4: "Principal",
  5: "Riskless Principal",
  6: "Agent for Other Member"
};

const OrderClientCapacity = {
  1: "Agency",
  2: "Proprietary",
  3: "Individual",
  4: "Principal",
  5: "Riskless Principal",
  6: "Agent for Other Member"
};

const OrderSide = {
  1: "Buy",
  2: "Sell Long",
  3: "Buy Minus",
  4: "Sell Plus",
  5: "Sell Short",
  6: "Sell Short Exempt"
};

const OrderManualIndicator = {
  1: "Manual",
  2: "Electronic"
};

const OrderType = {
  1: "Market",
  2: "Limit",
  3: "Stop Loss",
  4: "Stop Limit",
  5: "Market On Close",
  6: "Pegged",
  7: "Forex Swap"
};

const OrderTimeInforce = {
  1: "Day",
  2: "Good Till Cancel",
  3: "At the Opening",
  4: "Immediate Or Cancel",
  5: "Fill Or Kill",
  6: "Good Till Crossing",
  7: "Good Till Date",
  8: "At the Close",
  9: "Good Till Month",
  10: "Immediate or Return",
  11: "Good Till Time"
};

const OrderAuctionIndicator = {
  0: null,
  1: "AOK",
  2: "APCM",
  3: "AUC"
};

const OrderSwapIndicator = {
  0: null,
  1: "Cash",
  2: "Swap"
};

const OrderOptionPutCall = {
  0: null,
  1: "Put",
  2: "Call"
};

const OrderOptionLegIndicator = {
  0: null,
  1: "Package",
  2: "Leg"
};

const OrderNegotiatedIndicator = {
  0: null,
  1: "Y",
  2: "N"
};

const OrderOpenClose = {
  0: null,
  1: "Open",
  2: "Close"
};

const OrderPackageIndicator = {
  0: null,
  1: "Package",
  2: "Leg"
};

const OrderSecondaryOffering = {
  1: null,
  2: "PREIPO",
  3: "POSTIPO",
  4: "IPO"
};

const OrderParentChildType = {
  1: "P",
  2: "C",
  3: "N"
};

const OrderTradingSession = {
  1: "PRE-OPEN",
  2: "AFTER-HOURS",
  3: "CROSS_2",
  4: "TOSTNET",
  5: "TOSTNET2",
  6: "ALL",
  7: "DAY",
  8: "PRE-SESSION",
  9: "POST-SESSION"
};

const AtsDisplayIndicator = {
  1: "Y",
  2: "N"
};

const OrderSolicitationFlag = {
  1: "Y",
  2: "N"
};

const RouteRejectedFlag = {
  0: null,
  1: "Y",
  2: "N"
};

const ExecutionSide = {
  1: "Buy",
  2: "Sell Long",
  3: "Buy Minus",
  4: "Sell Plus",
  5: "Sell Short",
  6: "Sell Short Exempt"
};

const OrderExecutionInstructions = {
  1: "Stay on offer side",
  2: "Not Held",
  3: "Work",
  4: "Go along",
  5: "Over the day",
  6: "Held",
  7: "Participate do nt initiate",
  8: "Strict scale",
  9: "Try to scale",
  10: "Stay on bid side",
  11: "No cross",
  12: "OK to cross",
  13: "Call first",
  14: "Percent of volume",
  15: "Do not increase",
  16: "Do not reduce",
  17: "All or none",
  18: "Reinstate on System Failue",
  19: "Institutions only",
  20: "Reinstate on Trading Halt",
  21: "Cancel on Trading Halt",
  22: "Non-negotiable",
  23: "Cancel on system failure",
  24: "Suspend",
  25: "Customer Display Instruction",
  26: "Netting",
  27: "Trade Along",
  28: "Try To Stop",
  29: "Cancel if not best",
  30: "Strict Limit",
  31: "Ignore Price Validity Checks",
  32: "Work to Target Strategy",
  33: "Intermarket Sweep",
  34: "External Routing Allowed",
  35: "External Routing Not Allowed",
  36: "Imbalance Only",
  37: "Single execution requested for block trade",
  38: "Best Execution"
};

const OrderAttributes = {
  1: "Aggregated order",
  2: "Order pending allocation",
  3: "Liquidity provision activity order",
  4: "Risk reduction order",
  5: "Algorithmic order",
  6: "Systemic internaliser order",
  7: "All executions for the order are to be submitted to an APA",
  8: "Order execution instructed by client",
  9: "Large in scale order",
  10: "Hidden order",
  11: "Subject to EU share trading obligation",
  12: "Subject to UK share trading obligation Representative order",
  13: "Order was originated to represent an order received by the broker from a customer/client",
  14: "Linkage type",
  15: "Exempt from share trading obligation"
};

const OrderRestrictions = {
  1: "Program Trade",
  2: "Index Arbitrage",
  3: "Non-Index Arbitrage",
  4: "Market Maker",
  5: "Foreign Entity",
  6: "External Market Participant",
  7: "Riskless Arbitrage"
};

const OrderInstrumentReference = {
  1: "CUSIP",
  2: "SEDOL",
  3: "ISIN",
  4: "RIC Code"
};

const OrderActionInitiated = {
  1: "Firm",
  2: "Exchange",
  3: "Client",
  4: "Broker"
};

const OrderFlowType = {
  1: "DMA",
  2: "Algo",
  3: "Sponsored Access",
  4: "High Touch",
  5: "Low Touch"
};

const LinkedOrderType = {
  1: "Representative",
  2: "Manual",
  3: "Merge",
  4: "Aggregated Order",
  5: "Synthetic Order"
};

const OrderInfobarrierId = {
  0: null,
  1: "Sales",
  2: "Trading",
  3: "Proprietary"
};

// Helper function to validate enum value
const validateEnum = (enumObj, value, enumName) => {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }

  // Convert to number if it's a string that looks like a number
  let numValue = value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value.trim(), 10);
    if (!isNaN(parsed)) {
      numValue = parsed;
    }
  }
  
  // Check if value matches an enum key (numeric)
  const validKeys = Object.keys(enumObj).map(k => parseInt(k, 10));
  if (validKeys.includes(numValue)) {
    return { valid: true, value: numValue };
  }

  // Invalid value - return error with valid options
  const validOptions = validKeys.join(", ");
  return { 
    valid: false, 
    error: `Invalid ${enumName} value: "${value}". Must be one of: ${validOptions}`
  };
};

// Export all enums and validation function
module.exports = {
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
};
