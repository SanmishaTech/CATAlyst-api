# Order Validation System

## Overview
The validation system automatically validates orders against client-specific validation schemas stored in the database. A cronjob runs every 1 minute to process batches that haven't been validated yet.

## Architecture

### Database Schema Changes

#### 1. **Client Table** - `validation_1` column
- **Type**: JSON (nullable)
- **Purpose**: Stores the zod validation schema configuration for each client
- **Format**: JSON object defining validation rules for order fields

Example schema structure:
```json
{
  "orderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": false
  },
  "orderQuantity": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderType": {
    "type": "enum",
    "values": ["Market", "Limit", "Stop"],
    "optional": false
  },
  "contactEmailId": {
    "type": "string",
    "email": true,
    "optional": true
  }
}
```

#### 2. **Batch Table** - `validation_1` column
- **Type**: Boolean
- **Default**: false
- **Purpose**: Tracks whether the batch has been validated
- **Note**: Removed `fileName` and `fileSize` columns

#### 3. **Validation Table** (New)
- `id`: Auto-increment primary key
- `orderId`: Foreign key to Order table
- `validation`: JSON column storing validation results
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

Validation result format:
```json
{
  "success": true/false,
  "errors": [
    {
      "field": "orderQuantity",
      "message": "Must be a positive number",
      "code": "too_small"
    }
  ],
  "validatedAt": "2025-11-06T12:00:00.000Z"
}
```

## How It Works

### 1. Cronjob Execution (Every 1 Minute)
The cronjob (`src/jobs/validationCron.js`) runs every minute and:
1. Queries for batches where `validation_1 = false`
2. Processes up to 10 batches per run to avoid overload
3. For each batch:
   - Retrieves the user's clientId
   - Fetches the client's validation schema from `clients.validation_1`
   - Retrieves all orders in the batch
   - Validates each order against the schema
   - Stores validation results in the `validations` table
   - Marks the batch as validated (`validation_1 = true`)

### 2. Validation Service (`src/services/validationService.js`)
The validation service:
- Dynamically constructs Zod schemas from JSON configuration
- Supports multiple field types: string, number, boolean, date, enum
- Handles validation rules: min/max, email, regex, optional, nullable
- Returns structured validation results with error details

### 3. Validation Schema Types

#### String Validations
```json
{
  "fieldName": {
    "type": "string",
    "min": 1,
    "max": 100,
    "email": true,
    "regex": "^[A-Z]+$",
    "regexMessage": "Must be uppercase letters only",
    "optional": false
  }
}
```

#### Number Validations
```json
{
  "fieldName": {
    "type": "number",
    "min": 0,
    "max": 1000,
    "int": true,
    "optional": false
  }
}
```

#### Enum Validations
```json
{
  "fieldName": {
    "type": "enum",
    "values": ["Option1", "Option2", "Option3"],
    "optional": false
  }
}
```

#### Date Validations
```json
{
  "fieldName": {
    "type": "date",
    "datetimeMessage": "Invalid datetime format",
    "optional": true
  }
}
```

## Usage

### Setting Up Client Validation Schema
Update a client's validation schema via API:
```javascript
PATCH /api/clients/:id
{
  "validation_1": {
    "orderId": {
      "type": "string",
      "min": 1,
      "max": 128
    },
    "orderQuantity": {
      "type": "number",
      "min": 0
    }
  }
}
```

### Checking Validation Results
Query the validations table to see results:
```javascript
GET /api/orders/:orderId/validations
```

### Manual Trigger (for Testing)
```javascript
const { triggerValidation } = require('./src/jobs/validationCron');
await triggerValidation();
```

## Workflow

1. **Order Import**: When orders are imported, a new batch is created with `validation_1 = false`
2. **Cronjob Detection**: Within 1 minute, the cronjob detects the unvalidated batch
3. **Schema Retrieval**: The cronjob retrieves the client's validation schema
4. **Validation**: Each order in the batch is validated
5. **Result Storage**: Validation results (success/failure with errors) are stored in the `validations` table
6. **Batch Update**: The batch is marked as validated (`validation_1 = true`)

## Error Handling

- If a batch has no associated client, it's marked as validated immediately
- If a client has no validation schema, the batch is marked as validated
- Individual order validation errors don't stop the batch processing
- Cronjob continues processing other batches if one fails

## Performance Considerations

- Processes max 10 batches per minute
- Uses sequential processing to avoid database overload
- Includes locking mechanism to prevent concurrent runs
- Logs all operations for monitoring

## Monitoring

Check logs for validation activity:
- `[Validation Cron]` - Cronjob execution logs
- `[Validation]` - Validation service logs

## Migration Required

After schema changes, run:
```bash
npx prisma migrate dev --name add_validation_system
```

Then regenerate Prisma client:
```bash
npx prisma generate
```
