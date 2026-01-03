const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const createError = require("http-errors");
const https = require("https");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const {
  ExecutionSide,
  ExecutionPostingSide,
  ExecutionAllocationSide,
  ExecutionBrokerCapacity,
  ExecutionCapacity,
  ExecutionManualIndicator,
  IsMarketExecution,
  ExecutionTransactionType,
  ExecutionBookingEligiblity,
  ExecutionSwapIndicator,
  ExecutionSecondaryOffering,
  ExecutonSessionActual,
  ExecutionLastLiquidityIndicator,
  ExecutionWaiverIndicator,
  ExecutionPackageIndicator,
  ExecutionRawLiquidityIndicator,
  ExecutionNegotiatedIndicator,
  ExecutionOpenCloseIndicator,
  ExecutionAction,
  ExecutionInstrumentReference,
  validateEnum
} = require("../constants/executionEnums");

// Field mapping from Excel headers to database fields (snake_case to camelCase)
const fieldMapping = {
  userid: "userId",
  executionid: "executionId",
  execution_id: "executionId",
  previousexecutionid: "previousExecutionId",
  previous_execution_id: "previousExecutionId",
  executionentityid: "executionEntityId",
  execution_entity_id: "executionEntityId",
  executionversion: "executionVersion",
  execution_version: "executionVersion",
  executionseqnumber: "executionSeqNumber",
  execution_seq_number: "executionSeqNumber",
  externalexecutionid: "externalExecutionId",
  external_execution_id: "externalExecutionId",
  executionside: "executionSide",
  execution_side: "executionSide",
  executionpostingside: "executionPostingSide",
  execution_posting_side: "executionPostingSide",
  executionallocationside: "executionAllocationSide",
  execution_allocation_side: "executionAllocationSide",
  executionbrokercapacity: "executionBrokerCapacity",
  execution_broker_capacity: "executionBrokerCapacity",
  executioncapacity: "executionCapacity",
  execution_capacity: "executionCapacity",
  executioneventtime: "executionEventTime",
  execution_event_time: "executionEventTime",
  executiontime: "executionTime",
  execution_time: "executionTime",
  executionmanualindicator: "executionManualIndicator",
  execution_manual_indicator: "executionManualIndicator",
  executionmanualeventtime: "executionManualEventTime",
  execution_manual_event_time: "executionManualEventTime",
  ismarketexecution: "isMarketExecution",
  is_market_execution: "isMarketExecution",
  executionlastmarket: "executionLastMarket",
  execution_last_market: "executionLastMarket",
  executionaccount: "executionAccount",
  execution_account: "executionAccount",
  executionbookingaccount: "executionBookingAccount",
  execution_booking_account: "executionBookingAccount",
  executionbookingentity: "executionBookingEntity",
  execution_booking_entity: "executionBookingEntity",
  executiontradingentity: "executionTradingEntity",
  execution_trading_entity: "executionTradingEntity",
  executiondeskid: "executionDeskId",
  execution_desk_id: "executionDeskId",
  executionosi: "executionOsi",
  execution_osi: "executionOsi",
  executioninstrumentid: "executionInstrumentId",
  execution_instrument_id: "executionInstrumentId",
  executionlinkedinstrumentid: "executionLinkedInstrumentId",
  execution_linked_instrument_id: "executionLinkedInstrumentId",
  executionsymbol: "executionSymbol",
  execution_symbol: "executionSymbol",
  executioninstrumentreference: "executionInstrumentReference",
  execution_instrument_reference: "executionInstrumentReference",
  executioninstrumentreferencevalue: "executionInstrumentReferenceValue",
  execution_instrument_reference_value: "executionInstrumentReferenceValue",
  executionlastprice: "executionLastPrice",
  execution_last_price: "executionLastPrice",
  executionlastquantity: "executionLastQuantity",
  execution_last_quantity: "executionLastQuantity",
  executioncontrabroker: "executionContraBroker",
  execution_contra_broker: "executionContraBroker",
  linkedexecutionid: "linkedExecutionId",
  linked_execution_id: "linkedExecutionId",
  executiontransactiontype: "executionTransactionType",
  execution_transaction_type: "executionTransactionType",
  executionidinstance: "executionIdInstance",
  execution_id_instance: "executionIdInstance",
  executionsession: "executionSession",
  execution_session: "executionSession",
  executionorderidinstance: "executionOrderIdInstance",
  execution_order_id_instance: "executionOrderIdInstance",
  executionorderidsession: "executionOrderIdSession",
  execution_order_id_session: "executionOrderIdSession",
  executonorderid: "executonOrderId",
  executon_order_id: "executonOrderId",
  executionorderidversion: "executionOrderIdVersion",
  execution_order_id_version: "executionOrderIdVersion",
  executiontradeexecutionsystem: "executionTradeExecutionSystem",
  execution_trade_execution_system: "executionTradeExecutionSystem",
  tradeexecutionsystem: "executionTradeExecutionSystem",
  trade_execution_system: "executionTradeExecutionSystem",
  executionomssource: "executionOmsSource",
  execution_oms_source: "executionOmsSource",
  executionbookingeligiblity: "executionBookingEligiblity",
  execution_booking_eligiblity: "executionBookingEligiblity",
  executiontradedate: "executionTradeDate",
  execution_trade_date: "executionTradeDate",
  executioncurrencyid: "executionCurrencyId",
  execution_currency_id: "executionCurrencyId",
  executionpositionid: "executionPositionId",
  execution_position_id: "executionPositionId",
  executionswapindicator: "executionSwapIndicator",
  execution_swap_indicator: "executionSwapIndicator",
  executionsettledate: "executionSettleDate",
  execution_settle_date: "executionSettleDate",
  executioncommisionfee: "executionCommisionFee",
  execution_commision_fee: "executionCommisionFee",
  executionrollupid: "executionRollupId",
  execution_rollup_id: "executionRollupId",
  executionsecondaryoffering: "executionSecondaryOffering",
  execution_secondary_offering: "executionSecondaryOffering",
  executioncumquantity: "executionCumQuantity",
  execution_cum_quantity: "executionCumQuantity",
  executiontradefactors: "executionTradeFactors",
  execution_trade_factors: "executionTradeFactors",
  executionriskdate: "executionRiskDate",
  execution_risk_date: "executionRiskDate",
  executionordercomplianceid: "executionOrderComplianceId",
  execution_order_compliance_id: "executionOrderComplianceId",
  executioninfobarrierid: "executionInfoBarrierId",
  execution_infobarrier_id: "executionInfoBarrierId",
  executonsessionactual: "executonSessionActual",
  executon_session_actual: "executonSessionActual",
  executionstrategy: "executionStrategy",
  execution_strategy: "executionStrategy",
  executionlastliquidityindicator: "executionLastLiquidityIndicator",
  execution_last_liquidity_indicator: "executionLastLiquidityIndicator",
  executionwaiverindicator: "executionWaiverIndicator",
  execution_waiver_indicator: "executionWaiverIndicator",
  executionlifecycletype: "executionLifecycleType",
  execution_lifecycle_type: "executionLifecycleType",
  executionpackageindicator: "executionPackageIndicator",
  execution_package_indicator: "executionPackageIndicator",
  executionrawliquidityindicator: "executionRawLiquidityIndicator",
  execution_raw_liquidity_indicator: "executionRawLiquidityIndicator",
  executionpackageid: "executionPackageId",
  execution_package_id: "executionPackageId",
  executionquoteid: "executionQuoteId",
  execution_quote_id: "executionQuoteId",
  executionyield: "executionYield",
  execution_yield: "executionYield",
  executionspread: "executionSpread",
  execution_spread: "executionSpread",
  executionnegotiatedindicator: "executionNegotiatedIndicator",
  execution_negotiated_indicator: "executionNegotiatedIndicator",
  executionopencloseindicator: "executionOpenCloseIndicator",
  execution_open_close_indicator: "executionOpenCloseIndicator",
  exchangeexecid: "exchangeExecId",
  exchange_exec_id: "exchangeExecId",
  executionaction: "executionAction",
  execution_action: "executionAction",
  executioncrossid: "executionCrossId",
  execution_cross_id: "executionCrossId",
  executionexecutingentity: "executionExecutingEntity",
  execution_executing_entity: "executionExecutingEntity",
};

