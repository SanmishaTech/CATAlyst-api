/**
 * CAT / Order-related Enum Definitions
 * Converted to numeric-key enum objects for validation compatibility
 */

/** Cat Event */
const CatEvent = {
  1: "MENO",
  2: "MEOA",
  3: "MEIR",
  4: "MEOC",
  5: "MEOR",
  6: "MEOM",
  7: "MEOT",
  8: "MEOF",
  9: "MONO",
};

/** Action Type */
const ActionType = {
  1: "New Record",
  2: "Corrected Record",
  3: "Deleted Record",
  4: "Repair Record",
};

/** Message Type */
const MessageType = {
  1: "Order",
  2: "ROUTE",
  3: "TRADE",
};

/** Department Type */
const DeptType = {
  1: "AGENCY",
  2: "PRINCIPAL",
  3: "RISKLESS",
};

/** Order Side */
const Side = {
  1: "BUY",
  2: "SELL",
};

/** Order Type */
const OrderTypeEnum = {
  1: "MARKET",
  2: "LIMIT",
  3: "OTHER",
};

/** Trading Session */
const TradingSession = {
  1: "REGULAR",
  2: "OPEN",
  3: "CLOSE",
};

/** Account Holder Type */
const AccountHolderType = {
  1: "CUSTOMER",
  2: "FIRM",
};

/** Representative Indicator */
const RepresentativeInd = {
  1: "Y",
  2: "N",
};

/** NBBO Source */
const NbboSource = {
  1: "SIP",
  2: "DIRECT",
};

/** Destination Type */
const DestinationType = {
  1: "IM",
  2: "EXCHANGE",
};

/** Sender Type */
const SenderType = {
  1: "IM",
  2: "ATS",
};

/** Initiator */
const Initiator = {
  1: "FIRM",
  2: "CUSTOMER",
};

/** Capacity */
const Capacity = {
  1: "AGENCY",
  2: "PRINCIPAL",
  3: "RISKLESS",
};

/** Market Center ID */
const MarketCenterID = {
  1: "NYSE",
  2: "NASDAQ",
  3: "OTHER",
};

/** Reporting Exception Code */
const ReportingExceptionCode = {
  1: "NONE",
  2: "EXEMPT",
};

/** Fulfillment Link Type */
const FulfillmentLinkType = {
  1: "ALLOCATION",
  2: "AVERAGE_PRICE",
};

module.exports = {
  ActionType,
  MessageType,
  DeptType,
  Side,
  OrderTypeEnum,
  TradingSession,
  AccountHolderType,
  RepresentativeInd,
  NbboSource,
  DestinationType,
  SenderType,
  Initiator,
  Capacity,
  MarketCenterID,
  ReportingExceptionCode,
  FulfillmentLinkType,
};
