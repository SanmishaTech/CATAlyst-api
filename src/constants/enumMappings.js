/**
 * Enum Mappings - Convert human-readable strings to numeric codes
 * These mappings allow Excel files to use descriptive names instead of numeric codes
 */

const OrderStatusMapping = {
  'pending': 1,
  'open': 1,
  'filled': 2,
  'partially_filled': 3,
  'cancelled': 4,
  'rejected': 5,
  'expired': 6,
  'suspended': 7,
  'replaced': 8,
};

const OrderActionMapping = {
  'new': 1,
  'amend': 2,
  'cancel': 3,
  'replace': 4,
  'cancel_replace': 5,
  'status': 6,
  'pending_cancel': 7,
  'pending_replace': 8,
  'pending_new': 9,
  'pending_amend': 10,
  'pending_status': 11,
  'pending_cancel_replace': 12,
  'expired': 13,
  'trade': 14,
  'trade_correction': 15,
  'trade_cancel': 16,
  'order_status': 17,
  'none': 18,
};

const OrderCapacityMapping = {
  'agency': 1,
  'principal': 2,
  'riskless_principal': 3,
};

const OrderSideMapping = {
  'buy': 1,
  'sell': 2,
  'buy_minus': 3,
  'sell_plus': 4,
  'sell_short': 5,
  'sell_short_exempt': 6,
};

const OrderTypeMapping = {
  'market': 1,
  'limit': 2,
  'stop': 3,
  'stop_limit': 4,
  'trailing_stop': 5,
  'trailing_stop_limit': 6,
  'iceberg': 7,
  'vwap': 8,
};

const OrderTimeInforceMapping = {
  'day': 1,
  'gtc': 2,
  'opg': 3,
  'cls': 4,
  'ioc': 5,
  'fok': 6,
  'gtd': 7,
};

const OrderClientCapacityMapping = {
  'individual': 1,
  'institutional': 2,
  'principal': 3,
  'riskless_principal': 4,
};

const OrderManualIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderAuctionIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderSwapIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderOptionPutCallMapping = {
  'put': 1,
  'call': 2,
};

const OrderOptionLegIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderNegotiatedIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderOpenCloseMapping = {
  'open': 1,
  'close': 2,
};

const OrderPackageIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderSecondaryOfferingMapping = {
  'no': 1,
  'yes': 2,
  'preipo': 3,
  'postipo': 4,
};

const OrderParentChildTypeMapping = {
  'parent': 1,
  'child': 2,
  'child_order': 3,
};

const OrderTradingSessionMapping = {
  'pre_market': 1,
  'pre-open': 1,
  'regular': 2,
  'post_market': 3,
  'post-market': 3,
  'after_hours': 4,
  'extended': 5,
  'halt': 6,
  'close': 7,
  'closed': 8,
  'pre_close': 9,
};

const AtsDisplayIndicatorMapping = {
  'no': 1,
  'yes': 2,
};

const OrderSolicitationFlagMapping = {
  'no': 1,
  'yes': 2,
};

const RouteRejectedFlagMapping = {
  'no': 1,
  'yes': 2,
};

// Order Flow Type (sheet values)
const OrderFlowTypeMapping = {
  'algo': 2,
  'sponsored access': 3,
  'high touch': 4,
  'low touch': 5,
};

const OrderInstrumentReferenceMapping = {
  'isin': 1,
  'cusip': 2,
  'sedol': 3,
  'ric code': 4,
};

// Order Action Initiated (sheet values)
const OrderActionInitiatedMapping = {
  'firm': 1,
  'exchange': 2,
  'client': 3,
  'broker': 4,
};

// Linked Order Type (sheet values)
const LinkedOrderTypeMapping = {
  'representative': 1,
  'manual': 2,
  'merge': 3,
  'aggregated order': 4,
  'synthetic order': 5,
};

// Order InfoBarrier ID (sheet values)
const OrderInfoBarrierIdMapping = {
  'sales': 1,
  'trading': 2,
  'proprietary': 3,
};

/**
 * Convert a string value to its numeric enum code
 * @param {string} value - The string value to convert
 * @param {object} mapping - The mapping object to use
 * @returns {number|string} - The numeric code or original value if not found
 */
const convertStringToEnum = (value, mapping) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  // If already a number, return as-is
  if (typeof value === 'number') {
    return value;
  }

  // Convert to lowercase string for comparison
  const lowerValue = String(value).toLowerCase().trim();

  // Try to find in mapping
  if (mapping[lowerValue]) {
    return mapping[lowerValue];
  }

  // If not found, return original value (validation will catch invalid values)
  return value;
};

module.exports = {
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
  convertStringToEnum,
};