// Parse decimal values
const parseDecimal = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// Parse integer values
const parseIntValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
};

// Helper function to parse timestamp fields
// Handles formats: "20250526:12:38:04:123426" (full) and "20250526" (date only)
const parseTimestampField = (value) => {
  if (!value || value === null || value === undefined || value === "") {
    return null;
  }
  const strValue = String(value).trim();
  // Full timestamp: YYYYMMDD:HH:MM:SS:microseconds
  if (strValue.includes(":")) {
    try {
      const parts = strValue.split(":");
      const datePart = parts[0]; // YYYYMMDD
      const timeParts = parts.slice(1);
      if (datePart.length === 8) {
        const year = parseInt(datePart.slice(0,4),10);
        const month = parseInt(datePart.slice(4,6),10);
        const day = parseInt(datePart.slice(6,8),10);
        let hour=0, minute=0, second=0, ms=0;
        if (timeParts.length>0) {
          hour   = parseInt(timeParts[0],10) || 0;
          minute = parseInt(timeParts[1],10) || 0;
          second = parseInt(timeParts[2],10) || 0;
          if (timeParts[3]) {
            ms = Math.floor(parseInt(timeParts[3],10)/1000) || 0;
          }
        }
        const d = new Date(year, month-1, day, hour, minute, second, ms);
        return d.toISOString();
      }
    } catch(err) {
      return strValue;
    }
  }
  // Date only: YYYYMMDD
  if (/^\d{8}$/.test(strValue)) {
    const year = strValue.slice(0,4);
    const month = strValue.slice(4,6);
    const day = strValue.slice(6,8);
    return `${year}-${month}-${day}`;
  }
  return strValue;
};

