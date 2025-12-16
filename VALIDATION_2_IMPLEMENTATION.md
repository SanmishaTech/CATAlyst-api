# Validation 2 (Level 2) Implementation Summary

## Overview
Validation 2 has been successfully implemented for both orders and executions. This level of validation runs **after** validation_1 passes (i.e., only for batches where `validation_1 = true`).

---

## Database Changes

### Tables Modified

#### 1. **clients** table
- Added `validation_2` (JSON) - stores Level 2 validation rules for orders
- Added `exe_validation_2` (JSON) - stores Level 2 validation rules for executions

#### 2. **batches** table
- Added `validation_2` (BOOLEAN) - tracks validation_2 status
  - `null` = not yet validated
  - `true` = passed validation_2
  - `false` = failed validation_2
- Added index on `validation_2` column for performance

---

## Implementation Details

### 1. **Service Layer** (`src/services/validationService.js`)

#### New Functions:
- `processValidation2ForBatch(batchId)` - Validates orders using Level 2 rules
- `processExecutionValidation2ForBatch(batchId, batch)` - Validates executions using Level 2 rules

**Key Features:**
- Only processes batches where `validation_1 = true`
- Skips batches already validated (`validation_2 !== null`)
- Uses same dynamic Zod validation as validation_1
- Creates validation error records with proper tracking
- Performs deduplication of validation errors

---

### 2. **Cronjob** (`src/jobs/validation2Cron.js`)

#### Configuration:
- **Enabled via**: `CRON_VALIDATION_2_ENABLED` (default: true)
- **Interval**: `CRON_VALIDATION_2_INTERVAL_MINUTES` (default: 2 minutes in .env)

#### Behavior:
- Runs independently from validation_1 cron
- Queries for batches where:
  - `validation_1 = true` (passed Level 1)
  - `validation_2 = null` (not yet validated at Level 2)
- Processes up to 10 batches per run
- Processes batches in order by ID (oldest first)

#### Functions:
- `initValidation2Cron()` - Initialize the cron job
- `processValidation2Queue()` - Process pending batches
- `triggerValidation2()` - Manual trigger for testing

---

### 3. **API Endpoints** (`src/controllers/clientController.js` & `src/routes/clients.js`)

#### Order Validation 2 Endpoints:

**GET** `/api/clients/:id/validation-2-schema`
- Get the validation_2 schema for orders
- Returns: `{ schema: <JSON object or null> }`

**PUT** `/api/clients/:id/validation-2-schema`
- Update the validation_2 schema for orders
- Request body: `{ schema: <JSON object> }`
- Automatically records in validation_schema_history table

#### Execution Validation 2 Endpoints:

**GET** `/api/clients/:id/execution-validation-2-schema`
- Get the validation_2 schema for executions
- Returns: `{ schema: <JSON object or null> }`

**PUT** `/api/clients/:id/execution-validation-2-schema`
- Update the validation_2 schema for executions
- Request body: `{ schema: <JSON object> }`
- Automatically records in validation_schema_history table

---

## Environment Variables

Add these to `.env` file:

```env
# Validation 2 Cron Settings
CRON_VALIDATION_2_ENABLED=true
CRON_VALIDATION_2_INTERVAL_MINUTES=2
```

---

## Validation Schema Format

Validation schemas use the same format as validation_1. Example:

```json
{
  "orderQuantity": {
    "type": "number",
    "min": 100,
    "minMessage": "Order quantity must be at least 100",
    "optional": false
  },
  "orderPrice": {
    "type": "number",
    "min": 0,
    "minMessage": "Price cannot be negative",
    "optional": true
  },
  "orderType": {
    "type": "enum",
    "values": ["MARKET", "LIMIT", "STOP"],
    "optional": false
  }
}
```

---

## Testing Guide

### 1. **Start the Server**

```bash
cd D:\dir\catalyst\backend
npm start
```

**Expected Console Output:**
```
[Validation Cron] Validation cronjob initialized (runs every 1 minutes)
[Validation 2 Cron] Validation_2 cronjob initialized (runs every 2 minutes)
```

---

### 2. **Set Up Validation 2 Schema**

Use Postman or curl to configure validation rules:

```bash
# Set order validation_2 schema
curl -X PUT http://localhost:5000/api/clients/1/validation-2-schema \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "schema": {
      "orderQuantity": {
        "type": "number",
        "min": 50,
        "minMessage": "Level 2: Quantity must be >= 50"
      }
    }
  }'

# Set execution validation_2 schema
curl -X PUT http://localhost:5000/api/clients/1/execution-validation-2-schema \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "schema": {
      "executionLastQuantity": {
        "type": "number",
        "min": 50,
        "minMessage": "Level 2: Execution quantity must be >= 50"
      }
    }
  }'
```

