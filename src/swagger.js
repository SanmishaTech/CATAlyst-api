const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const express = require("express");

const router = express.Router();
//yash
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Catalyst API",
      version: "1.0.0",
      description: `# Catalyst API Documentation

> A comprehensive Node.js REST API for order management and batch processing.

---

## 📚 Variable Documentation

**Complete reference guide for all environment variables, database models, and configuration settings.**

This section provides detailed documentation for:
- ⚙️ Environment variables and configuration
- 🗄️ Database models (User, Client, Batch, Order)
- 📝 Field descriptions and data types
- 🛠️ Setup and deployment instructions

**Click on each section below to expand and view detailed information.**

---

<details>
<summary><strong>📋 Environment Variables</strong></summary>

### Database Configuration

| Variable | Description |
|----------|-------------|
| **DATABASE_URL** | MySQL database connection string (format: mysql://username:password@host:port/database_name) |
| **PORT** | Port number on which the server will listen (default: 3000) |
| **APP_NAME** | Application name displayed in responses (default: "Catalyst") |
| **FRONTEND_URL** | Frontend application URL for CORS and redirects (default: "localhost:5173") |
| **JWT_SECRET** | Secret key used to sign and verify JSON Web Tokens (required for authentication) |
| **JWT_EXPIRES_IN** | JWT token expiration time (format: "1d" for 1 day, "7d" for 7 days, etc.) |
| **ALLOW_REGISTRATION** | Enable or disable new user registration (default: true) |
| **DEFAULT_USER_ROLE** | Default role assigned to newly registered users (default: "user") |
| **USE_FINANCIAL_YEAR_EXPIRY** | Enable financial year-based API key expiry (boolean: true/false) |
| **FINANCIAL_YEAR_END_DATE** | Financial year end date in MM-DD format (example: "03-31" for March 31st) |
| **EMAIL_TRANSPORTER** | Email service provider to use (options: "smtp", "mailtrap", "sendgrid") |
| **EMAIL_FROM** | Email address used as the sender for all outgoing emails |
| **EMAIL_HOST** | SMTP server hostname (required if EMAIL_TRANSPORTER is "smtp") |
| **EMAIL_PORT** | SMTP server port number (commonly 587 for TLS, 465 for SSL) |
| **EMAIL_USER** | Username/email for SMTP authentication |
| **EMAIL_PASSWORD** | Password for SMTP authentication |
| **SENDGRID_API_KEY** | API key for SendGrid email service (required if EMAIL_TRANSPORTER is "sendgrid") |
| **MAILTRAP_HOST** | Mailtrap SMTP hostname (default: "smtp.mailtrap.io") |
| **MAILTRAP_PORT** | Mailtrap SMTP port (default: 2525) |
| **MAILTRAP_USER** | Mailtrap username for authentication |
| **MAILTRAP_PASSWORD** | Mailtrap password for authentication |

</details>

<details>
<summary><strong>👤 User Model Fields</strong></summary>

| Field | Type | Description |
|-------|------|-------------|
| **id** | integer | Unique user identifier (auto-incremented) |
| **name** | string | User's full name |
| **email** | string | User's email address (unique) |
| **password** | string | Hashed password for authentication |
| **role** | string | User's role in the system (e.g., "admin", "user", "client") |
| **clientId** | integer | Reference to parent client (for users belonging to a client) |
| **active** | boolean | User account status (true = active, false = inactive) |
| **lastLogin** | datetime | Timestamp of user's last successful login |
| **resetToken** | string | Temporary token for password reset functionality |
| **resetTokenExpires** | datetime | Expiration timestamp for password reset token |
| **apiKey** | string | Unique API key for programmatic access |
| **apiKeyExpiry** | datetime | Expiration date/time for the API key |
| **createdAt** | datetime | Timestamp when user account was created |
| **updatedAt** | datetime | Timestamp when user account was last updated |

</details>

<details>
<summary><strong>🏢 Client Model Fields</strong></summary>

| Field | Type | Description |
|-------|------|-------------|
| **id** | integer | Unique client identifier (auto-incremented) |
| **name** | string | Client company name (required) |
| **entityName** | string | Legal entity name |
| **address** | text | Physical address |
| **legalAddress** | text | Legal/registered address |
| **taxOrEinNumber** | string | Tax ID or EIN number |
| **mpid** | string | Market Participant ID |
| **lei** | string | Legal Entity Identifier |
| **catReporterImid** | string | CAT Reporter IMID |
| **catSubmitterImid** | string | CAT Submitter IMID |
| **contactPersonName** | string | Primary contact person name |
| **contactNumber** | string | Contact phone number |
| **contactEmailId** | string | Contact email address |
| **serviceEmailId** | string | Service/support email address |
| **catEnabled** | boolean | CAT reporting feature enabled (default: false) |
| **sixZeroFiveEnabled** | boolean | Rule 605 reporting enabled (default: false) |
| **loprEnabled** | boolean | LOPR feature enabled (default: false) |
| **supportEscalationContact** | string | Support escalation email |
| **dataSpecificationModel** | string | Data specification model type (enum) |
| **configurationPlaceholder** | string | Configuration field 1 (enum) |
| **configurationPlaceholder1** | string | Configuration field 2 (enum) |
| **configurationPlaceholder2** | string | Configuration field 3 (enum) |
| **placeholderColumn1** | string | Custom field 1 |
| **placeholderColumn2** | string | Custom field 2 |
| **placeholderColumn3** | string | Custom field 3 |
| **placeholderColumn4** | string | Custom field 4 |
| **placeholderColumn5** | string | Custom field 5 |
| **placeholderColumn6** | string | Custom field 6 |
| **placeholderColumn7** | string | Custom field 7 |
| **active** | boolean | Client status (true = active, false = inactive) |
| **createdAt** | datetime | Timestamp when client was created |
| **updatedAt** | datetime | Timestamp when client was last updated |

**Total: 32 fields** (29 business fields + 3 system fields)

**Note:** Client login credentials are managed separately in the User model with role="client" and a reference to this Client record.

</details>

<details>
<summary><strong>📦 Batch Model Fields</strong></summary>

| Field | Type | Description |
|-------|------|-------------|
| **id** | integer | Unique batch identifier (auto-incremented) |
| **userId** | integer | Reference to the user who created the batch |
| **fileName** | string | Name of the uploaded Excel file |
| **fileSize** | integer | Size of the uploaded file in bytes |
| **totalOrders** | integer | Total number of orders in the batch |
| **successfulOrders** | integer | Number of successfully processed orders |
| **failedOrders** | integer | Number of orders that failed processing |
| **status** | string | Current batch processing status (processing, completed, failed) |
| **errorLog** | text | Detailed error messages and logs from batch processing |
| **importedAt** | datetime | Timestamp when batch was imported |
| **completedAt** | datetime | Timestamp when batch processing completed |
| **createdAt** | datetime | Timestamp when batch record was created |
| **updatedAt** | datetime | Timestamp when batch record was last updated |

</details>

<details>
<summary><strong>📊 Order Model Fields</strong></summary>

| Field | Type | Description |
|-------|------|-------------|
| **id** | integer | Unique order identifier in database (auto-incremented) |
| **userId** | integer | Reference to the user who owns the order |
| **batchId** | integer | Reference to the batch this order belongs to |
| **clientId** | string | Client identifier from external system |
| **orderId** | string | Unique order identifier |
| **orderIdVersion** | integer | Version number of the order |
| **orderIdSession** | integer | Trading session identifier |
| **orderIdInstance** | string | Instance identifier for the order |
| **parentOrderId** | string | Identifier of the parent order (for child orders) |
| **cancelreplaceOrderId** | string | Original order ID when canceling/replacing |
| **linkedOrderId** | string | Related or linked order identifier |
| **orderAction** | string | Action taken on the order (new, cancel, replace, etc.) |
| **orderStatus** | string | Current status of the order (open, filled, canceled, etc.) |
| **orderCapacity** | integer | Trading capacity (principal, agency, riskless principal) |
| **orderDestination** | integer | Exchange or venue where order is routed |
| **orderClientRef** | integer | Client reference number |
| **orderClientRefDetails** | integer | Additional client reference details |
| **orderExecutingEntity** | string | Entity executing the order |
| **orderBookingEntity** | string | Entity booking the order |
| **orderPositionAccount** | string | Account for position tracking |
| **orderSide** | string | Buy or sell side |
| **orderClientCapacity** | string | Client's trading capacity |
| **orderManualIndicator** | string | Whether order was manually entered |
| **orderRequestTime** | string | Time order was requested |
| **orderEventTime** | string | Time of order event |
| **orderManualTimestamp** | string | Timestamp for manual orders |
| **orderOmsSource** | string | Order management system source |
| **orderPublishingTime** | string | Time order was published |
| **orderTradeDate** | string | Trade date |
| **orderQuantity** | decimal | Total order quantity (18 digits, 8 decimal places) |
| **orderPrice** | decimal | Order price (18 digits, 8 decimal places) |
| **orderType** | string | Order type (market, limit, stop, etc.) |
| **orderTimeInforce** | string | Time in force (day, GTC, IOC, FOK, etc.) |
| **orderExecutionInstructions** | string | Special execution instructions |
| **orderAttributes** | string | Additional order attributes |
| **orderRestrictions** | string | Trading restrictions on the order |
| **orderAuctionIndicator** | string | Whether order participates in auction |
| **orderSwapIndicator** | string | Swap transaction indicator |
| **orderOsi** | string | Order source indicator |
| **orderInstrumentId** | string | Unique instrument identifier |
| **orderLinkedInstrumentId** | string | Related instrument identifier |
| **orderCurrencyId** | string | Currency of the order |
| **orderFlowType** | string | Order flow classification |
| **orderAlgoInstruction** | string | Algorithmic trading instructions |
| **orderSymbol** | string | Trading symbol |
| **orderInstrumentReference** | string | Type of instrument reference |
| **orderInstrumentReferenceValue** | string | Value of instrument reference |
| **orderOptionPutCall** | string | Put or call for options |
| **orderOptionStrikePrice** | decimal | Strike price for options (18 digits, 8 decimal places) |
| **orderOptionLegIndicator** | string | Multi-leg option indicator |
| **orderComplianceId** | string | Compliance identifier |
| **orderEntityId** | string | Entity identifier |
| **orderExecutingAccount** | string | Executing account number |
| **orderClearingAccount** | string | Clearing account number |
| **orderClientOrderId** | string | Client's order identifier |
| **orderRoutedOrderId** | string | Order ID after routing |
| **orderTradingOwner** | string | Owner/trader of the order |
| **orderExtendedAttribute** | text | Extended attributes field |
| **orderQuoteId** | string | Related quote identifier |
| **orderRepresentOrderId** | string | Representative order identifier |
| **orderOnBehalfCompId** | string | On-behalf-of company ID |
| **orderSpread** | string | Spread value for multi-leg orders |
| **orderAmendReason** | string | Reason for order amendment |
| **orderCancelRejectReason** | string | Reason for cancel/reject |
| **orderBidSize** | decimal | Bid size at order time (18 digits, 8 decimal places) |
| **orderBidPrice** | decimal | Bid price at order time (18 digits, 8 decimal places) |
| **orderAskSize** | decimal | Ask size at order time (18 digits, 8 decimal places) |
| **orderAskPrice** | decimal | Ask price at order time (18 digits, 8 decimal places) |
| **orderBasketId** | string | Basket order identifier |
| **orderCumQty** | decimal | Cumulative filled quantity (18 digits, 8 decimal places) |
| **orderLeavesQty** | decimal | Remaining unfilled quantity (18 digits, 8 decimal places) |
| **orderStopPrice** | decimal | Stop price for stop orders (18 digits, 8 decimal places) |
| **orderDiscretionPrice** | decimal | Discretionary price limit (18 digits, 8 decimal places) |
| **orderExdestinationInstruction** | string | Exchange destination instructions |
| **orderExecutionParameter** | string | Execution parameters |
| **orderInfobarrierId** | string | Information barrier identifier |
| **orderLegRatio** | string | Ratio for multi-leg orders |
| **orderLocateId** | string | Short sale locate identifier |
| **orderNegotiatedIndicator** | string | Negotiated trade indicator |
| **orderOpenClose** | string | Open or close position indicator |
| **orderParticipantPriorityCode** | string | Participant priority code |
| **orderActionInitiated** | string | Who initiated the action |
| **orderPackageIndicator** | string | Package order indicator |
| **orderPackageId** | string | Package identifier |
| **orderPackagePricetype** | string | Package pricing type |
| **orderStrategyType** | string | Trading strategy type |
| **orderSecondaryOffering** | string | Secondary offering indicator |
| **orderStartTime** | string | Order start time |
| **orderTifExpiration** | string | Time in force expiration |
| **orderParentChildType** | string | Parent-child relationship type |
| **orderMinimumQty** | decimal | Minimum execution quantity (18 digits, 8 decimal places) |
| **orderTradingSession** | string | Trading session designation |
| **orderDisplayPrice** | decimal | Displayed price (18 digits, 8 decimal places) |
| **orderSeqNumber** | string | Sequence number |
| **atsDisplayIndicator** | string | Alternative trading system display indicator |
| **orderDisplayQty** | decimal | Displayed quantity (18 digits, 8 decimal places) |
| **orderWorkingPrice** | decimal | Working price (18 digits, 8 decimal places) |
| **atsOrderType** | string | ATS order type |
| **orderNbboSource** | string | National best bid and offer source |
| **orderNbboTimestamp** | string | NBBO timestamp |
| **orderSolicitationFlag** | string | Solicited order flag |
| **orderNetPrice** | decimal | Net price (18 digits, 8 decimal places) |
| **routeRejectedFlag** | string | Whether route was rejected |
| **orderOriginationSystem** | string | System where order originated |
| **createdAt** | datetime | Timestamp when order record was created in database |
| **updatedAt** | datetime | Timestamp when order record was last updated in database |

**Total: 107 fields** (4 system fields + 101 order fields + 2 timestamp fields)

</details>

<details>
<summary><strong>🚀 Setup Instructions</strong></summary>

1. Copy \`.env.example\` to \`.env\`
2. Fill in all required variables
3. Run \`npm install\`
4. Run \`npx prisma migrate dev\`
5. Run \`npx prisma generate\`
6. Run \`npm run dev\`

</details>

---

**Note:** Click on each section above to expand and view detailed information.
`,
    },
    servers: [
      {
        url: "http://localhost:3000/api",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Enter your API key (the 'Bearer ' prefix will be added automatically)",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique user identifier (auto-incremented)",
            },
            name: {
              type: "string",
              description: "User's full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address (unique)",
            },
            password: {
              type: "string",
              format: "password",
              description: "Hashed password for authentication",
            },
            role: {
              type: "string",
              description: "User's role in the system (e.g., 'admin', 'user', 'client')",
              example: "user",
            },
            clientId: {
              type: "integer",
              nullable: true,
              description: "Reference to parent client (for users belonging to a client)",
            },
            active: {
              type: "boolean",
              default: true,
              description: "User account status (true = active, false = inactive)",
            },
            lastLogin: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Timestamp of user's last successful login",
            },
            resetToken: {
              type: "string",
              nullable: true,
              description: "Temporary token for password reset functionality",
            },
            resetTokenExpires: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Expiration timestamp for password reset token",
            },
            apiKey: {
              type: "string",
              nullable: true,
              description: "Unique API key for programmatic access",
            },
            apiKeyExpiry: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Expiration date/time for the API key",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when user account was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when user account was last updated",
            },
          },
        },
        Batch: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique batch identifier (auto-incremented)",
            },
            userId: {
              type: "integer",
              description: "Reference to the user who created the batch",
            },
            fileName: {
              type: "string",
              description: "Name of the uploaded Excel file",
            },
            fileSize: {
              type: "integer",
              nullable: true,
              description: "Size of the uploaded file in bytes",
            },
            totalOrders: {
              type: "integer",
              default: 0,
              description: "Total number of orders in the batch",
            },
            successfulOrders: {
              type: "integer",
              default: 0,
              description: "Number of successfully processed orders",
            },
            failedOrders: {
              type: "integer",
              default: 0,
              description: "Number of orders that failed processing",
            },
            status: {
              type: "string",
              enum: ["processing", "completed", "failed"],
              default: "processing",
              description: "Current batch processing status",
            },
            errorLog: {
              type: "string",
              nullable: true,
              description: "Detailed error messages and logs from batch processing",
            },
            importedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when batch was imported",
            },
            completedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Timestamp when batch processing completed",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when batch record was created",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when batch record was last updated",
            },
          },
        },
        Order: {
          type: "object",
          description: "Order with 101 trading fields from Excel template",
          properties: {
            id: {
              type: "integer",
              description: "Unique order identifier in database (auto-incremented)",
            },
            userId: {
              type: "integer",
              description: "Reference to the user who owns the order",
            },
            batchId: {
              type: "integer",
              description: "Reference to the batch this order belongs to",
            },
            clientId: {
              type: "string",
              nullable: true,
              description: "Client identifier from external system",
            },
            orderId: {
              type: "string",
              nullable: true,
              description: "External order identifier",
            },
            orderIdVersion: {
              type: "integer",
              nullable: true,
              description: "Version number of the order",
            },
            orderStatus: {
              type: "string",
              nullable: true,
              description: "Current status of order (open, filled, canceled, etc.)",
            },
            orderAction: {
              type: "string",
              nullable: true,
              description: "Action taken on order (new, cancel, replace, etc.)",
            },
            orderSide: {
              type: "string",
              nullable: true,
              description: "Buy or sell side indicator",
            },
            orderQuantity: {
              type: "number",
              format: "decimal",
              nullable: true,
              description: "Total order quantity (decimal: 18 digits, 8 decimal places)",
            },
            orderPrice: {
              type: "number",
              format: "decimal",
              nullable: true,
              description: "Order price (decimal: 18 digits, 8 decimal places)",
            },
            orderType: {
              type: "string",
              nullable: true,
              description: "Order type (market, limit, stop, etc.)",
            },
            orderSymbol: {
              type: "string",
              nullable: true,
              description: "Trading symbol/ticker",
            },
            orderInstrumentId: {
              type: "string",
              nullable: true,
              description: "Unique instrument identifier",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when order record was created in database",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when order record was last updated",
            },
          },
          example: {
            orderId: "ORD123456",
            orderSide: "BUY",
            orderQuantity: 100,
            orderPrice: 45.50,
            orderType: "LIMIT",
            orderSymbol: "AAPL",
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  swaggerOptions: {
    filter: true, // Enable search/filter bar
    defaultModelsExpandDepth: -1, // Hide schemas section
    requestInterceptor: (req) => {
      // Ensure content-type is properly set for file uploads
      if (req.body instanceof FormData) {
        req.headers["Content-Type"] = "multipart/form-data";
      }
      return req;
    },
  },
};

router.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, swaggerUiOptions)
);

module.exports = router;