// Helper function to validate and normalize execution data
const validateAndNormalizeExecution = (executionData, userId, batchId, clientId) => {
  const validationErrors = [];

  // Validate enum fields and store normalized values
  const validatedEnumValues = {};
  const enumValidations = [
    { field: 'executionSide', enum: ExecutionSide, name: 'Execution_Side' },
    { field: 'executionPostingSide', enum: ExecutionPostingSide, name: 'Execution_Posting_Side' },
    { field: 'executionAllocationSide', enum: ExecutionAllocationSide, name: 'Execution_Allocation_Side' },
    { field: 'executionBrokerCapacity', enum: ExecutionBrokerCapacity, name: 'Execution_Broker_Capacity', required: true },
    { field: 'executionCapacity', enum: ExecutionCapacity, name: 'Execution_Capacity' },
    { field: 'executionManualIndicator', enum: ExecutionManualIndicator, name: 'Execution_Manual_Indicator', required: true },
    { field: 'isMarketExecution', enum: IsMarketExecution, name: 'Is_Market_Execution', required: true },
    { field: 'executionTransactionType', enum: ExecutionTransactionType, name: 'Execution_Transaction_Type', required: true },
    { field: 'executionBookingEligiblity', enum: ExecutionBookingEligiblity, name: 'Execution_Booking_Eligiblity' },
    { field: 'executionSwapIndicator', enum: ExecutionSwapIndicator, name: 'Execution_Swap_Indicator' },
    { field: 'executionSecondaryOffering', enum: ExecutionSecondaryOffering, name: 'Execution_Secondary_Offering', required: true },
    { field: 'executonSessionActual', enum: ExecutonSessionActual, name: 'Executon_Session_Actual' },
    { field: 'executionLastLiquidityIndicator', enum: ExecutionLastLiquidityIndicator, name: 'Execution_Last_Liquidity_Indicator' },
    { field: 'executionWaiverIndicator', enum: ExecutionWaiverIndicator, name: 'Execution_Waiver_Indicator' },
    { field: 'executionPackageIndicator', enum: ExecutionPackageIndicator, name: 'Execution_Package_Indicator' },
    { field: 'executionRawLiquidityIndicator', enum: ExecutionRawLiquidityIndicator, name: 'Execution_Raw_Liquidity_Indicator' },
    { field: 'executionNegotiatedIndicator', enum: ExecutionNegotiatedIndicator, name: 'Execution_Negotiated_Indicator' },
    { field: 'executionOpenCloseIndicator', enum: ExecutionOpenCloseIndicator, name: 'Execution_Open_Close_Indicator' },
    { field: 'executionAction', enum: ExecutionAction, name: 'Execution_Action' },
    { field: 'executionInstrumentReference', enum: ExecutionInstrumentReference, name: 'Execution_Instrument_Reference' }
  ];

  // Validate required non-enum fields
  const requiredFields = [
    { field: 'executionEntityId', name: 'Execution_Entity_ID' },
    { field: 'executionSeqNumber', name: 'Execution_Seq_Number' },
    { field: 'executionSymbol', name: 'Execution_Symbol' },
    { field: 'executonOrderId', name: 'Executon_Order_ID' },
    { field: 'executionIdInstance', name: 'Execution_ID_Instance' },
    { field: 'executionTradeExecutionSystem', name: 'Execution_Trade_Execution_System' },
    { field: 'executionTradeDate', name: 'Execution_Trade_Date' },
    { field: 'executionCurrencyId', name: 'Execution_Currency_ID' }
  ];

  requiredFields.forEach(({ field, name }) => {
    const value = executionData[field];
    if (value === null || value === undefined || value === "") {
      validationErrors.push(`${name} is required`);
    }
  });

  // Validate each enum field and store validated value
  enumValidations.forEach(({ field, enum: enumObj, name, required }) => {
    const value = executionData[field];
    if (required && (value === null || value === undefined || value === "")) {
      validationErrors.push(`${name} is required`);
      return;
    }

    const validation = validateEnum(enumObj, value, name);
    if (!validation.valid) {
      validationErrors.push(validation.error);
    } else {
      validatedEnumValues[field] = validation.value;
    }
  });

  // If validation errors exist, throw them
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('; '));
  }

  // Generate uniqueID from executionId + executionIdInstance
  // Create a hash-based short ID (8 characters) for better readability
  const combinedString = `${executionData.executionId || ''}${executionData.executionIdInstance || ''}`;
  const hash = crypto.createHash('md5').update(combinedString).digest('hex').substring(0, 8).toUpperCase();
  const uniqueID = hash;

  const execution = {
    userId,
    batchId,
    clientId,
    uniqueID,
    executionId: executionData.executionId || null,
    previousExecutionId: executionData.previousExecutionId || null,
    executionEntityId: executionData.executionEntityId || null,
    executionVersion: executionData.executionVersion || null,
    executionSeqNumber: executionData.executionSeqNumber || null,
    externalExecutionId: executionData.externalExecutionId || null,
    executionSide: validatedEnumValues.executionSide || null,
    executionPostingSide: validatedEnumValues.executionPostingSide || null,
    executionAllocationSide: validatedEnumValues.executionAllocationSide || null,
    executionBrokerCapacity: validatedEnumValues.executionBrokerCapacity || null,
    executionCapacity: validatedEnumValues.executionCapacity || null,
    executionEventTime: parseTimestampField(executionData.executionEventTime),
    executionTime: parseTimestampField(executionData.executionTime),
    executionManualIndicator: validatedEnumValues.executionManualIndicator || null,
    executionManualEventTime: parseTimestampField(executionData.executionManualEventTime),
    isMarketExecution: validatedEnumValues.isMarketExecution || null,
    executionLastMarket: executionData.executionLastMarket || null,
    executionAccount: executionData.executionAccount || null,
    executionBookingAccount: executionData.executionBookingAccount || null,
    executionBookingEntity: executionData.executionBookingEntity || null,
    executionTradingEntity: executionData.executionTradingEntity || null,
    executionDeskId: executionData.executionDeskId || null,
    executionOsi: executionData.executionOsi || null,
    executionInstrumentId: executionData.executionInstrumentId || null,
    executionLinkedInstrumentId: executionData.executionLinkedInstrumentId || null,
    executionSymbol: executionData.executionSymbol || null,
    executionInstrumentReference: validatedEnumValues.executionInstrumentReference || null,
    executionInstrumentReferenceValue: executionData.executionInstrumentReferenceValue || null,
    executionLastPrice: executionData.executionLastPrice || null,
    executionLastQuantity: executionData.executionLastQuantity || null,
    executionContraBroker: executionData.executionContraBroker || null,
    linkedExecutionId: executionData.linkedExecutionId || null,
    executionTransactionType: validatedEnumValues.executionTransactionType || null,
    executionIdInstance: executionData.executionIdInstance || null,
    executionSession: executionData.executionSession || null,
    executionOrderIdInstance: executionData.executionOrderIdInstance || null,
    executionOrderIdSession: executionData.executionOrderIdSession || null,
    executonOrderId: executionData.executonOrderId || null,
    executionOrderIdVersion: executionData.executionOrderIdVersion || null,
    executionTradeExecutionSystem: executionData.executionTradeExecutionSystem || null,
    executionOmsSource: executionData.executionOmsSource || null,
    executionBookingEligiblity: validatedEnumValues.executionBookingEligiblity || null,
    executionTradeDate: parseTimestampField(executionData.executionTradeDate),
    executionCurrencyId: executionData.executionCurrencyId || null,
    executionPositionId: executionData.executionPositionId || null,
    executionSwapIndicator: validatedEnumValues.executionSwapIndicator || null,
    executionSettleDate: parseTimestampField(executionData.executionSettleDate),
    executionCommisionFee: executionData.executionCommisionFee || null,
    executionRollupId: executionData.executionRollupId || null,
    executionSecondaryOffering: validatedEnumValues.executionSecondaryOffering || null,
    executionCumQuantity: executionData.executionCumQuantity || null,
    executionTradeFactors: executionData.executionTradeFactors || null,
    executionRiskDate: parseTimestampField(executionData.executionRiskDate),
    executionOrderComplianceId: executionData.executionOrderComplianceId || null,
    executionInfoBarrierId: executionData.executionInfoBarrierId || null,
    executonSessionActual: validatedEnumValues.executonSessionActual || null,
    executionStrategy: executionData.executionStrategy || null,
    executionLastLiquidityIndicator: validatedEnumValues.executionLastLiquidityIndicator || null,
    executionWaiverIndicator: validatedEnumValues.executionWaiverIndicator || null,
    executionLifecycleType: executionData.executionLifecycleType || null,
    executionPackageIndicator: validatedEnumValues.executionPackageIndicator || null,
    executionRawLiquidityIndicator: validatedEnumValues.executionRawLiquidityIndicator || null,
    executionPackageId: executionData.executionPackageId || null,
    executionQuoteId: executionData.executionQuoteId || null,
    executionYield: executionData.executionYield || null,
    executionSpread: executionData.executionSpread || null,
    executionNegotiatedIndicator: validatedEnumValues.executionNegotiatedIndicator || null,
    executionOpenCloseIndicator: validatedEnumValues.executionOpenCloseIndicator || null,
    exchangeExecId: executionData.exchangeExecId || null,
    executionAction: validatedEnumValues.executionAction || null,
    executionCrossId: executionData.executionCrossId || null,
    executionExecutingEntity: executionData.executionExecutingEntity || null
  };

  return execution;
};

