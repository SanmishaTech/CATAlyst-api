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

    // Add 10 test rows - 5 VALID and 5 INVALID (for testing validation)
    
    // ========== VALID ROWS (1-5) ==========
    
    // Valid Row 1
    const testRow1 = new Array(headers.length).fill("");
    testRow1[0] = "ORD-001"; // orderId (REQUIRED)
    testRow1[7] = "Order Requested"; // orderAction (REQUIRED)
    testRow1[9] = "Agency"; // orderCapacity (REQUIRED)
    testRow1[16] = "Buy"; // orderSide (REQUIRED)
    testRow1[27] = "Limit"; // orderType (REQUIRED)
    testRow1[22] = "TradingSystem1"; // orderOmsSource (REQUIRED)
    testRow1[23] = "2024-01-15T09:30:00"; // orderPublishingTime (REQUIRED)
    testRow1[46] = "COMP-001"; // orderComplianceId (REQUIRED)
    testRow1[99] = "OMS-SYSTEM-1"; // orderOriginationSystem (REQUIRED)
    testRow1[40] = "AAPL"; // orderSymbol
    testRow1[25] = 100; // orderQuantity
    testRow1[26] = 150.50; // orderPrice
    worksheet.addRow(testRow1);
    
    // Valid Row 2
    const testRow2 = new Array(headers.length).fill("");
    testRow2[0] = "ORD-002"; // orderId
    testRow2[7] = "Order Replaced"; // orderAction
    testRow2[9] = "Principal"; // orderCapacity
    testRow2[16] = "Sell Long"; // orderSide
    testRow2[27] = "Market"; // orderType
    testRow2[22] = "TradingSystem1"; // orderOmsSource
    testRow2[23] = "2024-01-15T09:31:00"; // orderPublishingTime
    testRow2[46] = "COMP-002"; // orderComplianceId
    testRow2[99] = "OMS-SYSTEM-1"; // orderOriginationSystem
    testRow2[40] = "MSFT"; // orderSymbol
    testRow2[25] = 200; // orderQuantity
    testRow2[26] = 380.25; // orderPrice
    worksheet.addRow(testRow2);
    
    // Valid Row 3
    const testRow3 = new Array(headers.length).fill("");
    testRow3[0] = "ORD-003"; // orderId
    testRow3[7] = "Order Requested"; // orderAction
    testRow3[9] = "Agency"; // orderCapacity
    testRow3[16] = "Buy"; // orderSide
    testRow3[27] = "Stop Loss"; // orderType
    testRow3[22] = "TradingSystem2"; // orderOmsSource
    testRow3[23] = "2024-01-15T09:32:00"; // orderPublishingTime
    testRow3[46] = "COMP-003"; // orderComplianceId
    testRow3[99] = "OMS-SYSTEM-2"; // orderOriginationSystem
    testRow3[40] = "GOOGL"; // orderSymbol
    testRow3[25] = 50; // orderQuantity
    testRow3[26] = 140.00; // orderPrice
    worksheet.addRow(testRow3);
    
    // Valid Row 4
    const testRow4 = new Array(headers.length).fill("");
    testRow4[0] = "ORD-004"; // orderId
    testRow4[7] = "Order Canceled"; // orderAction
    testRow4[9] = "Riskless Principal"; // orderCapacity
    testRow4[16] = "Sell Short"; // orderSide
    testRow4[27] = "Limit"; // orderType
    testRow4[22] = "TradingSystem1"; // orderOmsSource
    testRow4[23] = "2024-01-15T09:33:00"; // orderPublishingTime
    testRow4[46] = "COMP-004"; // orderComplianceId
    testRow4[99] = "OMS-SYSTEM-1"; // orderOriginationSystem
    testRow4[40] = "TSLA"; // orderSymbol
    testRow4[25] = 75; // orderQuantity
    testRow4[26] = 245.75; // orderPrice
    worksheet.addRow(testRow4);
    
    // Valid Row 5
    const testRow5 = new Array(headers.length).fill("");
    testRow5[0] = "ORD-005"; // orderId
    testRow5[7] = "Order Requested"; // orderAction
    testRow5[9] = "Agency"; // orderCapacity
    testRow5[16] = "Buy"; // orderSide
    testRow5[27] = "Market"; // orderType
    testRow5[22] = "TradingSystem3"; // orderOmsSource
    testRow5[23] = "2024-01-15T09:34:00"; // orderPublishingTime
    testRow5[46] = "COMP-005"; // orderComplianceId
    testRow5[99] = "OMS-SYSTEM-3"; // orderOriginationSystem
    testRow5[40] = "NVDA"; // orderSymbol
    testRow5[25] = 150; // orderQuantity
    testRow5[26] = 495.50; // orderPrice
    worksheet.addRow(testRow5);
    
    // ========== INVALID ROWS (6-10) - Each missing a REQUIRED field ==========
    
    // Invalid Row 6 - Missing orderId
    const testRow6 = new Array(headers.length).fill("");
    testRow6[0] = ""; // ❌ MISSING orderId
    testRow6[7] = "Order Requested"; // orderAction
    testRow6[9] = "Agency"; // orderCapacity
    testRow6[16] = "Buy"; // orderSide
    testRow6[27] = "Limit"; // orderType
    testRow6[22] = "TradingSystem1"; // orderOmsSource
    testRow6[23] = "2024-01-15T09:35:00"; // orderPublishingTime
    testRow6[46] = "COMP-006"; // orderComplianceId
    testRow6[99] = "OMS-SYSTEM-1"; // orderOriginationSystem
    testRow6[40] = "AMZN"; // orderSymbol
    testRow6[25] = 80; // orderQuantity
    testRow6[26] = 175.00; // orderPrice
    const row6 = worksheet.addRow(testRow6);
    row6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    
    // Invalid Row 7 - Missing orderAction
    const testRow7 = new Array(headers.length).fill("");
    testRow7[0] = "ORD-007"; // orderId
    testRow7[7] = ""; // ❌ MISSING orderAction
    testRow7[9] = "Principal"; // orderCapacity
    testRow7[16] = "Sell Long"; // orderSide
    testRow7[27] = "Market"; // orderType
    testRow7[22] = "TradingSystem2"; // orderOmsSource
    testRow7[23] = "2024-01-15T09:36:00"; // orderPublishingTime
    testRow7[46] = "COMP-007"; // orderComplianceId
    testRow7[99] = "OMS-SYSTEM-2"; // orderOriginationSystem
    testRow7[40] = "META"; // orderSymbol
    testRow7[25] = 120; // orderQuantity
    testRow7[26] = 485.25; // orderPrice
    const row7 = worksheet.addRow(testRow7);
    row7.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    
    // Invalid Row 8 - Missing orderCapacity
    const testRow8 = new Array(headers.length).fill("");
    testRow8[0] = "ORD-008"; // orderId
    testRow8[7] = "Order Requested"; // orderAction
    testRow8[9] = ""; // ❌ MISSING orderCapacity
    testRow8[16] = "Buy"; // orderSide
    testRow8[27] = "Limit"; // orderType
    testRow8[22] = "TradingSystem1"; // orderOmsSource
    testRow8[23] = "2024-01-15T09:37:00"; // orderPublishingTime
    testRow8[46] = "COMP-008"; // orderComplianceId
    testRow8[99] = "OMS-SYSTEM-1"; // orderOriginationSystem
    testRow8[40] = "NFLX"; // orderSymbol
    testRow8[25] = 60; // orderQuantity
    testRow8[26] = 625.00; // orderPrice
    const row8 = worksheet.addRow(testRow8);
    row8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    
    // Invalid Row 9 - Missing orderSide
    const testRow9 = new Array(headers.length).fill("");
    testRow9[0] = "ORD-009"; // orderId
    testRow9[7] = "Order Replaced"; // orderAction
    testRow9[9] = "Agency"; // orderCapacity
    testRow9[16] = ""; // ❌ MISSING orderSide
    testRow9[27] = "Market"; // orderType
    testRow9[22] = "TradingSystem3"; // orderOmsSource
    testRow9[23] = "2024-01-15T09:38:00"; // orderPublishingTime
    testRow9[46] = "COMP-009"; // orderComplianceId
    testRow9[99] = "OMS-SYSTEM-3"; // orderOriginationSystem
    testRow9[40] = "AMD"; // orderSymbol
    testRow9[25] = 200; // orderQuantity
    testRow9[26] = 165.50; // orderPrice
    const row9 = worksheet.addRow(testRow9);
    row9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    
    // Invalid Row 10 - Missing orderType
    const testRow10 = new Array(headers.length).fill("");
    testRow10[0] = "ORD-010"; // orderId
    testRow10[7] = "Order Requested"; // orderAction
    testRow10[9] = "Principal"; // orderCapacity
    testRow10[16] = "Sell Short Exempt"; // orderSide
    testRow10[27] = ""; // ❌ MISSING orderType
    testRow10[22] = "TradingSystem2"; // orderOmsSource
    testRow10[23] = "2024-01-15T09:39:00"; // orderPublishingTime
    testRow10[46] = "COMP-010"; // orderComplianceId
    testRow10[99] = "OMS-SYSTEM-2"; // orderOriginationSystem
    testRow10[40] = "INTC"; // orderSymbol
    testRow10[25] = 300; // orderQuantity
    testRow10[26] = 42.75; // orderPrice
    const row10 = worksheet.addRow(testRow10);
    row10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };

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
      "  • 10 test rows included: 5 VALID + 5 INVALID (for testing)",
    ]);
    instructionsSheet.addRow([
      "  • Invalid rows (6-10) are highlighted in RED",
    ]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Required Fields (9 total):"]);
    instructionsSheet.addRow([
      "  1. orderId - Unique identifier (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  2. orderAction - e.g. Order Requested, Order Canceled, Order Replaced (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  3. orderCapacity - e.g. Agency, Principal, Riskless Principal (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  4. orderSide - e.g. Buy, Sell Long, Sell Short (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  5. orderType - e.g. Market, Limit, Stop Loss, Stop Limit (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  6. orderOmsSource - OMS source system identifier (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  7. orderPublishingTime - Publishing timestamp (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  8. orderComplianceId - Compliance identifier (REQUIRED)",
    ]);
    instructionsSheet.addRow([
      "  9. orderOriginationSystem - Origination system identifier (REQUIRED)",
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
      "  • Delete all 10 test rows (rows 2-11) before importing your data",
    ]);
    instructionsSheet.addRow([
      "  • Rows 2-6 are VALID examples, rows 7-11 are INVALID (highlighted RED)",
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
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Validation Behavior:"]);
    instructionsSheet.addRow([
      "  • Valid orders will be imported successfully",
    ]);
    instructionsSheet.addRow([
      "  • Invalid orders will be SKIPPED (not imported)",
    ]);
    instructionsSheet.addRow([
      "  • API will return a list of errors for failed orders",
    ]);
    instructionsSheet.addRow([
      "  • Test it: Upload this file AS IS to see 5 succeed and 5 fail",
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
