/**
 * Enum Mappings - Convert human-readable strings to numeric codes
 * These mappings allow Excel files to use descriptive names instead of numeric codes
 */

const OrderStatusMapping = {
  'open': 1,
  'pending': 1,
  'canceled': 2,
  'cancelled': 2,
  'replaced': 3,
  'done for day': 4,
  'done_for_day': 4,
  'expired': 5,
  'rejected': 6,
  'partially filled': 7,
  'partially_filled': 7,
  'partial': 7,
  'filled': 8,
};

const OrderActionMapping = {
  'order requested': 1,
  'requested': 1,
  'new': 1,
  'order request accepted': 2,
  'order internal route': 3,
  'order internal route acknowledged': 4,
  'order external route': 5,
  'order external route acknowledged': 6,
  'order canceled': 7,
  'order cancelled': 7,
  'cancel': 7,
  'order replaced': 8,
  'replace': 8,
  'order replace - client requested': 9,
  'order replace - client request accepted': 10,
  'order cancel - client requested': 11,
  'order cancel - client request accepted': 12,
  'order expired': 13,
  'expired': 13,
  'order rejected': 14,
  'rejected': 14,
  'order suspended': 15,
  'suspended': 15,
  'done for day': 16,
  'done_for_day': 16,
};

const OrderCapacityMapping = {
  'agency': 1,
  'proprietary': 2,
  'individual': 3,
  'principal': 4,
  'riskless principal': 5,
  'riskless_principal': 5,
  'agent for other member': 6,
  'agent_for_other_member': 6,
};

const OrderSideMapping = {
  'buy': 1,
  'sell': 2,
  'sell long': 2,
  'buy_minus': 3,
  'buy minus': 3,
  'sell_plus': 4,
  'sell plus': 4,
  'sell_short': 5,
  'sell short': 5,
  'sell_short_exempt': 6,
  'sell short exempt': 6,
};

const OrderTypeMapping = {
  'market': 1,
  'limit': 2,
  'stop loss': 3,
  'stop': 3,
  'stop_limit': 4,
  'stop limit': 4,
  'market on close': 5,
  'pegged': 6,
  'forex swap': 7,
};

const OrderTimeInforceMapping = {
  'day': 1,
  'gtc': 2,
  'good till cancel': 2,
  'good_till_cancel': 2,
  'at the opening': 3,
  'opg': 3,
  'immediate or cancel': 4,
  'immediate_or_cancel': 4,
  'ioc': 4,
  'fill or kill': 5,
  'fill_or_kill': 5,
  'fok': 5,
  'good till crossing': 6,
  'good_till_crossing': 6,
  'good till date': 7,
  'good_till_date': 7,
  'gtd': 7,
  'at the close': 8,
  'at_the_close': 8,
  'close': 8,
  'good till month': 9,
  'good_till_month': 9,
  'immediate or return': 10,
  'immediate_or_return': 10,
  'good till time': 11,
  'good_till_time': 11,
};

const OrderClientCapacityMapping = {
  'agency': 1,
  'proprietary': 2,
  'individual': 3,
  'principal': 4,
  'riskless principal': 5,
  'riskless_principal': 5,
  'agent for other member': 6,
  'agent_for_other_member': 6,
};

const OrderManualIndicatorMapping = {
  'manual': 1,
  'electronic': 2,
};

const OrderAuctionIndicatorMapping = {
  'none': 0,
  'null': 0,
  'no': 0,
  'aok': 1,
  'auction or kill': 1,
  'apcm': 2,
  'auc': 3,
  'auction': 3,
};

const OrderSwapIndicatorMapping = {
  'none': 0,
  'null': 0,
  'no': 0,
  'cash': 1,
  'swap': 2,
};

const OrderOptionPutCallMapping = {
  'none': 0,
  'null': 0,
  'put': 1,
  'call': 2,
};

const OrderOptionLegIndicatorMapping = {
  'none': 0,
  'null': 0,
  'package': 1,
  'leg': 2,
};

const OrderNegotiatedIndicatorMapping = {
  'y': 1,
  'yes': 1,
  'n': 2,
  'no': 2,
  '3': null,
};

const OrderOpenCloseMapping = {
  'none': 0,
  'null': 0,
  'open': 1,
  'close': 2,
};

const OrderPackageIndicatorMapping = {
  'none': 0,
  'null': 0,
  'package': 1,
  'leg': 2,
};

const OrderSecondaryOfferingMapping = {
  'none': 1,
  'null': 1,
  'preipo': 2,
  'postipo': 3,
  'ipo': 4,
};

const OrderParentChildTypeMapping = {
  'parent': 1,
  'p': 1,
  'child': 2,
  'c': 2,
  'child_order': 2,
  'standalone': 3,
  'n': 3,
};

const OrderTradingSessionMapping = {
  'pre_market': 1,
  'pre-market': 1,
  'pre_open': 1,
  'pre-open': 1,
  'preopen': 1,
  'after_hours': 2,
  'after-hours': 2,
  'post_market': 2,
  'post-market': 2,
  'cross_2': 3,
  'cross2': 3,
  'tostnet': 4,
  'tostnet2': 5,
  'all': 6,
  'day': 7,
  'regular': 7,
  'pre_session': 8,
  'pre-session': 8,
  'post_session': 9,
  'post-session': 9,
};

const AtsDisplayIndicatorMapping = {
  'y': 1,
  'yes': 1,
  'n': 2,
  'no': 2,
};

const OrderSolicitationFlagMapping = {
  'y': 1,
  'yes': 1,
  'n': 2,
  'no': 2,
};

const RouteRejectedFlagMapping = {
  'none': 0,
  'null': 0,
  'y': 1,
  'yes': 1,
  'n': 2,
  'no': 2,
};

// Order Flow Type (sheet values)
const OrderFlowTypeMapping = {
  'dma': 1,
  'algo': 2,
  'sponsored access': 3,
  'high touch': 4,
  'low touch': 5,
};

const OrderInstrumentReferenceMapping = {
  'cusip': 1,
  'sedol': 2,
  'isin': 3,
  'ric code': 4,
  'ric': 4,
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
  'properitary': 3,
  'clientaccess': 1,
  'client access': 1,
  'principalflow': 3,
  'principal flow': 3,
  'none': 0,
  'null': 0,
};

/**
 * Convert a string value to its numeric enum code
 * @param {string|number|null} value - The string value to convert
 * @param {object} mapping - The mapping object to use
 * @returns {number|string|null} - The numeric code or original value if not found
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

  // Try to find in mapping (supports 0 values)
  if (Object.prototype.hasOwnProperty.call(mapping, lowerValue)) {
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
  LinkedOrderTypeMapping,
  OrderInfoBarrierIdMapping,
  convertStringToEnum,
};
