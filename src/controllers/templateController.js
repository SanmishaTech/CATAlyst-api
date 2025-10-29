const ExcelJS = require("exceljs");
const createError = require("http-errors");

// Download Excel template with headers
const downloadOrderTemplate = async (req, res, next) => {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Define headers (matching the field mapping in orderController)
    const headers = [
      "orderId",
      "clientId",
      "orderIdVersion",
      "orderIdSession",
      "orderIdInstance",
      "parentOrderId",
      "cancelReplaceOrderId",
      "linkedOrderId",
      "orderAction",
      "orderStatus",
      "orderCapacity",
      "orderDestination",
      "orderClientRef",
      "orderClientRefDetails",
      "orderExecutingEntity",
      "orderBookingEntity",
      "orderPositionAccount",
      "orderSite",
      "orderClientCapacity",
      "orderManualIndicator",
      "orderRequestTime",
      "orderEventTime",
      "orderManualTimestamp",
      "orderOmsSource",
      "orderPublishingTime",
      "orderTradeDate",
      "orderQuantity",
      "orderPrice",
      "orderType",
      "orderTimeInForce",
      "orderExecutionInstruction",
      "orderAttributes",
      "orderRestriction",
      "orderAuctionIndicator",
      "orderSwapIndicator",
      "orderOsi",
      "orderInstrumentId",
      "orderLinkedInstrumentId",
      "orderCurrencyId",
      "orderFlowType",
      "orderAlgoInstruction",
      "orderSymbol",
      "orderInstrumentReference",
      "orderInstrumentReferenceValue",
      "orderOptionPutCall",
      "orderOptionStrikePrice",
      "orderOptionLegIndicator",
      "orderComplianceId",
      "orderEntityId",
      "orderExecutingAccount",
      "orderClearingAccount",
      "orderClientOrderId",
      "orderRoutedOrderId",
      "orderTradingOwner",
      "orderExtendedAttribute",
    ];

    // Add header row
    worksheet.addRow(headers);

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Set column widths
    worksheet.columns = headers.map((header) => ({
      width: Math.max(header.length + 2, 15),
    }));

    // Add a sample row with example data
    worksheet.addRow([
      "ORD-001", // orderId (REQUIRED)
      "CLIENT-123", // clientId
      "v1", // orderIdVersion
      "session-001", // orderIdSession
      "instance-001", // orderIdInstance
      "", // parentOrderId
      "", // cancelReplaceOrderId
      "", // linkedOrderId
      "NEW", // orderAction
      "PENDING", // orderStatus
      "AGENCY", // orderCapacity
      "NYSE", // orderDestination
      "REF-001", // orderClientRef
      "", // orderClientRefDetails
      "ENTITY-001", // orderExecutingEntity
      "BOOKING-001", // orderBookingEntity
      "ACC-001", // orderPositionAccount
      "SITE-001", // orderSite
      "PRINCIPAL", // orderClientCapacity
      "N", // orderManualIndicator
      "2025-10-29T08:00:00Z", // orderRequestTime
      "2025-10-29T08:00:01Z", // orderEventTime
      "", // orderManualTimestamp
      "OMS-001", // orderOmsSource
      "2025-10-29T08:00:02Z", // orderPublishingTime
      "2025-10-29", // orderTradeDate
      "100", // orderQuantity
      "150.50", // orderPrice
      "LIMIT", // orderType
      "DAY", // orderTimeInForce
      "", // orderExecutionInstruction
      "", // orderAttributes
      "", // orderRestriction
      "N", // orderAuctionIndicator
      "N", // orderSwapIndicator
      "", // orderOsi
      "INST-001", // orderInstrumentId
      "", // orderLinkedInstrumentId
      "USD", // orderCurrencyId
      "NORMAL", // orderFlowType
      "", // orderAlgoInstruction
      "AAPL", // orderSymbol
      "ISIN", // orderInstrumentReference
      "US0378331005", // orderInstrumentReferenceValue
      "", // orderOptionPutCall
      "", // orderOptionStrikePrice
      "", // orderOptionLegIndicator
      "COMP-001", // orderComplianceId
      "ENT-001", // orderEntityId
      "EXEC-ACC-001", // orderExecutingAccount
      "CLEAR-ACC-001", // orderClearingAccount
      "CLI-ORD-001", // orderClientOrderId
      "ROUTE-001", // orderRoutedOrderId
      "TRADER-001", // orderTradingOwner
      '{"key": "value"}', // orderExtendedAttribute
    ]);

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.getColumn(1).width = 50;

    instructionsSheet.addRow([
      "Order Import Template - Instructions",
    ]).font = { bold: true, size: 14 };
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Required Fields:"]);
    instructionsSheet.addRow([
      "  • orderId - Unique identifier for the order (REQUIRED)",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Date Format:"]);
    instructionsSheet.addRow([
      "  • Use ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ",
    ]);
    instructionsSheet.addRow(["  • Example: 2025-10-29T08:00:00Z"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Numeric Fields:"]);
    instructionsSheet.addRow([
      "  • orderQuantity - Decimal number (e.g., 100.5)",
    ]);
    instructionsSheet.addRow(["  • orderPrice - Decimal number (e.g., 150.50)"]);
    instructionsSheet.addRow([
      "  • orderOptionStrikePrice - Decimal number",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Notes:"]);
    instructionsSheet.addRow([
      "  • Delete the sample row before importing your data",
    ]);
    instructionsSheet.addRow([
      "  • Keep the header row (first row) unchanged",
    ]);
    instructionsSheet.addRow([
      "  • Duplicate orderIds will be skipped automatically",
    ]);
    instructionsSheet.addRow([
      "  • Empty cells are allowed for optional fields",
    ]);

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="order_import_template.xlsx"'
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Template generation error:", error);
    next(error);
  }
};

module.exports = {
  downloadOrderTemplate,
};