/**
 * Get executions with optional filters
 * @route GET /api/executions
 */
const getExecutions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      cursor,
      sortBy = "id",
      sortOrder = "desc",
      batchId,
      clientId,
      executionId,
      executionSymbol,
      executingEntity,
      fromDate,
      toDate,
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    const take = Math.min(parseInt(limit), 100);
    const skip = cursor ? 0 : (parseInt(page) - 1) * take;

    // ------------------
    // Build WHERE clause
    // ------------------
    const where = {};

    if (userRole === "admin") {
      if (clientId) where.clientId = String(clientId);
    } else if (userRole === "client") {
      where.clientId = userId.toString();
    } else {
      where.userId = userId;
      if (req.user.clientId) {
        where.clientId = req.user.clientId.toString();
      }
    }

    if (batchId) where.batchId = parseInt(batchId);
    if (executionId) where.executionId = { contains: executionId };
    if (executionSymbol) where.executionSymbol = { contains: executionSymbol };
    if (executingEntity) where.executionExecutingEntity = parseInt(executingEntity);

    if (fromDate || toDate) {
      where.executionTradeDate = {};
      if (fromDate) where.executionTradeDate.gte = fromDate;
      if (toDate) where.executionTradeDate.lte = toDate;
    }

    // ------------------
    // Sorting
    // ------------------
    const validSortFields = [
      "id",
      "createdAt",
      "executionId",
      "executionSymbol",
      "executionTradeDate",
      "batchId",
    ];
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === "asc" ? "asc" : "desc" }
      : { id: "desc" };

    // ------------------
    // Query
    // ------------------
    const queryOpts = {
      where,
      take: take + 1,
      orderBy,
      skip,
    };

    if (cursor) {
      queryOpts.cursor = { id: parseInt(cursor) };
      queryOpts.skip = 1;
    }

    const executions = await prisma.execution.findMany(queryOpts);
    const hasMore = executions.length > take;
    if (hasMore) executions.pop();

    const total = await prisma.execution.count({ where });

    res.json({
      executions,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
        hasMore,
        nextCursor:
          hasMore && executions.length
            ? executions[executions.length - 1].id
            : null,
      },
    });
  } catch (error) {
    console.error("[EXECUTIONS] fetch error", error);
    next(createError(500, "Failed to fetch executions"));
  }
};