---

### 3. **Verify Schema Saved**

```bash
# Get order validation_2 schema
curl -X GET http://localhost:5000/api/clients/1/validation-2-schema \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get execution validation_2 schema
curl -X GET http://localhost:5000/api/clients/1/execution-validation-2-schema \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. **Upload Test Data**

Upload order or execution files through the existing upload endpoints.
The flow will be:
1. Data is uploaded and inserted into database
2. Validation 1 cron runs → sets `validation_1` = true/false
3. If `validation_1` = true, validation 2 cron picks it up
4. Validation 2 cron runs → sets `validation_2` = true/false

---

### 5. **Monitor Cron Logs**

Watch the console for log messages:

```
[Validation 2 Cron] Starting validation_2 check...
[Validation 2 Cron] Found 3 batches to validate
[Validation 2] Processing batch 15
[Validation 2] Validating 100 orders for batch 15
[Validation 2] Batch 15 completed: 95 passed, 5 failed - Overall: FAILED
[Validation 2 Cron] Validation_2 check completed
```

---

### 6. **Check Database Results**

```sql
-- Check batch validation status
SELECT id, validation_1, validation_2, status FROM batches;

-- Check validation errors for a specific batch
SELECT * FROM validation_errors 
WHERE batchId = 15 
ORDER BY createdAt DESC;

-- Check which batches are pending validation_2
SELECT id, fileName, validation_1, validation_2 
FROM batches 
WHERE validation_1 = true AND validation_2 IS NULL;
```

---

### 7. **Manual Trigger (Optional)**

You can manually trigger validation_2 by creating a test endpoint or using Node console:

```javascript
const { triggerValidation2 } = require('./src/jobs/validation2Cron');
await triggerValidation2();
```

---

## Validation Flow

```
1. File Upload
   ↓
2. Data Inserted (validation_1 = null, validation_2 = null)
   ↓
3. Validation 1 Cron Runs
   ↓
4. validation_1 = true (if passed) or false (if failed)
   ↓
5. Validation 2 Cron Runs (only if validation_1 = true)
   ↓
6. validation_2 = true (if passed) or false (if failed)
```

---

## Key Differences from Validation 1

| Feature | Validation 1 | Validation 2 |
|---------|-------------|--------------|
| **Runs When** | Immediately after upload | After validation_1 passes |
| **Condition** | `validation_1 IS NULL` | `validation_1 = true AND validation_2 IS NULL` |
| **Cron Interval** | 1 minute (configurable) | 2 minutes (configurable) |
| **Schema Fields** | `validation_1`, `exe_validation_1` | `validation_2`, `exe_validation_2` |
| **Purpose** | Basic field validation | Business logic validation |

---

## Troubleshooting

### Issue: Validation 2 Not Running

**Check:**
1. Is `CRON_VALIDATION_2_ENABLED` set to `true` in .env?
2. Are there batches with `validation_1 = true` and `validation_2 = null`?
3. Is the server running without errors?

**Debug:**
```sql
SELECT COUNT(*) FROM batches 
WHERE validation_1 = true AND validation_2 IS NULL;
```

---

### Issue: Schema Not Saving

**Check:**
1. Is the client ID valid?
2. Is the schema a valid JSON object?
3. Check validation_schema_history table for history records

---

### Issue: All Batches Passing Validation 2

**This is expected if:**
1. No validation_2 schema is configured (defaults to passing)
2. The validation_2 rules are less strict than the data

**To verify:**
```sql
SELECT validation_2, exe_validation_2 FROM clients WHERE id = 1;
```

---

## API Documentation

All endpoints are documented in Swagger at:
```
http://localhost:5000/api-docs
```

Search for "validation-2-schema" to see the new endpoints.

---

## Files Modified/Created

### Created:
- `src/jobs/validation2Cron.js` - Validation 2 cronjob

### Modified:
- `prisma/schema.prisma` - Added validation_2 columns
- `src/services/validationService.js` - Added validation_2 functions
- `src/controllers/clientController.js` - Added validation_2 endpoints
- `src/routes/clients.js` - Added validation_2 routes
- `server.js` - Initialize validation_2 cron
- `.env` - Added validation_2 config
- `.env.example` - Added validation_2 config template

---

## Next Steps

1. ✅ Validation 2 implementation complete
2. 🔄 Test with real data
3. 📝 Configure client-specific validation_2 rules
4. 🎨 Add frontend UI for managing validation_2 schemas (optional)
5. 📊 Monitor validation_2 results in production

---

## Support

If you encounter any issues, check:
1. Server console logs for error messages
2. Database validation_errors table for specific failures
3. validation_schema_history table for schema change history
4. Batch status: `SELECT * FROM batches WHERE validation_2 IS NOT NULL`
