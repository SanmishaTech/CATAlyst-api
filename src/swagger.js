const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { apiReference } = require("@scalar/express-api-reference");
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

| Field | Type | Data Length | Required | Description |
|-------|------|-------------|----------|-------------|
| **orderId** | string | 128 | Yes | Unique identifier for Order as assigned by sell-side |
| **orderIdVersion** | integer | - | No | Version number of the order |
| **orderIdSession** | string | 16 | No | Trading session identifier to distinguish orders across multiple days |
| **orderIdInstance** | string | 64 | No | Instance identifier for the order |
| **parentOrderId** | string | 128 | No | Identifier of the parent order (for child orders) |
| **cancelreplaceOrderId** | string | 128 | No | Original order ID when canceling/replacing |
| **linkedOrderId** | string | 128 | No | Related or linked order identifier |
| **orderAction** | string | 50 (Enum) | Yes | Action taken on the order (new, cancel, replace, etc.) |
| **orderStatus** | string | 48 | No | Current status of the order (open, filled, canceled, etc.) |
| **orderCapacity** | string | 48 | Yes | Trading capacity (principal, agency, riskless principal) |
| **orderDestination** | string | 48 | No | Exchange or venue where order is routed |
| **orderClientRef** | string | 128 | No | Client reference number |
| **orderClientRefDetails** | string | 48 | No | Additional client reference details |
| **orderExecutingEntity** | integer | - | No | Entity executing the order |
| **orderBookingEntity** | integer | - | No | Entity booking the order |
| **orderPositionAccount** | integer | - | No | Account for position tracking |
| **orderSide** | string | 50 (Enum) | Yes | Buy or sell side |
| **orderClientCapacity** | string | 50 (Enum) | No | Client's trading capacity |
| **orderManualIndicator** | string | 50 (Enum) | No | Whether order was manually entered |
| **orderRequestTime** | string | 50 | No | Time order was requested (UTC timestamp in nanoseconds) |
| **orderEventTime** | string | 50 | No | Time of order event (UTC timestamp in nanoseconds) |
| **orderManualTimestamp** | string | 50 | No | Timestamp for manual orders (UTC timestamp in nanoseconds) |
| **orderOmsSource** | string | 64 | Yes | Order management system source |
| **orderPublishingTime** | string | 50 | Yes | Time order was published (UTC timestamp in nanoseconds) |
| **orderTradeDate** | string | 50 | No | Trade date (UTC timestamp in nanoseconds) |
| **orderQuantity** | decimal | 18,6 | No | Total order quantity (18 digits, 6 decimal places) |
| **orderPrice** | decimal | 18,6 | No | Order price (18 digits, 6 decimal places) |
| **orderType** | string | 50 (Enum) | Yes | Order type (market, limit, stop, etc.) |
| **orderTimeInforce** | string | 50 (Enum) | No | Time in force (day, GTC, IOC, FOK, etc.) |
| **orderExecutionInstructions** | string | 128 | No | Special execution instructions |
| **orderAttributes** | string | 128 | No | Additional order attributes |
| **orderRestrictions** | string | 256 | No | Trading restrictions on the order |
| **orderAuctionIndicator** | string | 64 | No | Whether order participates in auction |
| **orderSwapIndicator** | string | 50 (Enum) | No | Swap transaction indicator |
| **orderOsi** | string | 128 | No | Order source indicator |
| **orderInstrumentId** | integer | - | No | Unique instrument identifier |
| **orderLinkedInstrumentId** | integer | - | No | Related instrument identifier |
| **orderCurrencyId** | string | 32 | No | Currency of the order |
| **orderFlowType** | string | 32 | No | Order flow classification |
| **orderAlgoInstruction** | string | 64 | No | Algorithmic trading instructions |
| **orderSymbol** | string | 64 | No | Trading symbol |
| **orderInstrumentReference** | string | 24 | No | Type of instrument reference |
| **orderInstrumentReferenceValue** | string | 64 | No | Value of instrument reference |
| **orderOptionPutCall** | string | 50 (Enum) | No | Put or call for options |
| **orderOptionStrikePrice** | decimal | 18,6 | No | Strike price for options (18 digits, 6 decimal places) |
| **orderOptionLegIndicator** | string | 50 (Enum) | No | Multi-leg option indicator |
| **orderComplianceId** | string | 128 | Yes | Compliance identifier |
| **orderEntityId** | string | 128 | No | Entity identifier |
| **orderExecutingAccount** | integer | - | No | Executing account number |
| **orderClearingAccount** | integer | - | No | Clearing account number |
| **orderClientOrderId** | string | 128 | No | Client's order identifier |
| **orderRoutedOrderId** | string | 128 | No | Order ID after routing |
| **orderTradingOwner** | integer | - | No | Owner/trader of the order |
| **orderExtendedAttribute** | string | 256 | No | Extended attributes field |
| **orderQuoteId** | string | 128 | No | Related quote identifier |
| **orderRepresentOrderId** | string | 128 | No | Representative order identifier |
| **orderOnBehalfCompId** | string | 64 | No | On-behalf-of company ID |
| **orderSpread** | decimal | 18,6 | No | Spread value for multi-leg orders (18 digits, 6 decimal places) |
| **orderAmendReason** | string | 64 | No | Reason for order amendment |
| **orderCancelRejectReason** | string | 64 | No | Reason for cancel/reject |
| **orderBidSize** | decimal | 18,6 | No | Bid size at order time (18 digits, 6 decimal places) |
| **orderBidPrice** | decimal | 18,6 | No | Bid price at order time (18 digits, 6 decimal places) |
| **orderAskSize** | decimal | 18,6 | No | Ask size at order time (18 digits, 6 decimal places) |
| **orderAskPrice** | decimal | 18,6 | No | Ask price at order time (18 digits, 6 decimal places) |
| **orderBasketId** | string | 128 | No | Basket order identifier |
| **orderCumQty** | decimal | 18,6 | No | Cumulative filled quantity (18 digits, 6 decimal places) |
| **orderLeavesQty** | decimal | 18,6 | No | Remaining unfilled quantity (18 digits, 6 decimal places) |
| **orderStopPrice** | decimal | 18,6 | No | Stop price for stop orders (18 digits, 6 decimal places) |
| **orderDiscretionPrice** | decimal | 18,6 | No | Discretionary price limit (18 digits, 6 decimal places) |
| **orderExdestinationInstruction** | string | 64 | No | Exchange destination instructions |
| **orderExecutionParameter** | string | 128 | No | Execution parameters |
| **orderInfobarrierId** | string | 128 | No | Information barrier identifier |
| **orderLegRatio** | decimal | 18,6 | No | Ratio for multi-leg orders (18 digits, 6 decimal places) |
| **orderLocateId** | string | 128 | No | Short sale locate identifier |
| **orderNegotiatedIndicator** | string | 50 (Enum) | No | Negotiated trade indicator |
| **orderOpenClose** | string | 50 (Enum) | No | Open or close position indicator |
| **orderParticipantPriorityCode** | string | 32 | No | Participant priority code |
| **orderActionInitiated** | string | 32 | No | Who initiated the action |
| **orderPackageIndicator** | string | 50 (Enum) | No | Package order indicator |
| **orderPackageId** | string | 128 | No | Package identifier |
| **orderPackagePricetype** | string | 64 | No | Package pricing type |
| **orderStrategyType** | string | 64 | No | Trading strategy type |
| **orderSecondaryOffering** | string | 50 (Enum) | No | Secondary offering indicator |
| **orderStartTime** | string | 50 | No | Order start time (UTC timestamp in nanoseconds) |
| **orderTifExpiration** | string | 50 | No | Time in force expiration (UTC timestamp in nanoseconds) |
| **orderParentChildType** | string | 50 (Enum) | No | Parent-child relationship type |
| **orderMinimumQty** | decimal | 18,6 | No | Minimum execution quantity (18 digits, 6 decimal places) |
| **orderTradingSession** | string | 50 (Enum) | No | Trading session designation |
| **orderDisplayPrice** | decimal | 18,6 | No | Displayed price (18 digits, 6 decimal places) |
| **orderSeqNumber** | string | 128 | No | Sequence number |
| **atsDisplayIndicator** | string | 50 (Enum) | No | Alternative trading system display indicator |
| **orderDisplayQty** | decimal | 18,6 | No | Displayed quantity (18 digits, 6 decimal places) |
| **orderWorkingPrice** | decimal | 18,6 | No | Working price (18 digits, 6 decimal places) |
| **atsOrderType** | string | 32 | No | ATS order type |
| **orderNbboSource** | string | 64 | No | National best bid and offer source |
| **orderNbboTimestamp** | string | 50 | No | NBBO timestamp (UTC timestamp in nanoseconds) |
| **orderSolicitationFlag** | string | 50 (Enum) | No | Solicited order flag |
| **orderNetPrice** | decimal | 18,6 | No | Net price (18 digits, 6 decimal places) |
| **routeRejectedFlag** | string | 50 (Enum) | No | Whether route was rejected |
| **orderOriginationSystem** | string | 64 | Yes | System where order originated |
| **createdAt** | datetime | - | Yes | Timestamp when order record was created in database |
| **updatedAt** | datetime | - | Yes | Timestamp when order record was last updated in database |

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
        url: process.env.NODE_ENV === "production"
          ? `${process.env.API_URL || "https://CATAlystc.3.7.237.251.sslip.io"}/api`
          : "http://localhost:3000/api",
        description: process.env.NODE_ENV === "production" ? "Production server" : "Development server",
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
              maxLength: 128,
              description: "Unique identifier for Order as assigned by sell-side (VARCHAR 128)",
            },
            orderIdVersion: {
              type: "integer",
              nullable: true,
              description: "Version number of the order",
            },
            orderIdSession: {
              type: "string",
              maxLength: 16,
              nullable: true,
              description: "Trading session identifier to distinguish orders across multiple days (VARCHAR 16)",
            },
            orderIdInstance: {
              type: "string",
              maxLength: 64,
              nullable: true,
              description: "Instance identifier for the order (VARCHAR 64)",
            },
            parentOrderId: {
              type: "string",
              maxLength: 128,
              nullable: true,
              description: "Identifier of the parent order (for child orders) (VARCHAR 128)",
            },
            cancelreplaceOrderId: {
              type: "string",
              maxLength: 128,
              nullable: true,
              description: "Original order ID when canceling/replacing (VARCHAR 128)",
            },
            linkedOrderId: {
              type: "string",
              maxLength: 128,
              nullable: true,
              description: "Related or linked order identifier (VARCHAR 128)",
            },
            orderAction: {
              type: "string",
              maxLength: 50,
              description: "Action taken on order - Enum (new, cancel, replace, etc.) (VARCHAR 50)",
            },
            orderStatus: {
              type: "string",
              maxLength: 48,
              nullable: true,
              description: "Current status of order (open, filled, canceled, etc.) (VARCHAR 48)",
            },
            orderCapacity: {
              type: "string",
              maxLength: 48,
              description: "Trading capacity (principal, agency, riskless principal) (VARCHAR 48)",
            },
            orderDestination: {
              type: "string",
              maxLength: 48,
              nullable: true,
              description: "Exchange or venue where order is routed (VARCHAR 48)",
            },
            orderClientRef: {
              type: "string",
              maxLength: 128,
              nullable: true,
              description: "Client reference number (VARCHAR 128)",
            },
            orderClientRefDetails: {
              type: "string",
              maxLength: 48,
              nullable: true,
              description: "Additional client reference details (VARCHAR 48)",
            },
            orderExecutingEntity: {
              type: "integer",
              nullable: true,
              description: "Entity executing the order",
            },
            orderBookingEntity: {
              type: "integer",
              nullable: true,
              description: "Entity booking the order",
            },
            orderPositionAccount: {
              type: "integer",
              nullable: true,
              description: "Account for position tracking",
            },
            orderSide: {
              type: "string",
              maxLength: 50,
              description: "Buy or sell side indicator - Enum (VARCHAR 50)",
            },
            orderClientCapacity: {
              type: "string",
              maxLength: 50,
              nullable: true,
              description: "Client's trading capacity - Enum (VARCHAR 50)",
            },
            orderManualIndicator: {
              type: "string",
              maxLength: 50,
              nullable: true,
              description: "Whether order was manually entered - Enum (VARCHAR 50)",
            },
            orderQuantity: {
              type: "number",
              format: "decimal",
              nullable: true,
              description: "Total order quantity (decimal: 18 digits, 6 decimal places)",
            },
            orderPrice: {
              type: "number",
              format: "decimal",
              nullable: true,
              description: "Order price (decimal: 18 digits, 6 decimal places)",
            },
            orderType: {
              type: "string",
              maxLength: 50,
              description: "Order type - Enum (market, limit, stop, etc.) (VARCHAR 50)",
            },
            orderSymbol: {
              type: "string",
              maxLength: 64,
              nullable: true,
              description: "Trading symbol/ticker (VARCHAR 64)",
            },
            orderInstrumentId: {
              type: "integer",
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
  customSiteTitle: "Catalyst API Engine",
  swaggerOptions: {
    filter: true, // Enable search/filter bar
    defaultModelsExpandDepth: -1, // Hide schemas section
    docExpansion: "none", // Keep tag accordions closed by default (list,none & full)
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
  "/api",
  swaggerUi.serve,
  swaggerUi.setup(specs, swaggerUiOptions)
);

// Scalar API documentation
router.use(
  "/api-scalar",
  apiReference({
    spec: {
      content: specs,
    },
    theme: "purple",
    layout: "modern",
    darkMode: true,
  })
);

module.exports = router;
