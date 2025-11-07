# Excel Upload Template for Orders

## Required Columns

The Excel file must contain the following column headers (case-insensitive):

### Required Field
- **orderid** (Required) - Unique order identifier

### Optional Fields
All other fields are optional:

| Column Name | Data Type | Example |
|------------|-----------|---------|
| userid | Integer | 1 |
| clientid | String | CLIENT001 |
| orderidversion | String | V1 |
| orderidsession | String | SESSION123 |
| orderidinstance | String | INST001 |
| parentorderid | String | PARENT001 |
| cancelreplaceorderid | String | CANCEL001 |
| linkedorderid | String | LINKED001 |
| orderaction | String | NEW |
| orderstatus | String | PENDING |
| ordercapacity | String | AGENCY |
| orderdestination | String | NYSE |
| orderclientref | String | REF001 |
| orderclientrefdetails | String | Client reference details |
| orderexecutingentity | String | ENTITY001 |
| orderbookingentity | String | BOOKING001 |
| orderpositionaccount | String | ACC001 |
| ordersite | String | NY |
| orderclientcapacity | String | PRINCIPAL |
| ordermanualindicator | String | Y |
| orderrequesttime | DateTime | 2025-10-28 10:00:00 |
| ordereventtime | DateTime | 2025-10-28 10:01:00 |
| ordermanualtimestamp | DateTime | 2025-10-28 10:02:00 |
| orderomssource | String | OMS01 |
| orderpublishingtime | DateTime | 2025-10-28 10:03:00 |
| ordertradedate | DateTime | 2025-10-28 |
| orderquantity | Decimal | 1000.50 |
| orderprice | Decimal | 150.25 |
| ordertype | String | LIMIT |
| ordertimeinforce | String | DAY |
| orderexecutioninstruction | String | AON |
| orderattributes | String | Attribute1 |
| orderrestriction | String | None |
| orderauctionindicator | String | N |
| orderswapindicator | String | N |
| orderosi | String | OSI001 |
| orderinstrumentid | String | INST123 |
| orderlinkedinstrumentid | String | LINKED456 |
| ordercurrencyid | String | USD |
| orderflowtype | String | AGGRESSIVE |
| orderalgoinstruction | String | VWAP |
| ordersymbol | String | AAPL |
| orderinstrumentreference | String | ISIN |
| orderinstrumentreferencevalue | String | US0378331005 |
| orderoptionputcall | String | CALL |
| orderoptionstrikeprice | Decimal | 150.00 |
| orderoptionlegindicator | String | N |
| ordercomplicanceid | String | COMP001 |
| orderentityid | String | ENT001 |
| orderexecutingaccount | String | EXEC001 |
| orderclearingaccount | String | CLEAR001 |
| orderclientorderid | String | CLIENT001 |
| orderroutedorderid | String | ROUTE001 |
| ordertradingowner | String | TRADER001 |
| orderextendedattribute | String | Extended attributes JSON |

## Example Excel Format

```
orderid     | ordersymbol | orderquantity | orderprice | orderstatus | ordertype
ORD001      | AAPL        | 100           | 150.50     | PENDING     | LIMIT
ORD002      | GOOGL       | 50            | 2800.00    | EXECUTED    | MARKET
ORD003      | MSFT        | 200           | 350.25     | CANCELLED   | LIMIT
```

## File Requirements

- **File Format**: Excel (.xlsx, .xls) or CSV
- **File Size Limit**: 10MB
- **First Row**: Must contain column headers
- **Data Rows**: Start from row 2 onwards

## Upload via API

**Endpoint**: `POST /api/orders/upload`

**Headers**:
```
Authorization: Bearer <your-api-key>
Content-Type: multipart/form-data
```

**Form Data**:
```
file: <excel-file>
```

## Upload via Swagger

1. Navigate to: `http://localhost:3000/api-docs`
2. Click on "Authorize" button
3. Enter your API key in format: `Bearer <your-api-key>`
4. Go to `/orders/upload` endpoint
5. Click "Try it out"
6. Upload your Excel file
7. Click "Execute"

## Response

```json
{
  "message": "Orders uploaded successfully",
  "batchId": 5,
  "fileName": "orders_october.xlsx",
  "imported": 95,
  "total": 100,
  "failed": 5,
  "errors": [
    {
      "row": 15,
      "error": "Missing required field: orderId"
    }
  ]
}
```

## Notes

- **Every row in Excel creates a new database row** - duplicates are allowed
- Same `orderid` can appear multiple times across different batches
- Each order is linked to its batch via `batchId`
- Date fields accept various formats (ISO, Excel date numbers, etc.)
- The `userid` field will be automatically set to the authenticated user's ID if not provided
- Empty cells are treated as NULL values
