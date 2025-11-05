const { REQUIRED_FIELDS, FIELD_DISPLAY_NAMES } = require('../config/requiredFields');

/**
 * Validate a single order against required fields
 * @param {Object} orderData - Order data to validate
 * @returns {Object} - { valid: boolean, missingFields: Array, errors: Array }
 */
function validateOrder(orderData) {
  const missingFields = [];
  const errors = [];

  REQUIRED_FIELDS.forEach((fieldName) => {
    const value = orderData[fieldName];
    
    // Check if field is missing, null, undefined, or empty string
    if (value === null || value === undefined || value === '') {
      const displayName = FIELD_DISPLAY_NAMES[fieldName] || fieldName;
      
      missingFields.push({
        fieldName,
        displayName,
        reason: 'Required field (Non-Negotiable)',
      });
      
      errors.push(`Missing required field: ${displayName}`);
    }
  });

  return {
    valid: errors.length === 0,
    missingFields,
    errors,
  };
}

/**
 * Validate multiple orders (batch)
 * @param {Array} orders - Array of order objects
 * @returns {Object} - { validOrders: Array, invalidOrders: Array, summary: Object }
 */
function validateOrderBatch(orders) {
  const validOrders = [];
  const invalidOrders = [];

  orders.forEach((order, index) => {
    const validation = validateOrder(order);

    if (validation.valid) {
      validOrders.push({
        index,
        data: order,
      });
    } else {
      invalidOrders.push({
        index,
        data: order,
        errors: validation.errors,
        missingFields: validation.missingFields,
      });
    }
  });

  return {
    validOrders,
    invalidOrders,
    summary: {
      total: orders.length,
      valid: validOrders.length,
      invalid: invalidOrders.length,
    },
  };
}

module.exports = {
  validateOrder,
  validateOrderBatch,
  REQUIRED_FIELDS,
  FIELD_DISPLAY_NAMES,
};
