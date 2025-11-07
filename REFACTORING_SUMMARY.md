# Orders Upload API Refactoring Summary

## Changes Made

### Overview
Consolidated two separate upload endpoints (`/orders/upload` for Excel and `/orders/upload-json` for JSON) into a single unified endpoint `/orders/upload` that handles both Excel and JSON uploads using a JSON validation wrapper.

---

## Modified Files

### 1. `src/controllers/orderController.js`

#### Added Functions:
- **`validateAndNormalizeOrder(orderData, userId, batchId, clientId)`**
  - Central validation and normalization function
  - Takes raw order data and returns normalized order object
  - Handles all 101+ order fields with proper defaults
  - Supports field name variations (e.g., `cancelReplaceOrderId` vs `cancelreplaceOrderId`)

- **`parseExcelToJson(filePath)`**
  - Parses Excel file and converts to JSON array format
  - Uses existing field mapping logic
  - Returns `{ orders, errors }` object
  - Validates required `orderId` column
  - Handles data type conversions (integers, decimals, strings)

#### Modified Functions:
- **`uploadOrders(req, res, next)`**
  - Now handles BOTH Excel file uploads AND JSON body uploads
  - Detects upload type based on `req.file` (Excel) or `req.body.orders` (JSON)
  - For Excel: parses to JSON using `parseExcelToJson()`, then processes
  - For JSON: directly uses `req.body.orders`
  - All orders validated through `validateAndNormalizeOrder()` wrapper
  - Single code path for database insertion
  - Consistent error handling for both formats

#### Removed Functions:
- **`uploadOrdersJson()`** - Functionality merged into unified `uploadOrders()`

---

### 2. `src/routes/orders.js`

#### Modified Routes:
- **`POST /orders/upload`**
  - Updated Swagger documentation to reflect dual functionality
  - Now accepts both `multipart/form-data` (Excel) and `application/json` (JSON)
  - Comprehensive documentation for both upload methods
  - Simplified examples in Swagger UI

#### Removed Routes:
- **`POST /orders/upload-json`** - Endpoint removed, functionality available via `/orders/upload`

---

## Architecture Changes

### Before:
```
┌─────────────────┐         ┌──────────────────┐
│ Excel Upload    │────────>│  uploadOrders()  │
│ /orders/upload  │         │  - Parse Excel   │
└─────────────────┘         │  - Map fields    │
                            │  - Insert DB     │
                            └──────────────────┘

┌─────────────────┐         ┌──────────────────┐
│ JSON Upload     │────────>│uploadOrdersJson()│
│/orders/upload-  │         │  - Map fields    │
│     json        │         │  - Insert DB     │
└─────────────────┘         └──────────────────┘
```

### After:
```
                            ┌──────────────────────────┐
┌─────────────────┐         │    uploadOrders()        │
│ Excel Upload    │────────>│  ┌────────────────────┐  │
│ /orders/upload  │         │  │parseExcelToJson()  │  │
└─────────────────┘         │  └─────────┬──────────┘  │
                            │            │             │
┌─────────────────┐         │            ▼             │
│ JSON Upload     │────────>│  ┌────────────────────┐  │
│ /orders/upload  │         │  │validateAndNormalize│  │
└─────────────────┘         │  │     Order()        │  │
                            │  │  (JSON wrapper)    │  │
                            │  └─────────┬──────────┘  │
                            │            │             │
                            │            ▼             │
                            │       Insert DB          │
                            └──────────────────────────┘
```

---

## Benefits

1. **Single Endpoint**: Clients only need to use `/orders/upload` for all upload types
2. **Code Reuse**: Excel parsing leverages JSON validation logic (DRY principle)
3. **Consistency**: Both upload methods use identical validation and normalization
4. **Maintainability**: Single code path reduces bugs and simplifies updates
5. **API Simplicity**: Fewer endpoints to document and maintain

---

## Usage Examples

### Excel Upload (unchanged)
```bash
curl -X POST http://localhost:3000/api/orders/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@orders.xlsx"
```

### JSON Upload (new endpoint path)
```bash
curl -X POST http://localhost:3000/api/orders/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {
        "orderId": "ORD-001",
        "orderSymbol": "AAPL",
        "orderPrice": 150.50,
        "orderQuantity": 100
      }
    ]
  }'
```

---

## Testing Checklist

- [ ] Test Excel file upload via `/orders/upload`
- [ ] Test JSON body upload via `/orders/upload`
- [ ] Verify error handling for missing `orderId`
- [ ] Verify batch creation and tracking
- [ ] Verify clientId is set correctly based on user role
- [ ] Test with malformed Excel files
- [ ] Test with invalid JSON payload
- [ ] Verify Swagger documentation displays correctly
- [ ] Test field name variations (camelCase, snake_case)
- [ ] Verify all 101+ order fields are properly mapped

---

## Breaking Changes

### ⚠️ IMPORTANT
The endpoint `/orders/upload-json` has been **removed**. 

**Migration Guide:**
- Change all requests from `POST /orders/upload-json` to `POST /orders/upload`
- Request body format remains identical (no changes needed)
- Response format remains identical

---

## Notes

- The `uploadOrdersJson` function was removed from `orderController.js`
- Excel parsing still uses existing field mapping dictionary
- Both upload types create batch records for tracking
- Error handling improved with consistent cleanup logic
- File cleanup happens immediately after Excel parsing
