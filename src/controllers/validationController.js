const { validateOrder, validateOrderBatch, REQUIRED_FIELDS } = require('../utils/orderValidator');

/**
 * Get list of required fields
 * @route GET /api/validation/required-fields
 */
exports.getRequiredFields = (req, res) => {
  res.json({
    success: true,
    requiredFields: REQUIRED_FIELDS,
    count: REQUIRED_FIELDS.length,
  });
};

/**
 * Validate a single order
 * @route POST /api/validation/validate-order
 */
exports.validateSingleOrder = (req, res) => {
  const { orderData } = req.body;

  if (!orderData) {
    return res.status(400).json({
      success: false,
      error: 'orderData is required',
    });
  }

  const validation = validateOrder(orderData);

  res.json({
    success: true,
    valid: validation.valid,
    missingFields: validation.missingFields,
    errors: validation.errors,
  });
};

/**
 * Validate multiple orders (batch)
 * @route POST /api/validation/validate-batch
 */
exports.validateBatch = (req, res) => {
  const { orders } = req.body;

  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({
      success: false,
      error: 'orders array is required',
    });
  }

  const validation = validateOrderBatch(orders);

  res.json({
    success: true,
    summary: validation.summary,
    validOrders: validation.validOrders,
    invalidOrders: validation.invalidOrders,
  });
};