const callGroqChatCompletions = async ({ apiKey, model, messages, temperature = 0 }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages,
      temperature,
    });

    const req_ = https.request(
      {
        method: "POST",
        hostname: "api.groq.com",
        path: "/openai/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res_) => {
        let data = "";
        res_.on("data", (chunk) => {
          data += chunk;
        });
        res_.on("end", () => {
          try {
            if (res_.statusCode && res_.statusCode >= 400) {
              return reject(
                createError(
                  res_.statusCode,
                  `Groq API error (${res_.statusCode}): ${data}`
                )
              );
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req_.on("error", reject);
    req_.write(payload);
    req_.end();
  });

const getExecutionsAiBaseUrl = (req) => {
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const protocol = (forwardedProto || req.protocol || "http")
    .toString()
    .split(",")[0]
    .trim();
  const host = (forwardedHost || req.get("host"))
    .toString()
    .split(",")[0]
    .trim();

  return `${protocol}://${host}/api/executions`;
};

const generateExecutionsAiFilterUrl = async (req, res, next) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return next(createError(400, "prompt is required"));
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return next(createError(500, "GROQ_API_KEY is not configured"));
    }

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const executionsBaseUrl = getExecutionsAiBaseUrl(req);

    const systemPrompt = `You are a specialized API Query String Generator. Your goal is to convert user requests into a single, valid URL for the Catalyst API.

### BASE URL
${executionsBaseUrl}

### FIELD MAPPING RULES
- "start date" or "since" -> fromDate (Format: YYYY-MM-DD)
- "end date" or "until" -> toDate (Format: YYYY-MM-DD)
- "id" or "reference" -> executionId
- "currency" or "symbol" -> executionSymbol
- "entity" or "account id" -> executingEntity
- "count" or "amount" -> limit
- "page number" -> page
- "sort" -> sortBy
- "direction" -> sortOrder (Values: "asc" or "desc")

### OUTPUT RULES
1. Return ONLY the full URL.
2. Do not include introductory text, markdown code blocks, or explanations.
3. Ensure all date parameters follow the ISO 8601 format (YYYY-MM-DD).
4. If a parameter is missing, use these defaults: limit=50, page=1, sortBy=createdAt, sortOrder=desc.`;

    const completion = await callGroqChatCompletions({
      apiKey,
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return next(createError(502, "Groq response did not include a URL"));
    }

    const raw = content.trim();
    const candidate = raw.replace(/^['"]|['"]$/g, "");
    const extracted = candidate.match(/https?:\/\/\S+/)?.[0];
    const url = extracted || candidate;

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl) {
        return next(createError(502, `Groq returned an invalid URL: ${raw}`));
      }

      if (!/\/api\/executions\/?$/.test(parsedUrl.pathname)) {
        return next(
          createError(
            502,
            `Groq returned a URL that is not an executions endpoint: ${raw}`
          )
        );
      }
    } catch (e) {
      return next(createError(502, `Groq returned an invalid URL: ${raw}`));
    }

    res.json({ url });
  } catch (error) {
    next(error);
  }
};

// Parse Excel file and convert to JSON array
const parseExcelToJson = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Prefer the first available worksheet (handles files where index 1 may be missing)
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error(`Excel file has no worksheets (found ${workbook.worksheets.length}). Ensure it is a valid .xlsx with at least one sheet.`);
  }

  // Require at least a header row + one data row
  if ((worksheet.rowCount || 0) < 2) {
    throw new Error("Excel file is empty (no data rows found).");
  }

  // Get headers from first row
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
    const headerValue = cell.value ? cell.value.toString().toLowerCase().trim() : '';
    headers.push(headerValue);
  });

  // Validate required fields
  const hasExecutionEntityId = headers.includes("executionentityid") || headers.includes("execution_entity_id");
  if (!hasExecutionEntityId) {
    throw new Error("Excel file must contain 'executionEntityId' or 'Execution_Entity_ID' column");
  }

  const executions = [];
  const errors = [];
  let rowNumber = 1;

  // Parse rows
  worksheet.eachRow((row, index) => {
    if (index === 1) return; // Skip header row
    rowNumber++;

    const executionData = {};

    // Use eachCell with includeEmpty option to process all columns
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      const mappedField = fieldMapping[header];

      if (mappedField) {
        let value = cell.value;

        // Handle integer fields
        if (
          [
            "executionVersion",
            "executionAccount",
            "executionBookingAccount",
            "executionBookingEntity",
            "executionTradingEntity",
            "executionInstrumentId",
            "executionLinkedInstrumentId",
            "executionOrderIdVersion",
            "executionPositionId",
            "executionExecutingEntity",
          ].includes(mappedField)
        ) {
          value = parseIntValue(value);
        }
        // Handle decimal fields
        else if (
          [
            "executionLastPrice",
            "executionLastQuantity",
            "executionCommisionFee",
            "executionCumQuantity",
            "executionTradeFactors",
            "executionYield",
            "executionSpread",
          ].includes(mappedField)
        ) {
          value = parseDecimal(value);
        }
        // All other fields (including dates) are stored as strings
        else if (value !== null && value !== undefined) {
          value = value.toString();
        }

        executionData[mappedField] = value;
      }
    });

    // Debug: log first execution to see what's being parsed
    if (executions.length === 0) {
      console.log('First execution parsed:', JSON.stringify(executionData, null, 2));
    }

    executions.push(executionData);
  });

  console.log(`Parsed ${executions.length} executions from Excel`);
  return { executions, errors };
};

