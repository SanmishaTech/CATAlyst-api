/**
 * Order Enum Definitions
 * Based on "Enum Mapping - Order" sheet from Order & Execution Object Mapping Excel
 */

const OrderAction = {
  orderRequested: "Order Requested",
  orderRequestAccepted: "Order Request Accepted",
  orderInternalRoute: "Order Internal Route",
  orderInternalRouteAcknowledged: "Order Internal Route Acknowledged",
  orderExternalRoute: "Order External Route",
  orderExternalRouteAcknowledged: "Order External Route Acknowledged",
  orderCanceled: "Order Canceled",
  orderReplaced: "Order Replaced",
  orderReplaceClientRequested: "Order Replace - Client Requested",
  orderReplaceClientRequestAccepted: "Order Replace - Client Request Accepted",
  orderCancelClientRequested: "Order Cancel - Client Requested",
  orderCancelClientRequestAccepted: "Order Cancel - Client Request Accepted",
  orderExpired: "Order Expired",
  orderExternalRoute2: "Order External Route",
  orderExternallyRoutedAccepted: "Order Externally Routed Accepted",
  orderRejected: "Order Rejected",
  orderSuspended: "Order Suspended",
  doneForDay: "Done for day"
};

const OrderStatus = {
  open: "Open",
  canceled: "Canceled",
  replaced: "Replaced",
  doneForDay: "Done for day",
  expired: "Expired",
  rejected: "Rejected",
  partiallyFilled: "Partially filled",
  filled: "Filled"
};

const OrderCapacity = {
  agency: "Agency",
  proprietary: "Proprietary",
  individual: "Individual",
  principal: "Principal",
  risklessPrincipal: "Riskless Principal",
  agentForOtherMember: "Agent for Other Member"
};

const OrderClientCapacity = {
  agency: "Agency",
  proprietary: "Proprietary",
  individual: "Individual",
  principal: "Principal",
  risklessPrincipal: "Riskless Principal",
  agentForOtherMember: "Agent for Other Member"
};

const OrderSide = {
  buy: "Buy",
  sellLong: "Sell Long",
  buyMinus: "Buy Minus",
  sellPlus: "Sell Plus",
  sellShort: "Sell Short",
  sellShortExempt: "Sell Short Exempt"
};

const OrderManualIndicator = {
  manual: "Manual",
  electronic: "Electronic"
};

const OrderType = {
  market: "Market",
  limit: "Limit",
  stopLoss: "Stop Loss",
  stopLimit: "Stop Limit",
  marketOnClose: "Market On Close",
  pegged: "Pegged",
  forexSwap: "Forex Swap"
};

const OrderTimeInforce = {
  day: "Day",
  goodTillCancel: "Good Till Cancel",
  atTheOpening: "At the Opening",
  immediateOrCancel: "Immediate Or Cancel",
  fillOrKill: "Fill Or Kill",
  goodTillCrossing: "Good Till Crossing",
  goodTillDate: "Good Till Date",
  atTheClose: "At the Close"
};

const OrderAuctionIndicator = {
  none: "None",
  aok: "AOK",
  apcm: "APCM",
  auc: "AUC"
};

const OrderSwapIndicator = {
  none: "None",
  cash: "Cash",
  swap: "Swap"
};

const OrderOptionPutCall = {
  none: "None",
  put: "Put",
  call: "Call"
};

const OrderOptionLegIndicator = {
  none: "None",
  package: "Package",
  leg: "Leg"
};

const OrderNegotiatedIndicator = {
  y: "Y",
  n: "N"
};

const OrderOpenClose = {
  none: "None",
  open: "Open",
  close: "Close"
};

const OrderPackageIndicator = {
  none: "None",
  package: "Package",
  leg: "Leg"
};

const OrderSecondaryOffering = {
  none: "None",
  preipo: "PREIPO",
  postipo: "POSTIPO",
  ipo: "IPO"
};

const OrderParentChildType = {
  p: "P",
  c: "C",
  n: "N"
};

const OrderTradingSession = {
  preOpen: "PRE-OPEN",
  afterHours: "AFTER-HOURS",
  cross2: "CROSS_2",
  tostnet: "TOSTNET",
  tostnet2: "TOSTNET2",
  all: "ALL",
  day: "DAY",
  preSession: "PRE-SESSION",
  postSession: "POST-SESSION"
};

const AtsDisplayIndicator = {
  y: "Y",
  n: "N"
};

const OrderSolicitationFlag = {
  y: "Y",
  n: "N"
};

const RouteRejectedFlag = {
  none: "None",
  y: "Y",
  n: "N"
};

