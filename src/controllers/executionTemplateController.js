const ExcelJS = require("exceljs");
const createError = require("http-errors");

const {
  ExecutionSide,
  ExecutionBrokerCapacity,
  ExecutionManualIndicator,
  IsMarketExecution,
  ExecutionTransactionType,
  ExecutionSecondaryOffering,
  ExecutonSessionActual
} = require("../constants/executionEnums");

// Download Excel template with headers for executions
const downloadExecutionTemplate = async (req, res, next) => {
  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Executions");

    // Define headers - All 72 execution fields
    const headers = [
      "executionId",
      "previousExecutionId",
      "executionEntityId",
      "executionVersion",
      "executionSeqNumber",
      "externalExecutionId",
      "executionSide",
      "executionPostingSide",
      "executionAllocationSide",
      "executionBrokerCapacity",
      "executionCapacity",
      "executionEventTime",
      "executionTime",
      "executionManualIndicator",
      "executionManualEventTime",
      "isMarketExecution",
      "executionLastMarket",
      "executionAccount",
      "executionBookingAccount",
      "executionBookingEntity",
      "executionTradingEntity",
      "executionDeskId",
      "executionOsi",
      "executionInstrumentId",
      "executionLinkedInstrumentId",
      "executionSymbol",
      "executionInstrumentReference",
      "executionInstrumentReferenceValue",
      "executionLastPrice",
      "executionLastQuantity",
      "executionContraBroker",
      "linkedExecutionId",
      "executionTransactionType",
      "executionIdInstance",
      "executionSession",
      "executionOrderIdInstance",
      "executionOrderIdSession",
      "executonOrderId",
      "executionOrderIdVersion",
      "executionTradeExecutionSystem",
      "executionOmsSource",
      "executionBookingEligiblity",
      "executionTradeDate",
      "executionCurrencyId",
      "executionPositionId",
      "executionSwapIndicator",
      "executionSettleDate",
      "executionCommisionFee",
      "executionRollupId",
      "executionSecondaryOffering",
      "executionCumQuantity",
      "executionTradeFactors",
      "executionRiskDate",
      "executionOrderComplianceId",
      "executionInfoBarrierId",
      "executonSessionActual",
      "executionStrategy",
      "executionLastLiquidityIndicator",
      "executionWaiverIndicator",
      "executionLifecycleType",
      "executionPackageIndicator",
      "executionRawLiquidityIndicator",
      "executionPackageId",
      "executionQuoteId",
      "executionYield",
      "executionSpread",
      "executionNegotiatedIndicator",
      "executionOpenCloseIndicator",
      "exchangeExecId",
      "executionAction",
      "executionCrossId",
      "executionExecutingEntity",
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

    // Add 5 VALID test rows
    const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN"];
    const validSides = ["Buy", "Sell Long", "Sell Short"];
    const validBrokerCapacities = ["Agency", "Principal"];
    const validTransactionTypes = ["Street", "Client", "Internal"];
    const validSessions = ["DAY", "PRE-SESSION", "POST-SESSION"];

    for (let i = 1; i <= 5; i++) {
      const testRow = new Array(headers.length).fill("");
      
      // REQUIRED FIELDS
      testRow[2] = `ENTITY-${i.toString().padStart(3, "0")}`; // executionEntityId (REQUIRED)
      testRow[4] = `SEQ-${i.toString().padStart(6, "0")}`; // executionSeqNumber (REQUIRED)
      testRow[9] = validBrokerCapacities[(i - 1) % validBrokerCapacities.length]; // executionBrokerCapacity (REQUIRED)
      testRow[13] = i % 2 === 0 ? "Manual" : "Electronic"; // executionManualIndicator (REQUIRED)
      testRow[15] = "Y"; // isMarketExecution (REQUIRED)
      testRow[25] = symbols[(i - 1) % symbols.length]; // executionSymbol (REQUIRED)
      testRow[30] = `BROKER-${i}`; // executionContraBroker (REQUIRED)
      testRow[32] = validTransactionTypes[(i - 1) % validTransactionTypes.length]; // executionTransactionType (REQUIRED)
      testRow[33] = `INST-${i}`; // executionIdInstance (REQUIRED)
      testRow[37] = `ORD-${i.toString().padStart(3, "0")}`; // executonOrderId (REQUIRED)
      testRow[39] = "TradingSystem1"; // executionTradeExecutionSystem (REQUIRED)
      testRow[42] = "2024-01-15"; // executionTradeDate (REQUIRED)
      testRow[43] = "USD"; // executionCurrencyId (REQUIRED)
      testRow[49] = "POSTIPO"; // executionSecondaryOffering (REQUIRED)
      testRow[55] = validSessions[(i - 1) % validSessions.length]; // executonSessionActual (REQUIRED)

      // OPTIONAL FIELDS (add some realistic data)
      testRow[0] = `EXEC-${i.toString().padStart(3, "0")}`; // executionId
      testRow[6] = validSides[(i - 1) % validSides.length]; // executionSide
      testRow[28] = (150.0 + i * 10).toFixed(2); // executionLastPrice
      testRow[29] = (100 * i).toString(); // executionLastQuantity
      testRow[3] = i.toString(); // executionVersion
      testRow[38] = i.toString(); // executionOrderIdVersion

      worksheet.addRow(testRow);
    }

    // Instructions sheet
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.getColumn(1).width = 60;
    instructionsSheet.addRow(["Execution Import Template"]).font = { bold: true, size: 14 };
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Template Information:"]);
    instructionsSheet.addRow(["  • This template contains 72 execution fields"]);
    instructionsSheet.addRow(["  • 5 sample rows with valid test data are included"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Required Fields (15 minimum):"]);
    instructionsSheet.addRow(["  1. executionEntityId - Execution entity identifier (REQUIRED)"]);
    instructionsSheet.addRow(["  2. executionSeqNumber - Execution sequence number (REQUIRED)"]);
    instructionsSheet.addRow(["  3. executionBrokerCapacity - Agency, Principal, etc. (REQUIRED)"]);
    instructionsSheet.addRow(["  4. executionManualIndicator - Manual or Electronic (REQUIRED)"]);
    instructionsSheet.addRow(["  5. isMarketExecution - Y or N (REQUIRED)"]);
    instructionsSheet.addRow(["  6. executionSymbol - Trading symbol (REQUIRED)"]);
    instructionsSheet.addRow(["  7. executionContraBroker - Contra broker identifier (REQUIRED)"]);
    instructionsSheet.addRow(["  8. executionTransactionType - Street, Client, Internal, Indicative (REQUIRED)"]);
    instructionsSheet.addRow(["  9. executionIdInstance - Instance identifier (REQUIRED)"]);
    instructionsSheet.addRow(["  10. executonOrderId - Associated order ID (REQUIRED)"]);
    instructionsSheet.addRow(["  11. executionTradeExecutionSystem - Trade execution system (REQUIRED)"]);
    instructionsSheet.addRow(["  12. executionTradeDate - Trade date (REQUIRED)"]);
    instructionsSheet.addRow(["  13. executionCurrencyId - Currency (REQUIRED)"]);
    instructionsSheet.addRow(["  14. executionSecondaryOffering - PREIPO, POSTIPO, IPO (REQUIRED)"]);
    instructionsSheet.addRow(["  15. executonSessionActual - DAY, PRE-SESSION, POST-SESSION (REQUIRED)"]);
    instructionsSheet.addRow([]);
    instructionsSheet.addRow(["Notes:"]);
    instructionsSheet.addRow(["  • Sample rows are provided for reference"]);
    instructionsSheet.addRow(["  • Keep header row as-is. Delete sample rows before real imports"]);
    instructionsSheet.addRow(["  • Date format: YYYY-MM-DD"]);
    instructionsSheet.addRow(["  • Timestamp format: YYYY-MM-DDTHH:MM:SS"]);

    // Response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="execution_import_template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Execution template generation error:", error);
    next(error);
  }
};

module.exports = {
  downloadExecutionTemplate,
};