// Unified upload handler for Excel files
const uploadExecutions = async (req, res, next) => {
  let batch = null;
  let filePath = null;

  try {
    const userId = req.user.id;

    // Determine clientId based on user role
    let clientId = null;
    if (req.user.role === 'client') {
      clientId = req.user.id.toString();
    } else if (req.user.role === 'user') {
      clientId = req.user.clientId ? req.user.clientId.toString() : null;
    }

    let executionsArray = [];
    let errors = [];
    let fileNameForBatch = 'execution upload';

    // Check if this is a file upload (Excel)
    if (req.file) {
      // Excel file upload
      filePath = req.file.path;
      fileNameForBatch = req.file.originalname || req.file.filename || 'execution upload';

      // Parse Excel to JSON
      const parseResult = await parseExcelToJson(filePath);
      executionsArray = parseResult.executions;
      errors = parseResult.errors;

      // Clean up file after parsing
      await fs.unlink(filePath);
      filePath = null;
    } else {
      return next(createError(400, "File upload is required"));
    }

    // Validate all executions FIRST (before creating batch)
    const validExecutions = [];
    executionsArray.forEach((executionData, index) => {
      try {
        // Validate without batch.id (we'll add it after batch creation)
        const normalizedExecution = validateAndNormalizeExecution(executionData, userId, null, clientId);
        validExecutions.push(normalizedExecution);
      } catch (validationError) {
        // Split multiple errors (separated by semicolons) into separate error objects
        const errorMessages = validationError.message.split('; ');
        errorMessages.forEach(errorMsg => {
          errors.push({
            index: index,
            executionId: executionData.executionId,
            error: errorMsg,
          });
        });
      }
    });

    // Log validation summary
    if (errors.length > 0) {
      console.log(`[EXECUTION VALIDATION] Summary: ${validExecutions.length} valid, ${errors.length} failed out of ${executionsArray.length} total`);
      if (errors.length <= 10) {
        // Show all errors if there are 10 or fewer
        errors.forEach((err, idx) => {
          console.error(`  [${idx + 1}] Row ${err.index + 2}, ExecutionID: ${err.executionId || 'N/A'} - ${err.error}`);
        });
      } else {
        // Show first 5 and last 5 if more than 10 errors
        console.error('  First 5 errors:');
        errors.slice(0, 5).forEach((err, idx) => {
          console.error(`    [${idx + 1}] Row ${err.index + 2}, ExecutionID: ${err.executionId || 'N/A'} - ${err.error}`);
        });
        console.error(`  ... ${errors.length - 10} more errors ...`);
        console.error('  Last 5 errors:');
        errors.slice(-5).forEach((err, idx) => {
          console.error(`    [${errors.length - 5 + idx + 1}] Row ${err.index + 2}, ExecutionID: ${err.executionId || 'N/A'} - ${err.error}`);
        });
      }
    }

    // If no valid executions, still create batch and store rejected executions (mirror orders behavior)
    if (validExecutions.length === 0) {
      console.error('[EXECUTION VALIDATION] All executions failed validation:');
      errors.forEach((err, idx) => {
        console.error(`  [${idx + 1}] Row ${err.index + 2}, ExecutionID: ${err.executionId || 'N/A'} - ${err.error}`);
      });

      const uniqueRejectedExecutionIndices = new Set(errors.map((err) => err.index));
      const rejectedExecutionsCount = uniqueRejectedExecutionIndices.size;

      batch = await prisma.batch.create({
        data: {
          userId,
          status: "completed",
          fileName: fileNameForBatch,
          tradeDate: req.body.tradeDate ? new Date(req.body.tradeDate) : null,
          fileType: req.body.fileType || 'execution',
          validation_1: null,
          validation_1_status: null,
          validation_2: null,
          validation_2_status: null,
          validation_3: null,
          validation_3_status: null,
          totalOrders: executionsArray.length,
          successfulOrders: 0,
          failedOrders: rejectedExecutionsCount,
          errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
          completedAt: new Date(),
        },
      });

      // Persist rejected executions
      try {
        const uploadType = req.file ? 'excel' : 'json';
        const errorsByIndex = {};
        errors.forEach((err) => {
          if (!errorsByIndex[err.index]) errorsByIndex[err.index] = [];
          errorsByIndex[err.index].push(err.error);
        });
        const rejectedExecutionsData = Object.keys(errorsByIndex).map((index) => {
          const idx = parseInt(index);
          const executionData = executionsArray[idx];
          const errorMessages = errorsByIndex[index];
          return {
            batchId: batch.id,
            userId: userId,
            rowNumber: uploadType === 'excel' ? idx + 2 : null,
            jsonIndex: uploadType === 'json' ? idx : null,
            executionId: executionData?.executionId || null,
            rawData: executionData ? JSON.stringify(executionData) : null,
            validationErrors: JSON.stringify(errorMessages),
            uploadType: uploadType,
          };
        });

        await prisma.rejectedExecution.createMany({
          data: rejectedExecutionsData,
          skipDuplicates: false,
        });
        console.log(`[REJECTED EXECUTIONS] Saved ${rejectedExecutionsData.length} rejected executions to database`);
      } catch (dbError) {
        console.error('[REJECTED EXECUTIONS] Failed to save rejected executions to database:', dbError);
      }

      return res.status(201).json({
        message: "All records rejected (no valid executions). Batch created for tracking.",
        total: executionsArray.length,
        imported: 0,
        failed: errors.length,
        errors,
        batchId: batch.id,
      });
    }

    // Create batch record ONLY if we have valid executions
    batch = await prisma.batch.create({
      data: {
        userId,
        status: "in_progress",
        fileName: fileNameForBatch,
        tradeDate: req.body.tradeDate ? new Date(req.body.tradeDate) : null,
        fileType: req.body.fileType || 'execution',
        validation_1: null,
        validation_1_status: null,
        validation_2: null,
        validation_2_status: null,
        validation_3: null,
        validation_3_status: null,
      },
    });

    // List of enum fields that need to be converted to strings
    const enumFields = [
      'executionSide', 'executionPostingSide', 'executionAllocationSide',
      'executionBrokerCapacity', 'executionCapacity', 'executionManualIndicator',
      'isMarketExecution', 'executionTransactionType', 'executionBookingEligiblity',
      'executionSwapIndicator', 'executionSecondaryOffering', 'executonSessionActual',
      'executionLastLiquidityIndicator', 'executionWaiverIndicator', 'executionPackageIndicator',
      'executionRawLiquidityIndicator', 'executionNegotiatedIndicator', 'executionOpenCloseIndicator',
      'executionAction', 'executionInstrumentReference'
    ];

    // Add batchId to all valid executions and convert enum fields to strings
    validExecutions.forEach(execution => {
      execution.batchId = batch.id;
      
      // Convert all enum fields from integers to strings
      enumFields.forEach(field => {
        if (execution[field] !== null && execution[field] !== undefined && execution[field] !== '') {
          execution[field] = String(execution[field]);
        }
      });
    });

    // Insert executions into database
    const result = await prisma.execution.createMany({
      data: validExecutions,
      skipDuplicates: false,
    });

    // Count unique rejected executions (not error messages)
    const uniqueRejectedExecutionIndices = new Set(errors.map(err => err.index));
    const rejectedExecutionsCount = uniqueRejectedExecutionIndices.size;

    // Update batch with success statistics
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        totalOrders: executionsArray.length,
        successfulOrders: result.count,
        failedOrders: rejectedExecutionsCount,
        status: "completed",
        errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
        completedAt: new Date(),
      },
    });

    // Save rejected executions to database (if table exists)
    if (errors.length > 0) {
      try {
        // Determine upload type (excel vs json)
        const uploadType = req.file ? 'excel' : 'json';

        // Group errors by index to handle multiple errors per execution
        const errorsByIndex = {};
        errors.forEach(err => {
          if (!errorsByIndex[err.index]) {
            errorsByIndex[err.index] = [];
          }
          errorsByIndex[err.index].push(err.error);
        });

        // Prepare rejected executions data
        const rejectedExecutionsData = Object.keys(errorsByIndex).map(index => {
          const idx = parseInt(index);
          const executionData = executionsArray[idx];
          const errorMessages = errorsByIndex[index];

          return {
            batchId: batch.id,
            userId: userId,
            rowNumber: uploadType === 'excel' ? idx + 2 : null, // Excel row number (header is row 1)
            jsonIndex: uploadType === 'json' ? idx : null, // JSON array index
            executionId: executionData?.executionId || null,
            rawData: executionData ? JSON.stringify(executionData) : null,
            validationErrors: JSON.stringify(errorMessages),
            uploadType: uploadType,
          };
        });

        // Try to insert rejected executions (may fail if table doesn't exist yet)
        try {
          await prisma.rejectedExecution.createMany({
            data: rejectedExecutionsData,
            skipDuplicates: false,
          });
          console.log(`[REJECTED EXECUTIONS] Saved ${rejectedExecutionsData.length} rejected executions to database`);
        } catch (tableError) {
          // Table might not exist yet, log but don't fail the upload
          console.warn('[REJECTED EXECUTIONS] Could not save to database (table may not exist):', tableError.message);
        }
      } catch (dbError) {
        console.error('[REJECTED EXECUTIONS] Failed to process rejected executions:', dbError);
        // Don't fail the entire request if we can't save rejected executions
      }
    }

    res.status(201).json({
      message: "Executions uploaded successfully",
      batchId: batch.id,
      imported: result.count,
      total: executionsArray.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Update batch as failed if it was created
    if (batch) {
      try {
        await prisma.batch.update({
          where: { id: batch.id },
          data: {
            status: "completed",
            errorLog: error.message,
            completedAt: new Date(),
          },
        });
      } catch (updateError) {
        console.error("Failed to update batch:", updateError);
      }
    }

    // Clean up file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error("Failed to delete file:", unlinkError);
      }
    }

    next(error);
  }
};

// Export controller functions
module.exports = {
  fieldMapping,
  validateAndNormalizeExecution,
  parseExcelToJson,
  uploadExecutions,
  getExecutions,
  generateExecutionsAiFilterUrl,
};