const ExecutionSide = {
  buy: "Buy",
  sellLong: "Sell Long",
  buyMinus: "Buy Minus",
  sellPlus: "Sell Plus",
  sellShort: "Sell Short",
  sellShortExempt: "Sell Short Exempt"
};

const OrderExecutionInstructions = {
  stayOnOfferSide: "Stay on offer side",
  notHeld: "Not Held",
  work: "Work",
  goAlong: "Go along",
  overTheDay: "Over the day",
  held: "Held",
  participateDoNtInitiate: "Participate do nt initiate",
  strictScale: "Strict scale",
  tryToScale: "Try to scale",
  stayOnBidSide: "Stay on bid side",
  noCross: "No cross",
  okToCross: "OK to cross",
  callFirst: "Call first",
  percentOfVolume: "Percent of volume",
  doNotIncrease: "Do not increase",
  doNotReduce: "Do not reduce",
  allOrNone: "All or none",
  reinstateOnSystemFailue: "Reinstate on System Failue",
  institutionsOnly: "Institutions only",
  reinstateOnTradingHalt: "Reinstate on Trading Halt",
  cancelOnTradingHalt: "Cancel on Trading Halt",
  nonNegotiable: "Non-negotiable",
  cancelOnSystemFailure: "Cancel on system failure",
  suspend: "Suspend",
  customerDisplayInstruction: "Customer Display Instruction",
  netting: "Netting",
  tradeAlong: "Trade Along",
  tryToStop: "Try To Stop",
  cancelIfNotBest: "Cancel if not best",
  strictLimit: "Strict Limit",
  ignorePriceValidityChecks: "Ignore Price Validity Checks",
  workToTargetStrategy: "Work to Target Strategy",
  intermarketSweep: "Intermarket Sweep",
  externalRoutingAllowed: "External Routing Allowed",
  externalRoutingNotAllowed: "External Routing Not Allowed",
  imbalanceOnly: "Imbalance Only",
  singleExecutionRequestedForBlockTrade: "Single execution requested for block trade",
  bestExecution: "Best Execution"
};

const OrderAttributes = {
  aggregatedOrder: "Aggregated order",
  orderPendingAllocation: "Order pending allocation",
  liquidityProvisionActivityOrder: "Liquidity provision activity order",
  riskReductionOrder: "Risk reduction order",
  algorithmicOrder: "Algorithmic order",
  systemicInternaliserOrder: "Systemic internaliser order",
  allExecutionsForTheOrderAreToBeSubmittedToAnApa: "All executions for the order are to be submitted to an APA",
  orderExecutionInstructedByClient: "Order execution instructed by client",
  largeInScaleOrder: "Large in scale order",
  hiddenOrder: "Hidden order",
  subjectToEuShareTradingObligation: "Subject to EU share trading obligation",
  subjectToUkShareTradingObligationRepresentativeOrder: "Subject to UK share trading obligation Representative order",
  orderWasOriginatedToRepresentAnOrderReceivedByTheBrokerFromACustomerClient: "Order was originated to represent an order received by the broker from a customer/client",
  linkageType: "Linkage type",
  exemptFromShareTradingObligation: "Exempt from share trading obligation"
};

const OrderRestrictions = {
  programTrade: "Program Trade",
  indexArbitrage: "Index Arbitrage",
  nonIndexArbitrage: "Non-Index Arbitrage",
  marketMaker: "Market Maker",
  foreignEntity: "Foreign Entity",
  externalMarketParticipant: "External Market Participant",
  risklessArbitrage: "Riskless Arbitrage"
};

const OrderInstrumentReference = {
  cusip: "CUSIP",
  sedol: "SEDOL",
  isin: "ISIN",
  ricCode: "RIC Code"
};

const OrderActionInitiated = {
  firm: "Firm",
  exchange: "Exchange",
  client: "Client",
  broker: "Broker"
};

const OrderFlowType = {
  dma: "DMA",
  algo: "Algo",
  sponsoredAccess: "Sponsored Access"
};

// Helper function to validate enum value
const validateEnum = (enumObj, value, enumName) => {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }

  // Convert to string for comparison
  const strValue = value.toString().trim();
  
  // Check if value matches an enum name (case-insensitive)
  const validValues = Object.values(enumObj);
  for (const validValue of validValues) {
    if (validValue.toLowerCase() === strValue.toLowerCase()) {
      return { valid: true, value: validValue };
    }
  }

  // Invalid value - return error with valid options
  return { 
    valid: false, 
    error: `Invalid ${enumName} value: "${value}". Must be one of: ${validValues.join(", ")}`
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
  validateEnum
};
