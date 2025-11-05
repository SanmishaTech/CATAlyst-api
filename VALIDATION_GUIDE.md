# Order Validation System

## Overview

Simple validation system that enforces **9 required fields** for every order. All other fields are optional.

## Required Fields (Non-Negotiable)

These 9 fields **must be present** in every order:

1. ✅ **orderId** - Order ID
2. ✅ **orderAction** - Order Action
3. ✅ **orderCapacity** - Order Capacity
4. ✅ **orderSide** - Order Side (BUY/SELL)
5. ✅ **orderOmsSource** - Order OMS Source
6. ✅ **orderPublishingTime** - Order Publishing Time
7. ✅ **orderType** - Order Type (Market/Limit/etc.)
8. ✅ **orderComplianceId** - Order Compliance ID
9. ✅ **orderOriginationSystem** - Order Origination System

## All Other Fields = Optional ⚪

The remaining 92+ fields can be empty or missing.

---

## API Endpoints

### 1. Get Required Fields List

```http
GET /api/validation/required-fields
```

**Response:**
```json
{
  "success": true,
  "requiredFields": [
    "orderId",
    "orderAction",
    "orderCapacity",
    "orderSide",
    "orderOmsSource",
    "orderPublishingTime",
    "orderType",
    "orderComplianceId",
    "orderOriginationSystem"
  ],
  "count": 9
}
```

### 2. Validate Single Order

```http
POST /api/validation/validate-order
Content-Type: application/json

{
  "orderData": {
    "orderId": "ORD-123",
    "orderAction": "NEW",
    "orderCapacity": "AGENCY",
    "orderSide": "BUY",
    "orderOmsSource": "TradingSystem",
    "orderPublishingTime": "2025-11-05T10:00:00Z",
    "orderType": "MARKET",
    "orderComplianceId": "COMP-001",
    "orderOriginationSystem": "OMS-1"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "valid": true,
  "missingFields": [],
  "errors": []
}
```

**Error Response (Missing Fields):**
```json
{
  "success": true,
  "valid": false,
  "missingFields": [
    {
      "fieldName": "orderId",
      "displayName": "Order ID",
      "reason": "Required field (Non-Negotiable)"
    },
    {
      "fieldName": "orderType",
      "displayName": "Order Type",
      "reason": "Required field (Non-Negotiable)"
    }
  ],
  "errors": [
    "Missing required field: Order ID",
    "Missing required field: Order Type"
  ]
}
```

### 3. Validate Batch of Orders

```http
POST /api/validation/validate-batch
Content-Type: application/json

{
  "orders": [
    {
      "orderId": "ORD-001",
      "orderAction": "NEW",
      ...
    },
    {
      "orderId": "ORD-002",
      "orderAction": "CANCEL",
      ...
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 10,
    "valid": 8,
    "invalid": 2
  },
  "validOrders": [
    {
      "index": 0,
      "data": { ... }
    }
  ],
  "invalidOrders": [
    {
      "index": 5,
      "data": { ... },
      "errors": ["Missing required field: Order ID"],
      "missingFields": [ ... ]
    }
  ]
}
```

---

## Usage in Code

### Validate in Controller

```javascript
const { validateOrder } = require('../utils/orderValidator');

async function uploadOrders(req, res) {
  const { orders } = req.body;
  
  // Validate each order
  const invalidOrders = [];
  const validOrders = [];
  
  orders.forEach((order, index) => {
    const validation = validateOrder(order);
    
    if (!validation.valid) {
      invalidOrders.push({
        index,
        order,
        errors: validation.errors
      });
    } else {
      validOrders.push(order);
    }
  });
  
  if (invalidOrders.length > 0) {
    return res.status(400).json({
      success: false,
      message: `${invalidOrders.length} orders failed validation`,
      invalidOrders
    });
  }
  
  // Process valid orders...
}
```

### Use as Middleware

```javascript
const { validateOrder } = require('../utils/orderValidator');

function validateOrderMiddleware(req, res, next) {
  if (req.body.orders && Array.isArray(req.body.orders)) {
    const firstInvalidOrder = req.body.orders.find(order => {
      const validation = validateOrder(order);
      return !validation.valid;
    });
    
    if (firstInvalidOrder) {
      const validation = validateOrder(firstInvalidOrder);
      return res.status(400).json({
        success: false,
        error: 'Order validation failed',
        errors: validation.errors
      });
    }
  }
  
  next();
}

// Use in route
router.post('/orders/upload', validateOrderMiddleware, uploadController);
```

---

## Validation Logic

```javascript
// From src/utils/orderValidator.js

function validateOrder(orderData) {
  const REQUIRED_FIELDS = [
    'orderId',
    'orderAction',
    'orderCapacity',
    'orderSide',
    'orderOmsSource',
    'orderPublishingTime',
    'orderType',
    'orderComplianceId',
    'orderOriginationSystem'
  ];
  
  const missingFields = [];
  
  REQUIRED_FIELDS.forEach(field => {
    const value = orderData[field];
    
    // Check if missing, null, undefined, or empty
    if (value === null || value === undefined || value === '') {
      missingFields.push(field);
    }
  });
  
  return {
    valid: missingFields.length === 0,
    missingFields,
    errors: missingFields.map(f => `Missing required field: ${f}`)
  };
}
```

---

## Testing

### Test with cURL

```bash
# Get required fields
curl http://localhost:3000/api/validation/required-fields

# Validate a single order (valid)
curl -X POST http://localhost:3000/api/validation/validate-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderData": {
      "orderId": "ORD-123",
      "orderAction": "NEW",
      "orderCapacity": "AGENCY",
      "orderSide": "BUY",
      "orderOmsSource": "TradingSystem",
      "orderPublishingTime": "2025-11-05T10:00:00Z",
      "orderType": "MARKET",
      "orderComplianceId": "COMP-001",
      "orderOriginationSystem": "OMS-1"
    }
  }'

# Validate a single order (invalid - missing fields)
curl -X POST http://localhost:3000/api/validation/validate-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderData": {
      "orderId": "ORD-123"
    }
  }'
```

---

## Files Structure

```
src/
├── config/
│   └── requiredFields.js          # List of 9 required fields
├── utils/
│   └── orderValidator.js          # Validation logic
├── controllers/
│   └── validationController.js    # API endpoints
└── routes/
    └── validation.js              # Routes
```

---

## Key Points

✅ **Simple**: Only 9 fields are required  
✅ **Fast**: No database queries needed  
✅ **Clear**: Explicit list of required fields  
✅ **Flexible**: Easy to add/remove fields from list  
✅ **No Setup**: No database tables or seeding needed  

---

## Future Enhancements

If you need to make different fields required per client later, you can:

1. Create `client_field_requirements` table
2. Store client-specific overrides
3. Update validation logic to check database

But for now, this simple approach works perfectly! 🎯
