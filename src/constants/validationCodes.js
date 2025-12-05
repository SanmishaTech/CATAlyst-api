/**
 * Validation Code Configuration
 * Standardized error codes for validation errors
 * Format: [CATEGORY]_[TYPE]_[SEVERITY]
 * 
 * Categories:
 * - ORD: Order validation
 * - EXE: Execution validation
 * - FLD: Field validation
 * - REQ: Required field validation
 * - FMT: Format validation
 * - DUP: Duplicate validation
 * - CTX: Context validation
 * - RNG: Range validation
 * - REF: Reference validation
 */

const VALIDATION_CODES = {
  // Required Field Errors
  REQ_MISSING_FIELD: {
    code: 'REQ_001',
    category: 'required',
    severity: 'error',
    message: 'Required field is missing',
    description: 'A mandatory field is not provided'
  },
  REQ_EMPTY_VALUE: {
    code: 'REQ_002',
    category: 'required',
    severity: 'error',
    message: 'Required field has empty value',
    description: 'A mandatory field contains an empty or null value'
  },

  // Format Errors
  FMT_INVALID_FORMAT: {
    code: 'FMT_001',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid format',
    description: 'Field value does not match the expected format'
  },
  FMT_INVALID_DATE: {
    code: 'FMT_002',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid date format',
    description: 'Date field is not in the correct format (YYYY-MM-DD)'
  },
  FMT_INVALID_TIME: {
    code: 'FMT_003',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid time format',
    description: 'Time field is not in the correct format (HH:MM:SS)'
  },
  FMT_INVALID_DECIMAL: {
    code: 'FMT_004',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid decimal format',
    description: 'Decimal field contains invalid characters or format'
  },
  FMT_INVALID_INTEGER: {
    code: 'FMT_005',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid integer format',
    description: 'Integer field contains non-numeric characters'
  },

  // Duplicate Errors
  DUP_DUPLICATE_RECORD: {
    code: 'DUP_001',
    category: 'duplicate',
    severity: 'error',
    message: 'Duplicate record detected',
    description: 'This record already exists in the database'
  },
  DUP_DUPLICATE_ID: {
    code: 'DUP_002',
    category: 'duplicate',
    severity: 'error',
    message: 'Duplicate ID',
    description: 'The ID field value is already used by another record'
  },
  DUP_DUPLICATE_ORDER: {
    code: 'DUP_003',
    category: 'duplicate',
    severity: 'error',
    message: 'Duplicate order',
    description: 'This order has already been submitted'
  },

  // Range/Value Errors
  RNG_VALUE_OUT_OF_RANGE: {
    code: 'RNG_001',
    category: 'context',
    severity: 'error',
    message: 'Value out of range',
    description: 'Field value is outside the acceptable range'
  },
  RNG_NEGATIVE_VALUE: {
    code: 'RNG_002',
    category: 'context',
    severity: 'error',
    message: 'Negative value not allowed',
    description: 'Field cannot contain negative values'
  },
  RNG_ZERO_VALUE: {
    code: 'RNG_003',
    category: 'context',
    severity: 'error',
    message: 'Zero value not allowed',
    description: 'Field cannot contain zero value'
  },

  // Reference/Lookup Errors
  REF_INVALID_REFERENCE: {
    code: 'REF_001',
    category: 'context',
    severity: 'error',
    message: 'Invalid reference',
    description: 'Referenced record does not exist'
  },
  REF_INVALID_ENUM: {
    code: 'REF_002',
    category: 'context',
    severity: 'error',
    message: 'Invalid enum value',
    description: 'Field value is not in the list of allowed values'
  },
  REF_INVALID_CODE: {
    code: 'REF_003',
    category: 'context',
    severity: 'error',
    message: 'Invalid code',
    description: 'Code does not exist in the reference table'
  },

  // Conditional/Context Errors
  CTX_CONDITIONAL_REQUIRED: {
    code: 'CTX_001',
    category: 'context',
    severity: 'error',
    message: 'Conditional field required',
    description: 'This field is required based on the value of another field'
  },
  CTX_CONFLICTING_VALUES: {
    code: 'CTX_002',
    category: 'context',
    severity: 'error',
    message: 'Conflicting values',
    description: 'Field values conflict with each other'
  },
  CTX_INVALID_COMBINATION: {
    code: 'CTX_003',
    category: 'context',
    severity: 'error',
    message: 'Invalid combination',
    description: 'The combination of field values is not allowed'
  },

  // Order-Specific Errors
  ORD_INVALID_ORDER_ID: {
    code: 'ORD_001',
    category: 'syntax',
    severity: 'error',
    message: 'Invalid order ID',
    description: 'Order ID format is invalid'
  },
  ORD_INVALID_SIDE: {
    code: 'ORD_002',
    category: 'context',
    severity: 'error',
    message: 'Invalid order side',
    description: 'Order side must be BUY or SELL'
  },
  ORD_INVALID_STATUS: {
    code: 'ORD_003',
    category: 'context',
    severity: 'error',
    message: 'Invalid order status',
    description: 'Order status is not valid'
  },
  ORD_INVALID_QUANTITY: {
    code: 'ORD_004',
    category: 'context',
    severity: 'error',
    message: 'Invalid order quantity',
    description: 'Order quantity must be greater than zero'
  },
  ORD_INVALID_PRICE: {
    code: 'ORD_005',
    category: 'context',
    severity: 'error',
    message: 'Invalid order price',
    description: 'Order price must be greater than zero'
  },
  ORD_MISSING_COMPLIANCE_ID: {
    code: 'ORD_006',
    category: 'required',
    severity: 'error',
    message: 'Missing compliance ID',
    description: 'Compliance ID is required for all orders'
  },
};

/**
 * Get validation code by key
 * @param {string} key - The validation code key
 * @returns {object} Validation code object with code, category, severity, message, description
 */
const getValidationCode = (key) => {
  return VALIDATION_CODES[key] || {
    code: 'UNKNOWN',
    category: 'context',
    severity: 'error',
    message: 'Unknown validation error',
    description: 'An unknown validation error occurred'
  };
};

/**
 * Get validation code by code string
 * @param {string} codeString - The validation code string (e.g., 'REQ_001')
 * @returns {object} Validation code object
 */
const getValidationCodeByString = (codeString) => {
  const found = Object.values(VALIDATION_CODES).find(v => v.code === codeString);
  return found || {
    code: 'UNKNOWN',
    category: 'context',
    severity: 'error',
    message: 'Unknown validation error',
    description: 'An unknown validation error occurred'
  };
};

/**
 * Get all validation codes
 * @returns {object} All validation codes
 */
const getAllValidationCodes = () => {
  return VALIDATION_CODES;
};

/**
 * Get validation codes by category
 * @param {string} category - The category (required, syntax, duplicate, context)
 * @returns {array} Array of validation codes in that category
 */
const getValidationCodesByCategory = (category) => {
  return Object.values(VALIDATION_CODES).filter(v => v.category === category);
};

module.exports = {
  VALIDATION_CODES,
  getValidationCode,
  getValidationCodeByString,
  getAllValidationCodes,
  getValidationCodesByCategory
};
