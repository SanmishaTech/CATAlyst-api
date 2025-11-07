# Batch Tracking Feature

## Overview

The batch tracking system monitors and manages bulk order uploads. Every Excel upload creates a batch record that tracks the import process and stores metadata.

## How It Works

### 1. Upload Process

When you upload an Excel file via `/api/orders/upload`:

```
1. Batch Created (status: "processing")
   ↓
2. Excel Parsed
   ↓
3. Orders Inserted (with batchId)
   ↓
4. Batch Updated (status: "completed" or "failed")
```

### 2. Batch Record

Each batch contains:
- **fileName**: Original Excel file name
- **fileSize**: Size in bytes
- **status**: `processing`, `completed`, or `failed`
- **totalOrders**: Total orders in file
- **successfulOrders**: Successfully imported
- **failedOrders**: Failed to import
- **errorLog**: JSON of parsing errors
- **importedAt**: Start timestamp
- **completedAt**: End timestamp

### 3. Relationships

```
User (1) ──── (Many) Batch (1) ──── (Many) Orders
```

Each order has a `batchId` linking it to its upload batch.

## API Endpoints

### List Batches
```http
GET /api/batches?page=1&limit=20&status=completed
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "batches": [
    {
      "id": 1,
      "fileName": "october_trades.xlsx",
      "fileSize": 245678,
      "status": "completed",
      "totalOrders": 250,
      "successfulOrders": 248,
      "failedOrders": 2,
      "successRate": "99.20",
      "duration": 5,
      "importedAt": "2025-10-29T08:00:00Z",
      "completedAt": "2025-10-29T08:00:05Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Get Batch Details
```http
GET /api/batches/1
Authorization: Bearer <api-key>
```

**Response includes:**
- Complete batch information
- User details
- Parsed error log (if any)
- Statistics (success rate, duration)

### Get Batch Orders
```http
GET /api/batches/1/orders?page=1&limit=50
Authorization: Bearer <api-key>
```

**Returns all orders from that specific batch.**

### Delete Batch
```http
DELETE /api/batches/1
Authorization: Bearer <api-key>
```

**⚠️ Warning:** This deletes the batch AND all its orders (cascade delete).

### Batch Statistics
```http
GET /api/batches/stats
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "totalBatches": 45,
  "completedBatches": 42,
  "failedBatches": 3,
  "processingBatches": 0,
  "totalOrdersImported": 12350,
  "averageSuccessRate": 98.5,
  "recentBatches": [...]
}
```

## Use Cases

### 1. Audit Trail
Track who uploaded what and when:
```sql
SELECT b.fileName, b.totalOrders, u.name, b.importedAt
FROM batches b
JOIN users u ON b.userId = u.id
ORDER BY b.importedAt DESC;
```

### 2. Rollback Bad Import
If you uploaded wrong data:
```http
DELETE /api/batches/123
```
This removes the batch and all 250 orders from that upload.

### 3. Error Analysis
View which rows failed and why:
```http
GET /api/batches/123
```
Check the `errorLog` field for detailed errors.

### 4. Performance Monitoring
Track import times:
```javascript
duration = (completedAt - importedAt) / 1000  // seconds
```

## Error Handling

### Batch Status

| Status | Description |
|--------|-------------|
| `processing` | Upload in progress |
| `completed` | Successfully processed |
| `failed` | Upload failed |

### Error Log Format

```json
{
  "parseErrors": [
    {
      "row": 45,
      "error": "Missing required field: orderId"
    }
  ]
}
```

## Database Schema

```prisma
model Batch {
  id                Int       @id @default(autoincrement())
  userId            Int
  fileName          String
  fileSize          Int?
  totalOrders       Int       @default(0)
  successfulOrders  Int       @default(0)
  failedOrders      Int       @default(0)
  status            String    @default("processing")
  errorLog          String?   @db.Text
  importedAt        DateTime  @default(now())
  completedAt       DateTime?
  
  user              User      @relation(...)
  orders            Order[]
}

model Order {
  batchId           Int  // Links to batch
  batch             Batch @relation(...)
}
```

## Benefits

✅ **Traceability**: Know origin of every order
✅ **Recovery**: Easy rollback of bad uploads
✅ **Analytics**: Success rates, performance metrics
✅ **Debugging**: Detailed error logs
✅ **Compliance**: Audit trail for imports

## Migration from Old System

If you have existing orders without `batchId`, run:

```javascript
// Create legacy batch
const legacyBatch = await prisma.batch.create({
  data: {
    userId: 1,
    fileName: "legacy_import",
    totalOrders: existingCount,
    status: "completed"
  }
});

// Link existing orders
await prisma.order.updateMany({
  where: { batchId: null },
  data: { batchId: legacyBatch.id }
});
```
