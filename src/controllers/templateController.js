const ExcelJS = require("exceljs");
const createError = require("http-errors");

// Download Excel template with headers
const downloadOrderTemplate = async (req, res, next) => {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Define headers - All 101 order fields (matching the field mapping in orderController)
    const headers = [
      "orderId",
      "orderIdVersion",
      "orderIdSession",
      "orderIdInstance",
      "parentOrderId",
      "cancelreplaceOrderId",
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
      "orderSide",
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
      "orderTimeInforce",
      "orderExecutionInstructions",
      "orderAttributes",
      "orderRestrictions",
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
      "orderQuoteId",
      "orderRepresentOrderId",
      "orderOnBehalfCompId",
      "orderSpread",
      "orderAmendReason",
      "orderCancelRejectReason",
      "orderBidSize",
      "orderBidPrice",
      "orderAskSize",
      "orderAskPrice",
      "orderBasketId",
      "orderCumQty",
      "orderLeavesQty",
      "orderStopPrice",
      "orderDiscretionPrice",
      "orderExdestinationInstruction",
      "orderExecutionParameter",
      "orderInfobarrierId",
      "orderLegRatio",
      "orderLocateId",
      "orderNegotiatedIndicator",
      "orderOpenClose",
      "orderParticipantPriorityCode",
      "orderActionInitiated",
      "orderPackageIndicator",
      "orderPackageId",
      "orderPackagePricetype",
      "orderStrategyType",
      "orderSecondaryOffering",
      "orderStartTime",
      "orderTifExpiration",
      "orderParentChildType",
      "orderMinimumQty",
      "orderTradingSession",
      "orderDisplayPrice",
      "orderSeqNumber",
      "atsDisplayIndicator",
      "orderDisplayQty",
      "orderWorkingPrice",
      "atsOrderType",
      "orderNbboSource",
      "orderNbboTimestamp",
      "orderSolicitationFlag",
      "orderNetPrice",
      "routeRejectedFlag",
      "orderOriginationSystem",
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

    // Add 5 test rows with example data (101 columns total)
    
    // Test Row 1
    const testRow1 = new Array(headers.length).fill("");
    testRow1[0] = "ORD-001"; // orderId (REQUIRED)
    testRow1[1] = 1; // orderIdVersion
    testRow1[2] = 1; // orderIdSession
    testRow1[6] = "NEW"; // orderAction
    testRow1[7] = "PENDING"; // orderStatus
    testRow1[16] = "BUY"; // orderSide
    testRow1[25] = 100; // orderQuantity
    testRow1[26] = 150.50; // orderPrice
    testRow1[27] = "LIMIT"; // orderType
    testRow1[28] = "DAY"; // orderTimeInforce
    testRow1[40] = "AAPL"; // orderSymbol
    worksheet.addRow(testRow1);
    
    // Test Row 2
    const testRow2 = new Array(headers.length).fill("");
    testRow2[0] = "ORD-002"; // orderId
    testRow2[1] = 1; // orderIdVersion
    testRow2[2] = 1; // orderIdSession
    testRow2[6] = "NEW"; // orderAction
    testRow2[7] = "FILLED"; // orderStatus
    testRow2[16] = "SELL"; // orderSide
    testRow2[25] = 50; // orderQuantity
    testRow2[26] = 2800.00; // orderPrice
    testRow2[27] = "MARKET"; // orderType
    testRow2[40] = "GOOGL"; // orderSymbol
    worksheet.addRow(testRow2);
    
    // Test Row 3
    const testRow3 = new Array(headers.length).fill("");
    testRow3[0] = "ORD-003"; // orderId
    testRow3[1] = 2; // orderIdVersion
    testRow3[2] = 1; // orderIdSession
    testRow3[6] = "REPLACE"; // orderAction
    testRow3[7] = "PENDING"; // orderStatus
    testRow3[16] = "BUY"; // orderSide
    testRow3[25] = 200; // orderQuantity
    testRow3[26] = 350.25; // orderPrice
    testRow3[27] = "LIMIT"; // orderType
    testRow3[28] = "GTC"; // orderTimeInforce
    testRow3[39] = "VWAP"; // orderAlgoInstruction
    testRow3[40] = "MSFT"; // orderSymbol
    worksheet.addRow(testRow3);
    
    // Test Row 4
    const testRow4 = new Array(headers.length).fill("");
    testRow4[0] = "ORD-004"; // orderId
    testRow4[1] = 1; // orderIdVersion
    testRow4[2] = 2; // orderIdSession
    testRow4[6] = "NEW"; // orderAction
    testRow4[7] = "CANCELLED"; // orderStatus
    testRow4[16] = "BUY"; // orderSide
    testRow4[25] = 75; // orderQuantity
    testRow4[26] = 180.00; // orderPrice
    testRow4[27] = "STOP"; // orderType
    testRow4[28] = "DAY"; // orderTimeInforce
    testRow4[40] = "TSLA"; // orderSymbol
    testRow4[67] = 175.00; // orderStopPrice
    worksheet.addRow(testRow4);
    
    // Test Row 5
    const testRow5 = new Array(headers.length).fill("");
    testRow5[0] = "ORD-005"; // orderId
    testRow5[1] = 1; // orderIdVersion
    testRow5[2] = 1; // orderIdSession
    testRow5[6] = "NEW"; // orderAction
    testRow5[7] = "PARTIAL"; // orderStatus
    testRow5[16] = "SELL"; // orderSide
    testRow5[25] = 150; // orderQuantity
    testRow5[26] = 95.75; // orderPrice
    testRow5[27] = "LIMIT"; // orderType
    testRow5[28] = "IOC"; // orderTimeInforce
    testRow5[40] = "NVDA"; // orderSymbol
    testRow5[60] = 100; // orderCumQty (filled quantity)
    testRow5[61] = 50; // orderLeavesQty (remaining)
    worksheet.addRow(testRow5);

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.getColumn(1).width = 50;

    instructionsSheet.addRow([
      "Order Import Template - Instructions",
    ]).font = { bold: true, size: 14 };
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Template Information:"]);
    instructionsSheet.addRow([
      "  • This template contains 101 order fields",
    ]);
    instructionsSheet.addRow([
      "  • 5 test rows are included as examples",
    ]);
    instructionsSheet.addRow([
      "  • All fields are optional except orderId",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Required Fields:"]);
    instructionsSheet.addRow([
      "  • orderId - Unique identifier for the order (REQUIRED)",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Auto-Set Fields:"]);
    instructionsSheet.addRow([
      "  • clientId - Automatically set based on your user role (DO NOT include in Excel)",
    ]);
    instructionsSheet.addRow([
      "    - If you're a client: Your own ID is used",
    ]);
    instructionsSheet.addRow([
      "    - If you're a user: Your associated client's ID is used",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Field Types:"]);
    instructionsSheet.addRow([
      "  • Integer fields: orderIdVersion, orderIdSession, orderCapacity, orderDestination",
    ]);
    instructionsSheet.addRow([
      "  • Decimal fields: orderQuantity, orderPrice, all size/price fields",
    ]);
    instructionsSheet.addRow([
      "  • String fields: All dates, IDs, indicators (no date conversion needed)",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Date/Time Format:"]);
    instructionsSheet.addRow([
      "  • Dates are stored as strings - use any readable format",
    ]);
    instructionsSheet.addRow([
      "  • Recommended: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
    ]);
    instructionsSheet.addRow(["  • Example: 2025-10-30T08:00:00Z or 2025-10-30"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Important Notes:"]);
    instructionsSheet.addRow([
      "  • Delete the 5 test rows (rows 2-6) before importing your data",
    ]);
    instructionsSheet.addRow([
      "  • Keep the header row (row 1) unchanged",
    ]);
    instructionsSheet.addRow([
      "  • Duplicate orderIds are ALLOWED - each row creates a new record",
    ]);
    instructionsSheet.addRow([
      "  • Empty cells are allowed for optional fields (will be stored as NULL)",
    ]);
    instructionsSheet.addRow([
      "  • You can use either snake_case (order_id) or camelCase (orderId) headers",
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
