/**
 * Required fields for order validation
 * These 9 fields are Non-Negotiable and must be present in every order
 */

const REQUIRED_FIELDS = [
  'orderId',
  'orderAction',
  'orderCapacity',
  'orderSide',
  'orderOmsSource',
  'orderPublishingTime',
  'orderType',
  'orderComplianceId',
  'orderOriginationSystem',
];

// Field display names for error messages
const FIELD_DISPLAY_NAMES = {
  orderId: 'Order ID',
  orderAction: 'Order Action',
  orderCapacity: 'Order Capacity',
  orderSide: 'Order Side',
  orderOmsSource: 'Order OMS Source',
  orderPublishingTime: 'Order Publishing Time',
  orderType: 'Order Type',
  orderComplianceId: 'Order Compliance ID',
  orderOriginationSystem: 'Order Origination System',
};

module.exports = {
  REQUIRED_FIELDS,
  FIELD_DISPLAY_NAMES,
};
